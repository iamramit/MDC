/*! Copyright (c) Safe As Milk. All rights reserved. */
class ProductInteractiveOptions extends HTMLElement {
    #boundOnClick;
    #boundOnChange;
    #listeners;
    constructor() {
        super();
        this.#boundOnClick = this.#onClick.bind(this);
        this.#boundOnChange = this.#onChange.bind(this);
    }
    connectedCallback() {
        this.variantsControlElement = this.parentElement;
        this.inputs = this.getOptionsElementsObject();
        this.options = Object.keys(this.inputs).reduce(((options, key) => {
            options[this.inputs[key].position] = key;
            return options;
        }), []);
        this.#listeners = [];
        if (this.dataset.variantId) {
            const id = Number(this.dataset.variantId);
            this.selectVariantById(id);
        }
        setTimeout((() => {
            this.variants = this.variantsControlElement.getVariantData();
            this.currentVariant = this.getCurrentVariant();
            this.setOptionInputsAvailability();
            this.setUpInputListeners();
        }));
    }
    disconnectedCallback() {
        this.#listeners.forEach((listener => {
            listener.element.removeEventListener(listener.event, listener.handler);
        }));
        this.variantsControlElement.removeEventListener("change", this.variantsControlElement.onVariantChange);
    }
    getOptionsElementsObject() {
        const options = Array.from(this.variantsControlElement.querySelectorAll("input, select > option"));
        const obj = options.reduce(((finalObject, el) => {
            if (el.nodeName === "INPUT") {
                const optionName = el.name.trim();
                if (!finalObject.hasOwnProperty(optionName)) finalObject[optionName] = {
                    position: Object.keys(finalObject).length,
                    type: "inputs",
                    elements: {}
                };
                finalObject[optionName].elements[el.value] = {
                    element: el
                };
            } else if (el.nodeName === "OPTION") {
                const selectElement = el.parentElement;
                const optionName = selectElement.name.replace("options[", "").replace("]", "").trim();
                if (!finalObject.hasOwnProperty(optionName)) {
                    finalObject[optionName] = {
                        position: Object.keys(finalObject).length,
                        type: "select",
                        elements: {},
                        selectElement: selectElement
                    };
                }
                finalObject[optionName].elements[el.value] = {
                    element: el,
                    text: el.innerHTML.replace(`- ${window.theme.localize("SOLD_OUT")}`, "").trim()
                };
            }
            return finalObject;
        }), {});
        return obj;
    }
    getCurrentOptions() {
        return Array.from(this.variantsControlElement.querySelectorAll("input:checked, select")).map((input => input.value));
    }
    getCurrentVariant() {
        const options = this.getCurrentOptions();
        const result = this.variants.filter((variant => options.every(((option, index) => variant.options[index] === option))));
        return result[0] || null;
    }
    getVariantById(id) {
        const [result] = this.variants.filter((variant => variant.id === id));
        return result || null;
    }
    optionsAvailableInOtherVariants() {
        const currentVariant = this.getCurrentVariant();
        const availableVariants = this.variants.filter((variant => variant.available && variant.id !== currentVariant.id && variant.options[0] === currentVariant.options[0]));
        return currentVariant.options.reduce(((options, option, i) => {
            if (availableVariants.some((variant => variant.options.map(((o, j) => `${o}_${j}`)).includes(`${option}_${i}`)))) options.push(`${option}_${i}`);
            return options;
        }), []);
    }
    setOptionInputsAvailability() {
        this.currentVariant = this.getCurrentVariant();
        Object.keys(this.inputs).forEach((option => {
            Object.keys(this.inputs[option].elements).forEach((value => {
                const {element: element, text: text} = this.inputs[option].elements[value];
                if (element.dataset.productUrl !== this.variantsControlElement.dataset.productUrl) return;
                element.disabled = true;
                if (this.inputs[option].type === "inputs") element.nextElementSibling.classList.add("is-disabled");
                if (this.inputs[option].type === "select") element.innerHTML = `${text} - Unavailable`;
            }));
        }));
        const availableOptions = new Set;
        this.currentVariant.options.forEach(((option, i) => {
            const optionInput = this.inputs[this.options[i]]?.elements[option];
            if (!optionInput) return;
            const inputType = this.inputs[this.options[i]].type;
            optionInput.element.disabled = false;
            if (this.currentVariant.available) {
                availableOptions.add(`${this.options[i]}_${option}`);
                if (inputType === "inputs") optionInput.element.nextElementSibling.classList.remove("is-disabled");
                if (inputType === "select") optionInput.element.innerHTML = optionInput.text;
            }
            if (inputType === "select" && !availableOptions.has(`${this.options[i]}_${option}`)) optionInput.element.innerHTML = `${optionInput.text} - ${window.theme.localize("SOLD_OUT")}`;
        }));
        this.variants.forEach((variant => {
            if (variant.id !== this.currentVariant.id && variant.options[0] === this.currentVariant.options[0]) {
                variant.options.every(((option, i) => {
                    if (i > 0 && variant.options[i - 1] === this.currentVariant.options[i - 1]) {
                        const optionInput = this.inputs[this.options[i]].elements[option];
                        const inputType = this.inputs[this.options[i]].type;
                        optionInput.element.disabled = false;
                        if (!this.currentVariant.available && this.currentVariant.options.includes(option)) return true;
                        if (variant.available) {
                            availableOptions.add(`${this.options[i]}_${option}`);
                            if (inputType === "inputs") optionInput.element.nextElementSibling.classList.remove("is-disabled");
                            if (inputType === "select") optionInput.element.innerHTML = optionInput.text;
                        }
                        if (inputType === "select" && !availableOptions.has(`${this.options[i]}_${option}`)) optionInput.element.innerHTML = `${optionInput.text} - ${window.theme.localize("SOLD_OUT")}`;
                    }
                    return true;
                }));
            } else if (variant.id !== this.currentVariant.id) {
                const optionInput = this.inputs[this.options[0]].elements[variant.options[0]];
                const inputType = this.inputs[this.options[0]].type;
                optionInput.element.disabled = false;
                if (variant.available) {
                    availableOptions.add(`${this.options[0]}_${variant.options[0]}`);
                    if (inputType === "inputs") optionInput.element.nextElementSibling.classList.remove("is-disabled");
                    if (inputType === "select") optionInput.element.innerHTML = optionInput.text;
                }
                if (inputType === "select" && !availableOptions.has(`${this.options[0]}_${variant.options[0]}`)) optionInput.element.innerHTML = `${optionInput.text} - ${window.theme.localize("SOLD_OUT")}`;
            }
        }));
    }
    getFirstExistingVariant(option, optionGroup) {
        const optionPosition = this.options.indexOf(optionGroup);
        const existingVariantsWithOption = this.variants.filter((variant => variant.options[optionPosition] === option && (optionPosition === 0 || variant.options.slice(0, optionPosition).every(((o, index) => o === this.currentVariant.options[index])))));
        for (let i = 0, l = existingVariantsWithOption.length; i < l; i += 1) {
            if (existingVariantsWithOption[i].available) return existingVariantsWithOption[i];
        }
        return existingVariantsWithOption.length > 0 ? existingVariantsWithOption[0] : null;
    }
    getExistingVariantFromSelectedOption(option, optionGroup) {
        const options = this.getCurrentOptions();
        const optionPosition = this.options.indexOf(optionGroup);
        options[optionPosition] = option;
        const variant = this.variants.find((v => v.options.every(((val, idx) => val === options[idx]))));
        return variant || null;
    }
    selectVariant(variant) {
        const currentFocusedElement = document.activeElement;
        const optionsByGroup = variant.options.reduce(((grouped, option, index) => {
            grouped[this.options[index]] = option;
            return grouped;
        }), {});
        Object.keys(this.inputs).forEach((option => {
            Object.keys(this.inputs[option].elements).forEach((value => {
                const {element: element, text: text} = this.inputs[option].elements[value];
                element.disabled = false;
                if (this.inputs[option].type === "inputs") {
                    element.nextElementSibling.classList.remove("is-disabled");
                    element.checked = false;
                }
                if (this.inputs[option].type === "select") element.innerHTML = text;
                if (optionsByGroup[option] === value) {
                    if (this.inputs[option].type === "inputs") element.checked = true;
                    if (this.inputs[option].type === "select") this.inputs[option].selectElement.value = value;
                }
            }));
        }));
        this.setOptionInputsAvailability();
        if (currentFocusedElement) {
            currentFocusedElement.focus();
        }
    }
    selectVariantById(id) {
        const variant = this.getVariantById(id);
        if (variant) {
            this.selectVariant(variant);
            this.variantsControlElement.onVariantChange();
        }
    }
    selectCurrentOrFirstExistingVariant(option, optionGroup) {
        const selectedVariant = this.getExistingVariantFromSelectedOption(option.trim(), optionGroup.trim());
        if (selectedVariant) {
            this.selectVariant(selectedVariant);
        } else {
            const firstExistingVariant = this.getFirstExistingVariant(option.trim(), optionGroup.trim());
            if (firstExistingVariant) {
                this.selectVariant(firstExistingVariant);
            }
        }
    }
    setUpInputListeners() {
        this.variantsControlElement.removeEventListener("change", this.variantsControlElement.onVariantChange);
        Object.keys(this.inputs).forEach((optionGroup => {
            if (this.inputs[optionGroup].type === "inputs") {
                Object.keys(this.inputs[optionGroup].elements).forEach((option => {
                    const input = this.inputs[optionGroup].elements[option].element;
                    input.addEventListener("click", this.#boundOnClick);
                    this.#listeners.push({
                        element: input,
                        event: "click",
                        handler: this.#boundOnClick
                    });
                }));
            } else if (this.inputs[optionGroup].type === "select") {
                this.inputs[optionGroup].selectElement.addEventListener("change", this.#boundOnChange);
                this.#listeners.push({
                    element: this.inputs[optionGroup].selectElement,
                    event: "change",
                    handler: this.#boundOnChange
                });
            }
        }));
        this.variantsControlElement.addEventListener("change", this.variantsControlElement.onVariantChange);
    }
    #onClick(e) {
        console.log(e);
        this.selectCurrentOrFirstExistingVariant(e.target.value.trim(), e.target.name.trim());
    }
    #onChange(e) {
        this.selectCurrentOrFirstExistingVariant(e.target.value.trim(), e.target.name.trim().replace("options[", "").replace("]", ""));
    }
}

customElements.define("product-interactive-options", ProductInteractiveOptions);
//# sourceMappingURL=product-interactive-options.js.map
