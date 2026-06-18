/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce } from "utils";

class ProductSingle extends HTMLElement {
    #resizeObserver;
    #variant;
    constructor() {
        super();
        this.updateGallery = this.updateGallery.bind(this);
        this.setPdpHeight = this.setPdpHeight.bind(this);
    }
    connectedCallback() {
        this.mediaGallery = this.querySelector("media-gallery");
        this.productUrl = this.dataset.productUrl;
        this.sectionId = this.dataset.sectionId;
        this.#moveModalsFromStickyScrollContainer();
        this.#resizeObserver = new ResizeObserver(debounce(this.setPdpHeight, 5));
        this.#resizeObserver.observe(this.querySelector(".product-single__box"));
    }
    disconnectedCallback() {
        this.#resizeObserver.disconnect();
    }
    setPdpHeight() {
        this.style.setProperty("--pdp-height", `${this.querySelector(".product-single__box").offsetHeight}px`);
    }
    updateGallery(mediaGallery) {
        const gallery = this.querySelector("media-gallery");
        if (!mediaGallery || !this.sectionId || !this.productUrl || !gallery) return;
        const newGallery = mediaGallery;
        gallery.replaceWith(newGallery);
        this.mediaGallery = newGallery;
        if (window.ShopifyXR) window.ShopifyXR.setupXRElements();
    }
    updateMedia() {
        if (!this.mediaGallery || !this.#variant.featured_media) return;
        const mediaId = this.#variant.featured_media.id;
        this.mediaGallery.goToSlide(mediaId);
    }
    set variant(variant) {
        this.#variant = variant;
        this.updateMedia();
    }
    get variant() {
        return this.#variant;
    }
    #moveModalsFromStickyScrollContainer() {
        const modals = this.querySelectorAll("sticky-scroll modal-dialog, sticky-scroll popup-dialog");
        modals.forEach((modal => {
            this.append(modal);
        }));
    }
}

customElements.define("product-single", ProductSingle);
//# sourceMappingURL=product-single.js.map
