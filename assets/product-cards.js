/*! Copyright (c) Safe As Milk. All rights reserved. */
import { formatMoney, handle } from "utils";

class ProductCardMini extends HTMLElement {
    #boundOnQuickShopTriggerClick;
    constructor() {
        super();
        this.#boundOnQuickShopTriggerClick = this.#onQuickShopTriggerClick.bind(this);
    }
    connectedCallback() {
        this.image = this.querySelector("img.js-product-card-image");
        this.imageContainerRatio = this.getAttribute("image-container-ratio").trim();
        this.imageFit = this.hasAttribute("image-fit");
        this.quickShopTriggerType = this.getAttribute("quick-shop-trigger");
        this.quickShopTriggerHover = this.hasAttribute("quick-shop-trigger-hover");
        this.isRendered = this.hasAttribute("rendered");
        if (this.isRendered) {
            this.quickShop = this.querySelector("quick-shop");
            if ((this.hasAttribute("move-quick-shop") || this.closest(".modal")) && this.quickShop) {
                const movedModalElements = document.getElementById("moved-modal-elements");
                if (movedModalElements) movedModalElements.appendChild(this.quickShop);
            }
            if (this.closest("items-scroll") && this.quickShop) {
                this.closest("items-scroll").addEventListener("on:items-scroll:change-state", (({detail: {scrollable: scrollable}}) => {
                    if (scrollable) {
                        const movedModalElements = document.getElementById("moved-modal-elements");
                        if (movedModalElements) movedModalElements.appendChild(this.quickShop);
                    } else if (!this.querySelector("quick-shop")) {
                        this.appendChild(this.quickShop);
                    }
                }));
            }
            if (this.quickShop) {
                this.quickShopTrigger = this.querySelector("[data-trigger-quick-shop]");
                this.quickShopTrigger.addEventListener("click", this.#boundOnQuickShopTriggerClick);
            }
        }
    }
    disconnectedCallback() {
        if (this.quickShop) {
            this.quickShopTrigger.removeEventListener("click", this.#boundOnQuickShopTriggerClick);
            if (this.quickShop && !this.querySelector("quick-shop")) {
                this.appendChild(this.quickShop);
            }
        }
    }
    set product(productData) {
        this.productData = productData;
        if (!this.isRendered) {
            this.render();
        }
    }
    get product() {
        return this.productData;
    }
    set id(id) {
        this.setAttribute("id", id);
        if (this.quickShop) {
            const quickShopId = `${id}--quickshop`;
            this.quickShop.setAttribute("id", quickShopId);
        }
    }
    get id() {
        return this.getAttribute("id");
    }
    async #onQuickShopTriggerClick(event) {
        event.preventDefault();
        const modalParent = this.closest("modal-dialog");
        if (modalParent) {
            await modalParent.close();
        }
        this.quickShop.open(modalParent);
    }
    render() {
        this.setAttribute("product-id", this.product.id);
        this.querySelectorAll("a[product-card-link]").forEach((link => {
            link.setAttribute("href", this.product.url);
            const visuallyHiddenElement = link.querySelector(".visually-hidden");
            if (visuallyHiddenElement) {
                visuallyHiddenElement.innerHTML = this.product.title;
            }
        }));
        if (!this.product.available) {
            this.classList.add("product-card--sold-out");
        } else if (this.product.compare_at_price > this.product.price) {
            this.classList.add("product-card--sale");
        }
        if (this.imageContainerRatio === "natural") {
            const previewImage = this.querySelector("img.js-product-card-image");
            previewImage.closest(".o-ratio").style.paddingBottom = `100%`;
        }
        if (this.product.media && this.product.media.length > 0) {
            const mainImageSource = this.product.media[0].preview_image;
            this.updateImage(mainImageSource.src, mainImageSource.width, mainImageSource.height, mainImageSource.alt);
            const secondaryImagePlaceholder = this.querySelector("product-card-secondary-image-placeholder");
            if (secondaryImagePlaceholder && this.product.media[1]) {
                const secondaryImageSource = this.product.media[1].preview_image;
                const secondaryImage = this.renderImage(secondaryImageSource.src, secondaryImageSource.width, secondaryImageSource.height, secondaryImagePlaceholder.getAttribute("class"), secondaryImageSource.alt, this.image.getAttribute("sizes"));
                secondaryImage.setAttribute("product-card-secondary-image", "");
                this.image.parentElement.classList.add("product-card__media--hover-image");
                secondaryImagePlaceholder.replaceWith(secondaryImage);
            }
            if (this.getAttribute("image-hover") === "zoom") {
                this.image.parentElement.classList.add("product-card__media--hover-zoom");
            }
            if (this.imageContainerRatio === "natural") {
                this.image.closest(".o-ratio").style.paddingBottom = `${1 / mainImageSource.aspect_ratio * 100}%`;
            } else {
                this.image.closest(".o-ratio").style.paddingBottom = null;
            }
            this.updateSkeleton();
        }
        const vendor = this.querySelector("product-card-vendor");
        if (vendor) {
            vendor.textContent = this.product.vendor;
        }
        this.querySelector("product-card-title").textContent = this.product.title;
        const price = this.querySelector("product-card-price");
        if (price) {
            const variantPrice = `\n        <span class="u-hidden-visually">${window.theme.localize("REGULAR_PRICE")}</span>\n        <span class="price__number ${this.product.compare_at_price > this.product.price ? "price__number--sale" : ""}">\n          <span class="money">\n          ${this.product.price_varies ? window.theme.localize("FROM_PRICE") : ""}\n          ${formatMoney(this.product.price, window.theme.money_product_price_format)}\n          </span>\n        </span>\n        ${this.product.compare_at_price > this.product.price ? `\n              <span class="u-hidden-visually">${window.theme.localize("SALE_PRICE")}</span>\n              <span class="price__compare">\n                <span class="money">${formatMoney(this.product.compare_at_price, window.theme.money_format)}\n                </span>\n              </span>\n            ` : ""}\n      `;
            price.innerHTML = variantPrice;
        }
        const priceNotes = this.querySelector("product-card-price-notes");
        const currentVariant = this.product.variants.find((variant => variant.available));
        if (priceNotes && currentVariant && currentVariant.unit_price_measurement) {
            const priceNote = document.createElement("span");
            priceNote.classList.add("price__note", "price__note--unit");
            const unitPriceTemplate = document.getElementById("template-unit-price").content;
            priceNote.appendChild(unitPriceTemplate.cloneNode(true));
            priceNotes.appendChild(priceNote);
            const baseUnit = `${currentVariant.unit_price_measurement.reference_value !== 1 ? currentVariant.unit_price_measurement.reference_value : ""}${currentVariant.unit_price_measurement.reference_unit}`;
            priceNotes.querySelector("unit-price").innerHTML = window.formatMoney(currentVariant.unit_price, window.window.theme.money_format);
            priceNotes.querySelector("base-unit").innerHTML = baseUnit;
        }
        if (this.quickShopTriggerType === "button") {
            const productCardButton = this.querySelector("product-card-button");
            if (!this.product.available) {
                const soldOutButtonTemplate = document.getElementById(`${this.sectionId ? `${this.sectionId}--` : ""}template-sold-out-button`).content;
                const quickShopContainer = this.querySelector("product-card-quick-shop");
                if (quickShopContainer) quickShopContainer.remove();
                productCardButton.appendChild(soldOutButtonTemplate.cloneNode(true));
            } else if (this.product.variants && this.product.variants.length > 1) {
                const quickShopButtonTemplate = document.getElementById(`${this.sectionId ? `${this.sectionId}--` : ""}template-quick-shop-button`).content;
                const quickShopButton = quickShopButtonTemplate.cloneNode(true);
                const link = quickShopButton.querySelector("a");
                if (link) link.href = this.product.url;
                productCardButton.appendChild(quickShopButton);
            } else {
                const addToCartFormTemplate = document.getElementById(`${this.sectionId ? `${this.sectionId}--` : ""}template-add-to-cart-form`).content;
                const addToCartForm = addToCartFormTemplate.cloneNode(true);
                addToCartForm.querySelector('input[name="id"]').value = this.product.variants[0].id;
                const quickShopContainer = this.querySelector("product-card-quick-shop");
                if (quickShopContainer) quickShopContainer.remove();
                productCardButton.appendChild(addToCartForm);
            }
        }
        const quickShopContainer = this.querySelector("product-card-quick-shop");
        if (quickShopContainer && !(this.quickShopTriggerType === "button" && (!this.product.available || this.product.variants.length === 1))) {
            const quickShopTemplate = document.getElementById(`${this.sectionId ? `${this.sectionId}--` : ""}template-quick-shop`).content;
            this.quickShop = quickShopTemplate.cloneNode(true).querySelector("quick-shop");
            if (this.quickShop.hasAttribute("placeholder")) {
                this.quickShop.setAttribute("data-product-url", this.product.url);
            }
            this.quickShopTrigger = this.querySelector("[data-trigger-quick-shop]");
            this.quickShopTrigger.addEventListener("click", this.#boundOnQuickShopTriggerClick);
            if (this.closest(".modal") || this.closest("items-scroll")) {
                const movedModalElements = document.getElementById("moved-modal-elements");
                if (movedModalElements) movedModalElements.appendChild(this.quickShop);
            } else {
                quickShopContainer.replaceWith(this.quickShop);
            }
        }
        this.setAttribute("rendered", "");
        this.isRendered = true;
    }
    renderImage(url, width, height, classes = "", alt = "", sizes = "100vw", srcsetWidths = [ 180, 360, 540, 720, 900, 1080, 1296, 1512 ]) {
        if (!url || !width || !height) return null;
        const image = document.createElement("img");
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
        image.setAttribute("src", masterSrc);
        image.setAttribute("srcset", srcset);
        image.setAttribute("width", masterWidth);
        image.setAttribute("height", masterHeight);
        image.setAttribute("class", classes);
        image.setAttribute("alt", alt);
        image.setAttribute("sizes", sizes);
        return image;
    }
    updateImage(url, width, height, alt = "", srcsetWidths = [ 180, 360, 540, 720, 900, 1080, 1296, 1512 ]) {
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
    updateSkeleton() {
        if (!this.image) return;
        const skeleton = this.image.previousElementSibling && this.image.previousElementSibling.tagName.toLowerCase() === "image-skeleton" ? this.image.previousElementSibling : null;
        if (skeleton) {
            const svg = skeleton.querySelector("svg");
            const rect = svg.querySelector("rect");
            const width = this.image.getAttribute("width");
            const height = this.image.getAttribute("height");
            skeleton.setAttribute("aria-label", `Loading image for ${this.product.title}`);
            svg.setAttribute("width", width);
            svg.setAttribute("height", height);
            svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
            rect.setAttribute("width", width);
            rect.setAttribute("height", height);
        }
    }
}

customElements.define("product-card-mini", ProductCardMini);

class ProductCard extends ProductCardMini {
    #boundSetVariant;
    #currentVariantUrl;
    #swatchTriggers;
    constructor() {
        super();
        this.#boundSetVariant = this.setVariant.bind(this);
    }
    connectedCallback() {
        super.connectedCallback();
        this.#swatchTriggers = [];
        if (this.product && !this.isRendered) {
            this.#currentVariantUrl = this.product.url;
            this.render();
        }
        if (this.#swatchTriggers.length === 0) {
            this.#swatchTriggers = Array.from(this.querySelectorAll("product-card-variant-swatch[variant-id]"));
        }
        if (!this.product) {
            this.#setProductData();
        }
        this.#setUpSwatchesListeners();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.#removeSwatchesListeners();
    }
    set product(productData) {
        super.productData = productData;
        if (!this.isRendered) {
            this.#currentVariantUrl = this.product.url;
            this.#setUpSwatchesListeners();
        }
    }
    get product() {
        return this.productData;
    }
    async render() {
        super.render();
        const swatches = this.querySelector("product-card-variant-swatches");
        if (swatches) {
            const Swatches = await import("swatch-colors");
            const swatchOption = this.product.options.find((option => Swatches.triggers.includes(option.name.toLowerCase())));
            if (swatchOption) {
                const templateId = this.sectionId ? `${this.sectionId}--template-swatch` : "template-swatch";
                const swatchTemplate = document.getElementById(templateId).content;
                swatches.innerHTML = `\n          <div class="swatch-wrapper">\n            <div class="product-card__swatch">\n              <ul class="product-card__swatch__items o-list-inline">\n              </ul>\n              ${swatchOption.values.length > 5 ? `\n                    <div class="product-card__overflow">\n                      <a product-card-link href="${this.product.url}" class="product-card__overflow__item" title="${this.product.title}">\n                        <span class="">+${swatchOption.values.length - 5}</span>\n                      </a>\n                    </div>\n                  ` : ""}\n            </div>\n          </div>\n        `;
                const swatchList = swatches.querySelector("ul");
                swatchOption.values.slice(0, 5).forEach((value => {
                    const variant = this.product.variants.find((v => v[`option${swatchOption.position}`] === value));
                    if (variant) {
                        const variantId = variant.id;
                        const swatchFragment = swatchTemplate.cloneNode(true);
                        const variantNameHandle = handle(value);
                        const variantSwatch = swatchFragment.querySelector("variant-swatch");
                        variantSwatch.setAttribute("swatch-id", variantNameHandle);
                        variantSwatch.style.setProperty("--background-graphic", variantNameHandle.replaceAll("-", ""));
                        variantSwatch.setAttribute("aria-label", value.replaceAll('"', ""));
                        const variantTrigger = swatchFragment.querySelector("product-card-variant-swatch");
                        variantTrigger.setAttribute("variant-id", variantId);
                        this.#swatchTriggers.push(variantTrigger);
                        swatchList.appendChild(swatchFragment);
                    }
                }));
            }
        }
    }
    #setProductData() {
        const productData = this.querySelector("[id^=ProductJson]");
        if (productData) {
            this.product = JSON.parse(productData.textContent);
        }
    }
    setVariant(e) {
        if (!e.target.hasAttribute("variant-id")) return;
        const variantId = e.target.getAttribute("variant-id");
        const variant = this.product.variants.find((v => v.id.toString() === variantId));
        if (variant) {
            this.querySelectorAll("product-card-variant-swatch.is-active").forEach((swatch => swatch.classList.remove("is-active")));
            e.target.classList.add("is-active");
            this.#currentVariantUrl = `${this.product.url}${this.product.url.includes("?") ? "&" : "?"}variant=${variantId}`;
            const variantImage = variant.featured_media ? variant.featured_media.preview_image : this.product.media && this.product.media.length > 0 ? this.product.media[0].preview_image : null;
            this.querySelectorAll("a[product-card-link]").forEach((link => link.setAttribute("href", this.#currentVariantUrl)));
            if (variantImage) {
                this.updateImage(variantImage.src, variantImage.width, variantImage.height, variantImage.alt);
            }
            if (this.quickShop) {
                this.quickShop.variantId = variantId;
                if (this.quickShop.variantSelector) {
                    this.quickShop.variantSelector.setOptionByValueId(e.target.getAttribute("value-id"));
                }
                if (e.target.hasAttribute("product-url")) {
                    this.quickShop.productUrl = e.target.getAttribute("product-url");
                }
            }
        }
    }
    #setUpSwatchesListeners() {
        this.#swatchTriggers.forEach((trigger => {
            trigger.addEventListener("click", this.#boundSetVariant);
        }));
    }
    #removeSwatchesListeners() {
        this.#swatchTriggers.forEach((trigger => {
            trigger.removeEventListener("click", this.#boundSetVariant);
        }));
    }
}

customElements.define("product-card", ProductCard);
//# sourceMappingURL=product-cards.js.map
