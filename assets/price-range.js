/*! Copyright (c) Safe As Milk. All rights reserved. */
class PriceRange extends HTMLElement {
    #boundOnNumberInput;
    #boundOnRangeInput;
    constructor() {
        super();
        this.#boundOnNumberInput = this.#onNumberInput.bind(this);
        this.#boundOnRangeInput = this.#onRangeInput.bind(this);
    }
    connectedCallback() {
        this.rangeS = this.querySelectorAll(".price-range__input");
        this.numberS = this.querySelectorAll(".price-range__number");
        this.rangeS.forEach((el => {
            el.addEventListener("input", this.#boundOnRangeInput);
        }));
        this.numberS.forEach((el => {
            el.addEventListener("input", this.#boundOnNumberInput);
        }));
    }
    disconnectedCallback() {
        this.rangeS.forEach((el => {
            el.removeEventListener("input", this.#boundOnRangeInput);
        }));
        this.numberS.forEach((el => {
            el.removeEventListener("input", this.#boundOnNumberInput);
        }));
    }
    #onRangeInput() {
        let slide1 = parseFloat(this.rangeS[0].value);
        let slide2 = parseFloat(this.rangeS[1].value);
        if (slide1 > slide2) {
            [slide1, slide2] = [ slide2, slide1 ];
        }
        this.numberS[0].value = slide1;
        this.numberS[1].value = slide2;
    }
    #onNumberInput() {
        const number1 = parseFloat(this.numberS[0].value);
        const number2 = parseFloat(this.numberS[1].value);
        if (number1 > number2) {
            const tmp = number1;
            this.numberS[0].value = number2;
            this.numberS[1].value = tmp;
        }
        this.rangeS[0].value = number1;
        this.rangeS[1].value = number2;
    }
}

customElements.define("price-range", PriceRange);
//# sourceMappingURL=price-range.js.map
