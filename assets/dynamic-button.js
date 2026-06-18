/*! Copyright (c) Safe As Milk. All rights reserved. */
class DynamicButton extends HTMLElement {
    #mutationObserver;
    constructor() {
        super();
        this.#mutationObserver = null;
    }
    connectedCallback() {
        if (this.children.length > 1) {
            const payNowButtonContainer = this.children[this.children.length - 1];
            const config = {
                attributes: false,
                childList: true,
                subtree: true
            };
            const callback = (mutationList, observer) => {
                if (mutationList.some((mutation => mutation.type === "childList"))) {
                    const placeholderButton = this.querySelector(".dynamic-button__placeholder");
                    if (placeholderButton) {
                        placeholderButton.remove();
                    }
                    observer.disconnect();
                }
            };
            const buttonLoadObserver = new MutationObserver(callback);
            buttonLoadObserver.observe(payNowButtonContainer, config);
        }
    }
    disconnectedCallback() {
        if (this.#mutationObserver) {
            this.#mutationObserver.disconnect();
        }
    }
}

customElements.define("dynamic-button", DynamicButton);
//# sourceMappingURL=dynamic-button.js.map
