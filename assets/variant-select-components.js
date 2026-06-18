/*! Copyright (c) Safe As Milk. All rights reserved. */
class VariantSelects extends HTMLElement {
    #addToCartText;
    #boundCacheAdjacentVariants;
    #variantDataCache;
    #lastFetchRetryKey=null;
    #fetchRetryCount=0;
    #FETCH_RETRY_COUNT=3;
    #FETCH_RETRY_DELAY=1e3;
    constructor() {
        super();
        this.#boundCacheAdjacentVariants = this.#cacheAdjacentVariants.bind(this);
    }
    connectedCallback() {
        this.updateOptions();
        this.updateGalleryOnVariantChange = this.hasAttribute("data-update-gallery-on-variant-change");
        this.#variantDataCache = new Map;
        const currentSection = this.closest(".js-section__product-single");
        if (currentSection) {
            this.#variantDataCache.set(this.optionValueIds.join(","), this.#prepareTemplate(currentSection.outerHTML));
        }
        this.intersectionObserver = new IntersectionObserver((entries => {
            entries.forEach((entry => {
                if (entry.isIntersecting) {
                    this.#boundCacheAdjacentVariants();
                    this.intersectionObserver.disconnect();
                }
            }));
        }));
        this.intersectionObserver.observe(this);
        this.uniqueId = this.dataset.card || this.dataset.section;
        this.#addToCartText = this.dataset.addToCartText || window.theme.localize("ADD_TO_CART");
        this.#updateVariantOptionStates();
        this.addEventListener("change", this.onVariantChange);
    }
    disconnectedCallback() {
        this.removeEventListener("change", this.onVariantChange);
        this.#variantDataCache.clear();
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
    }
    async onVariantChange({target: target}, isRefetch = false) {
        if (!isRefetch) {
            this.previouslyCorrectOptionValueIds = [ ...this.optionValueIds ];
        }
        this.updateOptions();
        this.removeErrorMessage();
        const currentlyFocusedElementId = document.activeElement?.id;
        const optionValuesString = this.optionValueIds.join(",");
        const viewParams = this.dataset.viewId ? `?view=${this.dataset.viewId}` : "";
        const sectionParams = this.dataset.section ? `${viewParams ? "&" : "?"}section_id=${this.dataset.section}` : "";
        const params = optionValuesString ? `${sectionParams || viewParams ? "&" : "?"}option_values=${optionValuesString}` : "";
        const cachedVariantData = this.#variantDataCache.get(optionValuesString);
        let template;
        if (cachedVariantData) {
            template = cachedVariantData instanceof Promise ? await cachedVariantData : cachedVariantData;
        } else {
            const [combinedListingOptionId] = Object.keys(this.combinedListingsUrls).filter((id => this.optionValueIds.includes(id)));
            const url = combinedListingOptionId ? this.combinedListingsUrls[combinedListingOptionId] : this.dataset.url;
            const response = await fetch(`${url}${viewParams}${sectionParams}${params}`);
            if (!response.ok) {
                if (this.#lastFetchRetryKey !== optionValuesString) {
                    this.#lastFetchRetryKey = optionValuesString;
                    this.#fetchRetryCount = 0;
                }
                if (this.#lastFetchRetryKey === optionValuesString && this.#fetchRetryCount < this.#FETCH_RETRY_COUNT) {
                    this.#fetchRetryCount += 1;
                    this.#lastFetchRetryKey = optionValuesString;
                    setTimeout((async () => {
                        console.warn(`(${this.#fetchRetryCount}/${this.#FETCH_RETRY_COUNT}) Trying to re-fetch variant for options combination: `, optionValuesString);
                        this.onVariantChange({
                            target: target
                        }, true);
                    }), this.#FETCH_RETRY_DELAY);
                    return;
                }
                this.#fetchRetryCount = 0;
                this.#lastFetchRetryKey = null;
                this.#renderError(`Failed to fetch variant for options combination: ${optionValuesString}`);
                this.resetOptionsToPreviouslyCorrect();
                return;
            } else if (isRefetch) {
                this.previouslyCorrectOptionValueIds = [ ...this.optionValueIds ];
            }
            const data = await response.text();
            template = this.#prepareTemplate(data);
            if (this.#variantDataCache.size >= 100) {
                const oldestKey = this.#variantDataCache.keys().next().value;
                this.#variantDataCache.delete(oldestKey);
            }
            this.#variantDataCache.set(optionValuesString, template);
        }
        const html = template.content.cloneNode(true);
        const productElement = this.closest("product-single, quick-shop");
        const productElementTag = productElement?.tagName.toLowerCase();
        const oldProductUrl = productElement?.dataset.productUrl;
        const newProductUrl = target.tagName === "SELECT" ? target.options[target.selectedIndex].dataset.productUrl : target.dataset.productUrl;
        if (newProductUrl && oldProductUrl !== newProductUrl) {
            const newContent = html.querySelector(productElement.tagName.toLowerCase());
            Array.from(this.querySelectorAll("[data-a11y-dialog-show]")).forEach((el => {
                const popup = document.getElementById(el.dataset.a11yDialogShow);
                if (popup) popup.remove();
            }));
            if (productElementTag === "quick-shop") {
                productElement.updateContent(newContent);
                productElement.dataset.productUrl = newProductUrl;
            } else {
                productElement.parentNode.insertBefore(newContent, productElement);
                productElement.remove();
            }
            const newVariantSelects = document.querySelector("variant-selects, variant-radios, variant-mixed-inputs");
            if (newVariantSelects) {
                newVariantSelects.querySelectorAll('input[type="radio"][checked]').forEach((radioInput => {
                    const el = radioInput;
                    el.checked = true;
                }));
                newVariantSelects.updateOptions();
                const checkedInput = newVariantSelects.querySelector('input[type="radio"]:checked');
                if (checkedInput) {
                    checkedInput.dispatchEvent(new Event("change", {
                        bubbles: true
                    }));
                }
            }
            if (currentlyFocusedElementId) {
                document.getElementById(currentlyFocusedElementId)?.focus();
            }
            if (this.dataset.updateUrl !== "false") {
                window.history.pushState({}, "", newProductUrl);
            }
            return;
        }
        const newVariantData = JSON.parse(html.querySelector(`#variant-data-${this.uniqueId}`).textContent);
        if (!newVariantData?.id) {
            this.toggleAddButton(true, "");
            this.setUnavailable();
            this.#updateVariantOptionStates();
        } else {
            const newVariantSelectors = html.querySelector(`#variant-selectors-${this.uniqueId}`);
            if (newVariantSelectors) {
                const oldVariantDataElement = this.querySelector(`#variant-data-${this.uniqueId}`);
                const newVariantDataElement = html.querySelector(`#variant-data-${this.uniqueId}`);
                if (oldVariantDataElement && newVariantDataElement) {
                    oldVariantDataElement.textContent = newVariantDataElement.textContent;
                }
                Array.from(this.querySelectorAll("[data-a11y-dialog-show]")).forEach((el => {
                    const popup = document.getElementById(el.dataset.a11yDialogShow);
                    if (popup) popup.remove();
                }));
                this.innerHTML = newVariantSelectors.innerHTML;
            }
            this.updateMasterId();
            if (!this.currentVariant.available) {
                this.toggleAddButton(true, window.theme.localize("SOLD_OUT"));
            } else {
                this.toggleAddButton(false);
            }
            const oldPriceContainer = document.getElementById(`price-${this.uniqueId}`);
            const newPriceContainer = html.getElementById(`price-${this.uniqueId}`);
            if (oldPriceContainer && newPriceContainer) {
                oldPriceContainer.innerHTML = newPriceContainer.innerHTML;
                oldPriceContainer.removeAttribute("hidden");
            }
            const oldUnitPriceContainer = document.getElementById(`unit-price-${this.uniqueId}`);
            const newUnitPriceContainer = html.getElementById(`unit-price-${this.uniqueId}`);
            if (oldUnitPriceContainer && newUnitPriceContainer) {
                oldUnitPriceContainer.innerHTML = newUnitPriceContainer.innerHTML;
            }
            const oldLabelContainer = document.getElementById(`label-${this.uniqueId}`);
            const newLabelContainer = html.getElementById(`label-${this.uniqueId}`);
            if (oldLabelContainer && newLabelContainer) {
                oldLabelContainer.innerHTML = newLabelContainer.innerHTML;
            }
            const oldLabelsContainer = document.getElementById(`labels-${this.uniqueId}`);
            const newLabelsContainer = html.getElementById(`labels-${this.uniqueId}`);
            if (oldLabelsContainer && newLabelsContainer) {
                oldLabelsContainer.innerHTML = newLabelsContainer.innerHTML;
            }
            const oldInventoryNoticeContainer = document.getElementById(`inventory-notice-${this.uniqueId}`);
            const newInventoryNoticeContainer = html.getElementById(`inventory-notice-${this.uniqueId}`);
            if (oldInventoryNoticeContainer && newInventoryNoticeContainer) {
                oldInventoryNoticeContainer.innerHTML = newInventoryNoticeContainer.innerHTML;
            }
            const skuContainer = document.getElementById(`sku-${this.uniqueId}`);
            const newSkuContainer = html.getElementById(`sku-${this.uniqueId}`);
            if (skuContainer && newSkuContainer) {
                skuContainer.innerHTML = newSkuContainer.innerHTML;
            }
            const barcodeContainer = document.getElementById(`barcode-${this.uniqueId}`);
            const newBarcodeContainer = html.getElementById(`barcode-${this.uniqueId}`);
            if (barcodeContainer && newBarcodeContainer) {
                barcodeContainer.innerHTML = newBarcodeContainer.innerHTML;
            }
            const oldPaymentTerms = document.getElementById(`product-form-${this.uniqueId}`)?.querySelector(".shopify-payment-terms");
            const newPaymentTerms = html.querySelector(`#product-form-${this.uniqueId}`)?.querySelector(".shopify-payment-terms");
            if (oldPaymentTerms && newPaymentTerms) {
                oldPaymentTerms.innerHTML = newPaymentTerms.innerHTML;
            }
            if (this.updateGalleryOnVariantChange && productElement.tagName === "PRODUCT-SINGLE") {
                const newMediaGallery = html.getElementById(`media-gallery-${this.uniqueId}`);
                productElement.updateGallery(newMediaGallery);
            }
            this.updateURL();
            this.updateVariantInput();
            this.updatePickupAvailability();
            if (currentlyFocusedElementId) {
                document.getElementById(currentlyFocusedElementId)?.focus();
            }
            this.#cacheAdjacentVariants();
            this.#updateVariantOptionStates();
            const mediaGallery = productElement.querySelector("media-gallery");
            this.dispatchEvent(new CustomEvent("on:variant:change", {
                detail: {
                    mediaGallery: mediaGallery,
                    variant: this.currentVariant
                }
            }));
            document.dispatchEvent(new CustomEvent("variant:changed", {
                bubbles: true,
                detail: {
                    variant: this.currentVariant,
                    sectionId: this.uniqueId
                }
            }));
        }
    }
    setOptionByValueId(valueId) {
        if (!valueId) return;
        const optionElement = this.querySelector(`[data-option-value-id="${valueId}"]`);
        if (optionElement?.tagName === "INPUT") {
            optionElement.click();
        } else if (optionElement?.tagName === "OPTION") {
            const selectElement = optionElement.closest("select");
            selectElement.value = optionElement.value;
            selectElement.dispatchEvent(new Event("change", {
                bubbles: true
            }));
        }
    }
    updateOptions() {
        this.options = Array.from(this.querySelectorAll("select"), (select => select.value));
        this.optionValueIds = Array.from(this.querySelectorAll("select"), (select => select.options[select.selectedIndex].dataset.optionValueId));
        this.adjacentOptionValueIds = Array.from(this.querySelectorAll("select")).reduce(((acc, select, index) => {
            const unselectedOptions = Array.from(select.options).filter((option => option.dataset.optionValueId !== select.options[select.selectedIndex].dataset.optionValueId));
            return [ ...acc, ...unselectedOptions.map((option => [ ...this.optionValueIds.slice(null, index), option.dataset.optionValueId, ...this.optionValueIds.slice(index + 1) ])) ];
        }), []);
        this.combinedListingsUrls = Array.from(this.querySelectorAll(`select option[data-product-url]`)).reduce(((acc, option) => ({
            ...acc,
            [option.dataset.optionValueId]: option.dataset.productUrl
        })), {});
    }
    resetOptionsToPreviouslyCorrect() {
        this.previouslyCorrectOptionValueIds.forEach((option => {
            const optionElement = this.querySelector(`option[data-option-value-id="${option}"]`);
            if (optionElement) {
                optionElement.closest("select").value = optionElement.value;
            }
        }));
    }
    updateMasterId() {
        this.currentVariant = JSON.parse(this.querySelector('[type="application/json"]').textContent);
    }
    updateURL() {
        if (!this.currentVariant?.id || this.dataset.updateUrl === "false") return;
        window.history.replaceState({}, "", `${this.dataset.url}?variant=${this.currentVariant.id}`);
    }
    updateVariantInput() {
        const productForms = document.querySelectorAll(`#product-form-${this.uniqueId}, #product-form-installment-${this.uniqueId}`);
        productForms.forEach((productForm => {
            const input = productForm.querySelector('input[name="id"]');
            input.value = this.currentVariant.id;
            input.dispatchEvent(new Event("change", {
                bubbles: true
            }));
        }));
        const productSingle = this.closest("product-single");
        if (productSingle) {
            productSingle.variant = this.currentVariant;
        }
    }
    updatePickupAvailability() {
        const pickupAvailability = document.querySelector(`#products-availability-${this.uniqueId} pickup-availability`);
        if (!pickupAvailability) return;
        pickupAvailability.removeAttribute("hidden");
        pickupAvailability.fetchAvailability(this.currentVariant.id);
    }
    removeErrorMessage() {
        const error = this.querySelector(".errors");
        if (error) error.remove();
        const section = this.closest("section");
        if (!section) return;
        section.querySelector(".qty-error")?.remove();
    }
    toggleAddButton(disable = true, text = "") {
        const productForm = document.getElementById(`product-form-${this.uniqueId}`);
        if (!productForm) return;
        const buttonsContainer = productForm.querySelector(".js-product-buttons");
        const addButton = productForm.querySelector('[name="add"]');
        const addButtonText = productForm.querySelector('[name="add"] staged-action-text');
        if (!addButton) return;
        if (disable) {
            addButton.setAttribute("disabled", "disabled");
            if (text) addButtonText.textContent = text;
            buttonsContainer.classList.add("is-disabled");
        } else {
            addButton.removeAttribute("disabled");
            addButtonText.textContent = this.#addToCartText;
            buttonsContainer.classList.remove("is-disabled");
        }
    }
    setUnavailable() {
        const productForm = document.getElementById(`product-form-${this.uniqueId}`);
        const addButton = productForm.querySelector('[name="add"]');
        const addButtonText = productForm.querySelector('[name="add"] staged-action-text');
        const inventoryNoticeContainer = document.getElementById(`inventory-notice-${this.uniqueId}`);
        const soldClass = "stock-note--sold";
        const inStockClass = "stock-note--in-stock";
        const lowStockClass = "stock-note--low";
        if (inventoryNoticeContainer) {
            const inventoryNoticeWrapperContainer = inventoryNoticeContainer.querySelector(".stock-note");
            const inventoryNoticeTextContainer = inventoryNoticeContainer.querySelector(".stock-note__text");
            inventoryNoticeWrapperContainer.classList.remove(inStockClass, lowStockClass);
            inventoryNoticeWrapperContainer.classList.add(soldClass);
            inventoryNoticeTextContainer.innerHTML = window.theme.localize("QTY_NOTICE_SOLD_OUT");
        }
        const pickupAvailability = document.querySelector(`#products-availability-${this.uniqueId} pickup-availability`);
        if (pickupAvailability) pickupAvailability.setAttribute("hidden", "");
        const price = document.getElementById(`price-${this.uniqueId}`);
        const buttonsContainer = productForm.querySelector(".js-product-buttons");
        if (!addButton) return;
        addButton.setAttribute("disabled", "disabled");
        addButtonText.textContent = window.theme.localize("UNAVAILABLE");
        buttonsContainer.classList.add("is-disabled");
        if (price) price.setAttribute("hidden", "");
    }
    get #allVariants() {
        const json = this.querySelector(`#all-variant-data-${this.uniqueId}`);
        if (!json) return [];
        try {
            const data = JSON.parse(json.textContent);
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }
    #updateVariantOptionStates() {
        this.#cleanFirstSelectGroup();
        const variants = this.#allVariants;
        if (!variants.length) return;
        if (variants.length >= 250) return;
        const selectedOptions = this.options;
        if (!selectedOptions?.length) return;
        this.#updateButtonStates(variants, selectedOptions);
        this.#updateSelectLabels(variants, selectedOptions);
    }
    #cleanFirstSelectGroup() {
        const optionGroups = Array.from(this.querySelectorAll("fieldset, select"));
        if (optionGroups.length <= 1) return;
        const firstGroup = optionGroups[0];
        if (firstGroup.tagName !== "SELECT") return;
        Array.from(firstGroup.options).forEach((optionElement => {
            const el = optionElement;
            if (el.dataset.baseText) el.textContent = el.dataset.baseText;
        }));
    }
    #updateButtonStates(variants, selectedOptions) {
        const optionGroups = Array.from(this.querySelectorAll("fieldset, select"));
        const totalGroups = optionGroups.length;
        optionGroups.forEach(((group, optionIndex) => {
            if (group.tagName !== "FIELDSET") return;
            Array.from(group.querySelectorAll("input")).forEach((input => {
                const label = input.nextElementSibling;
                if (!label) return;
                if (optionIndex === 0 && totalGroups > 1) {
                    label.classList.remove("is-disabled");
                    return;
                }
                const candidateOptions = [ ...selectedOptions ];
                candidateOptions[optionIndex] = input.value;
                const hasAvailableMatch = variants.some((variant => variant.available && variant.options.every(((optionValue, index) => optionValue === candidateOptions[index]))));
                label.classList.toggle("is-disabled", !hasAvailableMatch);
            }));
        }));
    }
    #updateSelectLabels(variants, selectedOptions) {
        const soldOutText = window.theme.localize("SOLD_OUT");
        const unavailableText = window.theme.localize("UNAVAILABLE");
        const optionGroups = Array.from(this.querySelectorAll("fieldset, select"));
        const totalGroups = optionGroups.length;
        optionGroups.forEach(((group, optionIndex) => {
            if (group.tagName !== "SELECT") return;
            if (optionIndex === 0 && totalGroups > 1) return;
            Array.from(group.options).forEach((optionElement => {
                const el = optionElement;
                let baseText;
                if (el.dataset.baseText) {
                    baseText = el.dataset.baseText;
                } else {
                    baseText = el.textContent.trim();
                    baseText = baseText.replace(new RegExp(`\\s+-\\s+${soldOutText}`, "g"), "");
                    baseText = baseText.replace(new RegExp(`\\s+-\\s+${unavailableText}`, "g"), "");
                    baseText = baseText.trim();
                }
                const candidateOptions = [ ...selectedOptions ];
                candidateOptions[optionIndex] = el.value;
                const matchingVariants = variants.filter((variant => variant.options.every(((optionValue, index) => optionValue === candidateOptions[index]))));
                if (!matchingVariants.length) {
                    el.textContent = `${baseText} - ${unavailableText}`;
                } else if (!matchingVariants.some((variant => variant.available))) {
                    el.textContent = `${baseText} - ${soldOutText}`;
                } else {
                    el.textContent = baseText;
                }
            }));
        }));
    }
    #cacheAdjacentVariants() {
        if (!this.#variantDataCache) return;
        this.adjacentOptionValueIds.forEach((ids => {
            const key = ids.join(",");
            if (this.#variantDataCache.has(key)) return;
            if (this.#variantDataCache.size >= 100) {
                const oldestKey = this.#variantDataCache.keys().next().value;
                this.#variantDataCache.delete(oldestKey);
            }
            const viewParams = this.dataset.viewId ? `?view=${this.dataset.viewId}` : "";
            const sectionParams = this.dataset.section ? `${viewParams ? "&" : "?"}section_id=${this.dataset.section}` : "";
            const params = key ? `${sectionParams || viewParams ? "&" : "?"}option_values=${key}` : "";
            const [combinedListingOptionId] = Object.keys(this.combinedListingsUrls).filter((id => ids.includes(id)));
            const url = combinedListingOptionId ? this.combinedListingsUrls[combinedListingOptionId] : this.dataset.url;
            const promise = fetch(`${url}${viewParams}${sectionParams}${params}`).then((response => response.text().then((text => {
                if (!response.ok) {
                    this.#variantDataCache.delete(key);
                    console.warn("Failed to cache variant data for: ", key);
                    return "";
                }
                const template = this.#prepareTemplate(text);
                this.#variantDataCache.set(key, template);
                return template;
            }))));
            this.#variantDataCache.set(key, promise);
        }));
    }
    #prepareTemplate(data) {
        const template = document.createElement("template");
        template.innerHTML = data;
        const {firstElementChild: firstElementChild} = template.content;
        if (firstElementChild.tagName === "QUICK-SHOP") {
            const quickShopId = firstElementChild.id;
            const elementIdsToChange = firstElementChild.querySelectorAll(`[id$="${quickShopId}"]`);
            const elementFormIdToChange = firstElementChild.querySelectorAll(`[form$="${quickShopId}"]`);
            const elementForIdToChange = firstElementChild.querySelectorAll(`[for$="${quickShopId}"]`);
            elementIdsToChange.forEach((el => {
                el.setAttribute("id", `${el.getAttribute("id").replace(quickShopId, this.uniqueId)}`);
                if (el.getAttribute("id").includes("variant-selectors")) el.setAttribute("data-card", this.uniqueId);
            }));
            elementFormIdToChange.forEach((el => el.setAttribute("form", `${el.getAttribute("form").replace(quickShopId, this.uniqueId)}`)));
            elementForIdToChange.forEach((el => el.setAttribute("for", `${el.getAttribute("for").replace(quickShopId, this.uniqueId)}`)));
            firstElementChild.setAttribute("aria-labelledby", firstElementChild.getAttribute("aria-labelledby").replace(quickShopId, this.uniqueId));
        }
        return template;
    }
    #renderError(message) {
        this.removeErrorMessage();
        const error = document.createElement("div");
        error.classList.add("errors", "qty-error", "u-small");
        error.innerHTML = message;
        this.prepend(error);
    }
}

