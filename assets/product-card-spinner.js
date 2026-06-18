/*! Copyright (c) Safe As Milk. All rights reserved. */
class ProductCardSpinner extends HTMLElement {
    #boundHandleImageLoad;
    #observer;
    constructor() {
        super();
        this.loadingClass = "loading";
        this.#observer = null;
        this.#boundHandleImageLoad = this.#handleImageLoad.bind(this);
    }
    connectedCallback() {
        this.#init();
    }
    disconnectedCallback() {
        if (this.#observer) this.#observer.disconnect();
    }
    #init() {
        const image = this.nextElementSibling;
        if (!image || image.tagName !== "IMG") return;
        if (!this.#observer) this.#observer = new MutationObserver(this.#boundHandleImageLoad);
        this.#observer.observe(image, {
            attributeFilter: [ "src" ],
            attributeOldValue: true,
            subtree: false
        });
    }
    #handleImageLoad(mutationList) {
        mutationList.forEach((mutation => {
            if (mutation.type === "attributes") {
                if (mutation.attributeName === "src") {
                    const oldUrlStr = mutation.oldValue.split("//cdn.shopify.com/").pop();
                    const newUrlStr = mutation.target.src.split("//cdn.shopify.com/").pop();
                    if (oldUrlStr !== newUrlStr) {
                        const currImage = mutation.target;
                        if (!currImage.classList.contains(this.loadingClass)) {
                            currImage.classList.add(this.loadingClass);
                            this.classList.add(this.loadingClass);
                        }
                        currImage.onload = () => {
                            currImage.classList.remove(this.loadingClass);
                            this.classList.remove(this.loadingClass);
                        };
                    }
                }
            }
        }));
    }
}

customElements.define("product-card-spinner", ProductCardSpinner);
//# sourceMappingURL=product-card-spinner.js.map
