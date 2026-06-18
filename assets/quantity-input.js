/*! Copyright (c) Safe As Milk. All rights reserved. */
class QuantityInput extends HTMLElement {
    #boundAdd;
    #boundSelect;
    #boundSubtract;
    #boundValidate;
    constructor() {
        super();
        this.#boundAdd = this.add.bind(this);
        this.#boundSubtract = this.subtract.bind(this);
        this.#boundValidate = this.validate.bind(this);
        this.#boundSelect = QuantityInput.#selectInputText.bind(this);
    }
    connectedCallback() {
        this.input = this.querySelector('input[type="number"]');
        this.minus = this.querySelector("button[minus]");
        this.plus = this.querySelector("button[plus]");
        this.min = Number(this.input.getAttribute("min") || 0);
        this.max = Number(this.input.getAttribute("max") || Infinity);
        this.step = Number(this.input.getAttribute("step") || 1);
        setTimeout((() => {
            this.minus.addEventListener("click", this.#boundSubtract);
            this.plus.addEventListener("click", this.#boundAdd);
            this.input.addEventListener("change", this.#boundValidate);
            this.input.addEventListener("select", this.#boundSelect);
            this.input.addEventListener("click", this.#boundSelect);
        }));
    }
    disconnectedCallback() {
        this.minus.removeEventListener("click", this.#boundSubtract);
        this.plus.removeEventListener("click", this.#boundAdd);
        this.input.removeEventListener("change", this.#boundValidate);
        this.input.removeEventListener("select", this.#boundSelect);
        this.input.removeEventListener("click", this.#boundSelect);
    }
    subtract() {
        const value = Number(this.input.value);
        if (value > this.min) {
            this.input.value = value - Math.min(this.step, value - this.min);
            this.dispatchEvent(new CustomEvent("update", {
                detail: {
                    value: this.input.value
                }
            }));
        }
    }
    add() {
        const value = Number(this.input.value);
        if (value < this.max) {
            this.input.value = value + Math.min(this.step, this.max - value);
            this.dispatchEvent(new CustomEvent("update", {
                detail: {
                    value: this.input.value
                }
            }));
        }
    }
    validate(e) {
        const {value: value} = e.target;
        const testRegEx = /^[0-9]+$/;
        if (!testRegEx.test(value) || Number(value) < this.min) {
            this.input.value = this.min;
        }
        if (Number(value) > this.max) {
            this.input.value = this.max;
        }
        this.dispatchEvent(new CustomEvent("update", {
            detail: {
                value: this.input.value
            }
        }));
    }
    set value(value) {
        this.input.value = Number(value);
    }
    get value() {
        return Number(this.input.value);
    }
    static #selectInputText(e) {
        e.target.select();
    }
}

customElements.define("quantity-input", QuantityInput);
//# sourceMappingURL=quantity-input.js.map
