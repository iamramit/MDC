/*! Copyright (c) Safe As Milk. All rights reserved. */
import ModalDialog from "modal-dialog";

import { StateSwitch } from "utils";

class QuickShop extends ModalDialog {
    #boundFetchQuickShopOnProximity;
    #boundMatchMediaChange;
    #boundOnCloseModal;
    #boundOnOpenModal;
    #boundOnVariantChange;
    #fetchingQuickShop=false;
    #loadObserver;
    #loadOn;
    #product;
    #productUrl;
    #stateSwitch=null;
    #variantId;
    constructor() {
        super();
        this.#variantId = null;
        this.#boundMatchMediaChange = this.#matchMediaChange.bind(this);
        this.#boundOnVariantChange = this.#onVariantChange.bind(this);
        this.#boundOnCloseModal = this.#onCloseModal.bind(this);
        this.#boundOnOpenModal = this.#onOpenModal.bind(this);
        this.#boundFetchQuickShopOnProximity = this.#fetchQuickShopOnProximity.bind(this);
    }
    connectedCallback() {
        super.connectedCallback();
        this.#productUrl = this.getAttribute("data-product-url");
        this.image = this.querySelector("img");
        this.imageContainerRatio = this.getAttribute("image-container-ratio").trim();
        this.imageFit = this.hasAttribute("image-fit");
        this.isPlaceholder = this.hasAttribute("placeholder");
        this.#loadOn = this.getAttribute("load-on") || "click";
        this.#loadObserver = null;
        if (!this.isPlaceholder) {
            this.#setProductData();
            this.variantSelector = this.querySelector("variant-selects, variant-radios, variant-mixed-inputs");
            if (this.variantSelector) {
                this.variantSelector.addEventListener("on:variant:change", this.#boundOnVariantChange);
            }
        } else {
            this.#setUpFetchListeners();
        }
        this.on("on:modal:opening", this.#boundOnOpenModal).on("on:modal:closed", this.#boundOnCloseModal);
        const isInsideHoverModal = !!this.closest(".no-touchevents") && !!this.closest(".product-card--trigger-icon.product-card--hover");
        if (isInsideHoverModal) {
            this.#stateSwitch = new StateSwitch({
                min: "tab"
            });
            this.#stateSwitch.on(this.#boundMatchMediaChange);
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (!this.isPlaceholder && this.variantSelector) {
            this.variantSelector.removeEventListener("on:variant:change", this.#boundOnVariantChange);
        } else {
            this.#removeFetchListeners();
        }
        this.off("on:modal:opening", this.#boundOnOpenModal).off("on:modal:closed", this.#boundOnCloseModal);
        if (this.#stateSwitch) {
            this.#stateSwitch.off(this.#boundMatchMediaChange);
        }
    }
    set productUrl(url) {
        this.#productUrl = url;
    }
    get productUrl() {
        return this.#productUrl;
    }
    set variantId(id) {
        this.#variantId = id;
    }
    get variantId() {
        return this.#variantId;
    }
    async close() {
        return new Promise((async resolve => {
            if (this.closest(".is-inside-modal")) {
                await super.close();
                resolve("Closed");
            } else {
                resolve("Closed");
            }
        }));
    }
    #onOpenModal() {
        setTimeout((() => {
            this.classList.add("is-inside-modal");
        }));
    }
    #onCloseModal() {
        this.classList.remove("is-inside-modal");
        const productForm = this.querySelector("product-form");
        if (productForm) {
            productForm.removeError();
        }
    }
    #onVariantChange(event) {
        const viewDetailsLink = this.querySelector(".js-view-details");
        const productLink = this.querySelector(".js-product-link");
        if (event.detail.variant) {
            if (this.dataset.productUrl) {
                this.#variantId = event.detail.variant.id;
                const newURL = this.dataset.productUrl.includes("?") ? this.dataset.productUrl.concat(`&variant=${this.#variantId}`) : this.dataset.productUrl.concat(`?variant=${this.#variantId}`);
                if (viewDetailsLink) viewDetailsLink.setAttribute("href", newURL);
                if (productLink) productLink.setAttribute("href", newURL);
            }
            let image = event.detail.variant.featured_image;
            if (!image) {
                image = this.#product.media && this.#product.media.length > 0 ? this.#product.media[0].preview_image : null;
            }
            if (image) {
                this.#updateImage(image.src, image.width, image.height, this.image.getAttribute("alt"));
            }
        }
    }
    #setProductData() {
        const productData = this.querySelector("[id^=ProductJson]");
        if (productData) this.#product = JSON.parse(productData.textContent);
    }
    #setUpFetchListeners() {
        if (!this.isPlaceholder) return;
        if (this.#loadOn === "proximity") {
            this.#loadObserver = new IntersectionObserver(this.#boundFetchQuickShopOnProximity, {
                rootMargin: "200px"
            });
            this.#loadObserver.observe(this);
        } else {
            this.on("on:modal:opening", (() => {
                this.#fetchQuickShop();
            }), {
                once: true
            });
        }
    }
    #removeFetchListeners() {
        if (this.#loadObserver) {
            this.#loadObserver.disconnect();
            this.#loadObserver = null;
        }
    }
    async #fetchQuickShopOnProximity(entries, observer) {
        entries.forEach((async entry => {
            if (entry.isIntersecting) {
                observer.unobserve(this);
                await this.#fetchQuickShop();
            }
        }));
    }
    async #fetchQuickShop() {
        if (this.#fetchingQuickShop) return;
        if (!this.#productUrl) return;
        try {
            this.dispatchEvent(new CustomEvent("on:quick-shop:loading"));
            this.#fetchingQuickShop = true;
            const htmlRaw = await fetch(`${this.#productUrl}${this.#productUrl.includes("?") ? "&" : "?"}view=quick-shop${this.#variantId ? `&variant=${this.#variantId}` : ""}`);
            let html = await htmlRaw.text();
            const idRegexp = /<quick-shop[\s]*id="([^"]*)"/m;
            const [, originalQuickShopId] = html.match(idRegexp);
            if (originalQuickShopId) {
                html = html.replaceAll(originalQuickShopId, this.id);
            }
            const parser = new DOMParser;
            const actualQuickShop = parser.parseFromString(html, "text/html").querySelector("quick-shop");
            this.updateContent(actualQuickShop);
            this.dispatchEvent(new CustomEvent("on:quick-shop:loaded"));
        } catch (e) {
            this.dispatchEvent(new CustomEvent("on:quick-shop:failed"));
            throw new Error(`Could not fetch quick shop: "${e}"`);
        } finally {
            this.#fetchingQuickShop = false;
        }
    }
    updateContent(newContent) {
        this.classList.add("is-loading-content");
        const productForm = newContent.querySelector("product-form");
        if (productForm && !this.hasAttribute("notify-on-add")) {
            productForm.removeAttribute("notify-on-add");
        }
        if (productForm && !this.hasAttribute("redirect-on-add")) {
            productForm.removeAttribute("redirect-on-add");
        }
        this.querySelector(".quick-shop__wrapper").innerHTML = newContent.querySelector(".quick-shop__wrapper").innerHTML;
        this.classList.remove("is-loading-content");
        const image = this.querySelector(".js-img-modal");
        if (image) image.setAttribute("sizes", this.getAttribute("image-sizes"));
        this.removeAttribute("placeholder");
        this.isPlaceholder = false;
        this.#setProductData();
        this.image = this.querySelector("img");
        this.variantSelector = this.querySelector("variant-selects, variant-radios, variant-mixed-inputs");
        if (this.variantSelector) {
            this.variantSelector.addEventListener("on:variant:change", this.#boundOnVariantChange);
        }
        if (window.Shopify.PaymentButton) window.Shopify.PaymentButton.init();
        this.#removeFetchListeners();
    }
    #updateImage(url, width, height, alt = "", srcsetWidths = [ 180, 360, 540, 720, 900, 1080, 1296, 1512 ]) {
        if (!this.image || !url || !width || !height) return;
        const imageContainerRatio = this.imageContainerRatio !== "natural" ? this.imageContainerRatio.split(":").reduce(((ratio, value) => ratio !== 0 ? value / ratio : value), 0) : null;
        const aspectRatio = width / height;
        const uncroppedImage = this.imageContainerRatio === "natural" || imageContainerRatio && this.imageFit;
        let masterWidth = width;
        let masterHeight = height;
        if (!uncroppedImage) {
            masterHeight = Math.round(masterWidth * imageContainerRatio);
            if (masterHeight > height) {
                masterHeight = height;
                masterWidth = Math.round(masterHeight / imageContainerRatio);
            }
        }
        const srcset = srcsetWidths.reduce(((srcSet, srcWidth) => {
            const srcHeight = Math.round(uncroppedImage ? srcWidth / aspectRatio : srcWidth * imageContainerRatio);
            if (srcWidth > masterWidth || srcHeight > masterHeight) return srcSet;
            return `${srcSet}${url}${url.includes("?") ? "&" : "?"}width=${srcWidth}${!uncroppedImage ? `&height=${srcHeight}&crop=center` : ""} ${srcWidth}w ${srcHeight}h, `;
        }), "");
        const masterSrc = !uncroppedImage ? `${url}${url.includes("?") ? "&" : "?"}width=${masterWidth}&height=${masterHeight}&crop=center` : url;
        this.image.setAttribute("src", masterSrc);
        this.image.setAttribute("srcset", srcset);
        this.image.setAttribute("width", masterWidth);
        this.image.setAttribute("height", masterHeight);
        this.image.setAttribute("alt", alt);
    }
    #matchMediaChange({matches: matches}) {
        if (matches) this.close();
    }
}

customElements.define("quick-shop", QuickShop);
//# sourceMappingURL=quick-shop.js.map
