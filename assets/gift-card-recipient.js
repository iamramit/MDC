/*! Copyright (c) Safe As Milk. All rights reserved. */
class GiftCardRecipient extends HTMLElement {
    constructor() {
        super();
        this.checkbox = this.querySelector(".gift-card-recipient__checkbox-input");
        this.fields = this.querySelectorAll(".gift-card-recipient__field-input");
        this.fieldset = this.querySelector(".gift-card-recipient__fieldset");
    }
    connectedCallback() {
        this.fields.forEach((field => field.setAttribute("disabled", "")));
        this.fieldset.style.maxHeight = "0px";
        this.checkbox?.addEventListener("change", this.activateFieldset.bind(this));
    }
    activateFieldset() {
        if (this.checkbox.checked) {
            this.fields.forEach((field => field.removeAttribute("disabled", "")));
            this.fieldset.style.maxHeight = `${this.fieldset.scrollHeight}px`;
        } else {
            this.fields.forEach((field => field.setAttribute("disabled", "")));
            this.fieldset.style.maxHeight = "0px";
        }
    }
}

customElements.define("gift-card-recipient", GiftCardRecipient);
//# sourceMappingURL=gift-card-recipient.js.map
