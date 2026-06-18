/*! Copyright (c) Safe As Milk. All rights reserved. */
class ImageSkeleton extends HTMLElement {
    #loadStartTime;
    #minimumRevealDelay;
    #revealInterval;
    connectedCallback() {
        if (this.hasAttribute("loaded")) return;
        this.#minimumRevealDelay = Number(this.getAttribute("minimum-reveal-delay") || 0);
        this.#revealInterval = null;
        this.#loadStartTime = Date.now();
        this.init();
    }
    init() {
        const image = this.nextElementSibling && this.nextElementSibling.tagName === "IMG" ? this.nextElementSibling : null;
        if (!image) return;
        const onLoad = () => {
            this.#revealInterval = setInterval((() => {
                if (Date.now() - this.#loadStartTime >= this.#minimumRevealDelay) {
                    clearInterval(this.#revealInterval);
                    setTimeout((() => {
                        this.markAsLoaded();
                    }), 250);
                }
            }), 50);
        };
        if (image.hasAttribute("src") && image.complete) {
            if (this.#minimumRevealDelay) {
                onLoad();
            } else {
                this.markAsLoaded();
            }
        } else {
            image.addEventListener("load", onLoad.bind(this));
        }
    }
    markAsLoaded() {
        this.setAttribute("loaded", "");
        this.setAttribute("aria-hidden", "true");
    }
}

customElements.define("image-skeleton", ImageSkeleton);
//# sourceMappingURL=image-skeleton.js.map