customElements.define("variant-selects", VariantSelects);

class VariantRadios extends VariantSelects {
    updateOptions() {
        const fieldsets = Array.from(this.querySelectorAll("fieldset"));
        this.options = fieldsets.map((fieldset => Array.from(fieldset.querySelectorAll("input")).find((radio => radio.checked))?.value));
        this.optionValueIds = fieldsets.map((fieldset => Array.from(fieldset.querySelectorAll("input")).find((radio => radio.checked))?.dataset.optionValueId));
        this.adjacentOptionValueIds = fieldsets.reduce(((acc, fieldset, index) => {
            const uncheckedInputs = Array.from(fieldset.querySelectorAll("input:not([checked])"));
            return [ ...acc, ...uncheckedInputs.map((input => [ ...this.optionValueIds.slice(null, index), input.dataset.optionValueId, ...this.optionValueIds.slice(index + 1) ])) ];
        }), []);
        this.combinedListingsUrls = Array.from(this.querySelectorAll(`fieldset input[data-product-url]`)).reduce(((acc, input) => ({
            ...acc,
            [input.dataset.optionValueId]: input.dataset.productUrl
        })), {});
    }
    resetOptionsToPreviouslyCorrect() {
        this.previouslyCorrectOptionValueIds.forEach((option => {
            const input = this.querySelector(`input[data-option-value-id="${option}"]`);
            if (input) {
                input.checked = true;
            }
        }));
    }
}

