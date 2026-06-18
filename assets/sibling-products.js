/*! Copyright (c) Safe As Milk. All rights reserved. */
class SiblingProducts extends HTMLElement {
    constructor() {
        super();
        this.currentSelection = "";
        this.resetTimeout = null;
    }
    connectedCallback() {
        this.labelOptionElement = this.querySelector(".js-option-title");
        this.colonElement = this.querySelector(".js-option-colon");
        if (!this.labelOptionElement) return;
        const active = this.querySelector(".product-form__swatch__item--active");
        if (active) {
            const activeLabel = active.getAttribute("data-label-name") || "";
            this.currentSelection = activeLabel;
            this.updateLabelAndColon(activeLabel);
        }
        this.bindHoverEvents();
    }
    updateLabelAndColon(label) {
        if (this.labelOptionElement) {
            this.labelOptionElement.textContent = label;
        }
        if (this.colonElement) {
            if (label && label.trim() !== "") {
                this.colonElement.style.display = "";
            } else {
                this.colonElement.style.display = "none";
            }
        }
    }
    bindHoverEvents() {
        const swatches = this.querySelectorAll(".product-form__swatch__item");
        swatches.forEach((swatch => {
            swatch.addEventListener("mouseenter", (() => {
                clearTimeout(this.resetTimeout);
                const hoverLabel = swatch.getAttribute("data-label-name") || "";
                this.updateLabelAndColon(hoverLabel);
            }));
            swatch.addEventListener("mouseleave", (() => {
                this.resetTimeout = setTimeout((() => {
                    this.updateLabelAndColon(this.currentSelection);
                }), 200);
            }));
        }));
    }
}

customElements.define("sibling-products", SiblingProducts);
//# sourceMappingURL=sibling-products.js.map
