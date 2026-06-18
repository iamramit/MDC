/*! Copyright (c) Safe As Milk. All rights reserved. */
class LocalizeForm extends HTMLElement {
    #boundHandleClick;
    #localizeInput;
    #form;
    constructor() {
        super();
        this.#boundHandleClick = this.#handleClick.bind(this);
    }
    connectedCallback() {
        this.#form = this.closest("form");
        this.#localizeInput = this.querySelector("input[data-localize-input]");
        if (!this.#form || !this.#localizeInput) return;
        this.querySelectorAll(".js-localize-item").forEach((item => {
            item.addEventListener("click", this.#boundHandleClick);
        }));
    }
    disconnectedCallback() {
        this.querySelectorAll(".js-localize-item").forEach((item => {
            item.removeEventListener("click", this.#boundHandleClick);
        }));
    }
    #handleClick(e) {
        e.preventDefault();
        const {value: value} = e.target.dataset;
        if (value) {
            this.#localizeInput.value = value;
            this.#form.requestSubmit();
        }
    }
}

customElements.define("localize-form", LocalizeForm);
//# sourceMappingURL=localize-form.js.map