customElements.define("variant-radios", VariantRadios);

class VariantSwatches extends HTMLElement {
    connectedCallback() {
        const checkedInput = this.querySelector("input[checked]");
        checkedInput.checked = true;
        this.currentSelection = checkedInput?.value;
        const form = document.getElementById(this.dataset.formId);
        if (form) {
            form.addEventListener("change", (() => {
                this.updateLabel();
            }));
        } else {
            this.addEventListener("change", (() => {
                this.updateLabel();
            }));
        }
        this.bindHoverEvents();
    }
    updateLabel() {
        const currentSelection = this.querySelector("input[checked]").value;
        if (currentSelection !== this.currentSelection) {
            const labelOptionElement = this.querySelector(".js-option-title");
            labelOptionElement.innerHTML = currentSelection;
            this.currentSelection = currentSelection;
        }
    }
    bindHoverEvents() {
        const swatches = this.querySelectorAll(".product-form__swatch__item");
        const labelOptionElement = this.querySelector(".js-option-title");
        let resetTimeout;
        swatches.forEach((swatch => {
            const label = swatch.querySelector("label");
            const input = swatch.querySelector("input");
            label.addEventListener("mouseenter", (() => {
                clearTimeout(resetTimeout);
                if (input) {
                    labelOptionElement.textContent = input.value;
                }
            }));
            label.addEventListener("mouseleave", (() => {
                resetTimeout = setTimeout((() => {
                    labelOptionElement.textContent = this.currentSelection;
                }), 200);
            }));
        }));
    }
}

customElements.define("variant-swatches", VariantSwatches);

class VariantMixedInputs extends VariantSelects {
    updateOptions() {
        this.options = Array.from(this.querySelectorAll("input:checked, select"), (element => element.value));
        this.optionValueIds = Array.from(this.querySelectorAll("input:checked, select"), (element => element.tagName === "INPUT" ? element.dataset.optionValueId : element.options[element.selectedIndex].dataset.optionValueId));
        this.adjacentOptionValueIds = Array.from(this.querySelectorAll("fieldset, select")).reduce(((acc, element, index) => {
            const unselectedOptions = element.tagName === "SELECT" ? Array.from(element.options).filter((option => option.dataset.optionValueId !== element.options[element.selectedIndex].dataset.optionValueId)) : Array.from(element.querySelectorAll("input:not(:checked)"));
            return [ ...acc, ...unselectedOptions.map((option => [ ...this.optionValueIds.slice(null, index), option.dataset.optionValueId, ...this.optionValueIds.slice(index + 1) ])) ];
        }), []);
        this.combinedListingsUrls = Array.from(this.querySelectorAll(`fieldset input[data-product-url], select option[data-product-url]`)).reduce(((acc, element) => ({
            ...acc,
            [element.dataset.optionValueId]: element.dataset.productUrl
        })), {});
    }
    resetOptionsToPreviouslyCorrect() {
        this.previouslyCorrectOptionValueIds.forEach((option => {
            const element = this.querySelector(`input[data-option-value-id="${option}"], option[data-option-value-id="${option}"]`);
            if (element && element.tagName === "INPUT") {
                element.checked = true;
            } else if (element && element.tagName === "OPTION") {
                element.closest("select").value = element.value;
            }
        }));
    }
}

customElements.define("variant-mixed-inputs", VariantMixedInputs);
//# sourceMappingURL=variant-select-components.js.map
