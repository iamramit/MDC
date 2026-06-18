/*! Copyright (c) Safe As Milk. All rights reserved. */
import Cart from "cart-store";

import Cookies from "js-cookie";

import plugins from "cart-plugins";

import { debounce, formatMoney } from "utils";

class InteractiveCart extends HTMLElement {
    #cartDraw;
    #controlHeightAtValue;
    #resizeObserver;
    static #plugins={};
    connectedCallback() {
        this.id = this.getAttribute("id");
        this.form = this.querySelector("form");
        this.cart = Cart.getState().cart;
        this.freeShippingBar = this.querySelector("free-shipping-bar");
        this.#cartDraw = this.closest(".modal--cart");
        this.#controlHeightAtValue = null;
        this.#resizeObserver = null;
        if (this.getAttribute("height-control") && this.#cartDraw) {
            this.#controlHeightAtValue = Number(this.getAttribute("height-control"));
            this.#resizeObserver = new ResizeObserver(debounce(this.#onResize.bind(this), 100));
            this.#resizeObserver.observe(this.#cartDraw);
        }
        this.#render();
        this.unsubscribe = Cart.subscribe((state => {
            this.cart = state.cart;
            this.#render();
            this.#updateCartDiscounts();
            this.#updateCartTotal();
            this.#updateFreeShipping();
        }));
    }
    disconnectedCallback() {
        this.unsubscribe();
        if (this.#resizeObserver) {
            this.#resizeObserver.disconnect();
            this.#resizeObserver = null;
        }
    }
    static registerPlugin(priority, fn) {
        if (InteractiveCart.#plugins[priority]) throw new Error(`Plugin with priority ${priority} is already registered`);
        InteractiveCart.#plugins[priority] = fn;
    }
    #onResize(entries) {
        entries.forEach((() => {
            const {parentElement: parentElement} = this;
            const parentElementComputedStyle = window.getComputedStyle(parentElement);
            const gap = Number(parentElementComputedStyle.getPropertyValue("row-gap").replace("px", ""));
            const parentElementTopPadding = Number(parentElementComputedStyle.getPropertyValue("padding-top").replace("px", ""));
            const siblingElements = Array.from(this.parentElement.querySelectorAll(".cart-draw__announcement, .cart-draw__head, .free-shipping-bar"));
            const cartControls = this.querySelector(".cart__controls");
            if (!cartControls) return;
            const blockedHeight = parentElementTopPadding + siblingElements.reduce(((total, element) => total + element.offsetHeight + gap), 0) + cartControls.offsetHeight;
            this.#cartDraw.classList.toggle("is-scrollable", this.#controlHeightAtValue > window.innerHeight - blockedHeight);
        }));
    }
    #render() {
        if (this.cart.item_count > 0) {
            this.#renderCart();
            Object.entries(InteractiveCart.#plugins).sort((([a], [b]) => a - b)).forEach((([, fn]) => {
                fn.call(this, Cart, this, this.cart);
            }));
        } else {
            this.#renderEmptyCart();
        }
    }
    #renderCart() {
        if (this.querySelector("cart-full")) return;
        const cartTemplate = document.getElementById("template-cart").content;
        const cartFragment = cartTemplate.cloneNode(true);
        const cartNote = cartFragment.querySelector("cart-note");
        const emptyCart = this.querySelector("cart-empty");
        if (emptyCart) {
            emptyCart.remove();
        }
        this.appendChild(cartFragment);
        if (cartNote) {
            cartNote.querySelector("cart-text-input").value = this.cart.note;
        }
        this.#updateCartDiscounts();
        this.#updateCartTotal();
    }
    #renderEmptyCart() {
        if (this.querySelector("cart-empty")) return;
        const cartEmptyTemplate = document.getElementById("template-empty-cart").content;
        const cartEmptyFragment = cartEmptyTemplate.cloneNode(true);
        const cartFull = this.querySelector("cart-full");
        if (cartFull) {
            cartFull.remove();
        }
        this.appendChild(cartEmptyFragment);
    }
    #updateFreeShipping() {
        if (!this.freeShippingBar) return;
        this.freeShippingBar.setAttribute("value", this.cart.total_price);
    }
    #updateCartTotal() {
        const cartTotal = this.querySelector("cart-total");
        if (!cartTotal) return;
        cartTotal.innerHTML = formatMoney(this.cart.total_price, window.theme.money_total_price_format);
    }
    #updateCartDiscounts() {
        const discountsContainer = this.querySelector("cart-discounts");
        if (!discountsContainer) return;
        const discounts = discountsContainer.querySelector("discount-list");
        const discountApplications = this.cart.cart_level_discount_applications;
        const discountItems = discountApplications.length > 0 && discountApplications[0].hasOwnProperty("discount_application") ? discountApplications.reduce(((items, {discount_application: {key: key, title: title, total_allocated_amount: amount}}) => {
            const newItems = items;
            const sameKeyItemIndex = newItems.findIndex((i => i.key === key));
            if (sameKeyItemIndex > -1) {
                newItems[sameKeyItemIndex].amount += amount;
                return newItems;
            }
            newItems.push({
                key: key,
                title: title,
                amount: amount
            });
            return newItems;
        }), []) : discountApplications.reduce(((items, {key: key, title: title, total_allocated_amount: amount}) => {
            items.push({
                key: key,
                title: title,
                amount: amount
            });
            return items;
        }), []);
        this.classList.toggle("has-cart-discounts", discountItems.length);
        const discountItemsString = JSON.stringify(discountItems);
        discounts.setAttribute("items", discountItemsString);
    }
}

customElements.define("interactive-cart", InteractiveCart);

class CartItems extends HTMLElement {
    connectedCallback() {
        this.items = Array.from(this.querySelectorAll("cart-item"));
        this.giftWrappingProductId = this.getAttribute("gift-wrapping-product-id");
        this.unsubscribe = Cart.subscribe((state => {
            this.items = this.items.reduce(((newItems, item) => {
                const key = item.getAttribute("key");
                const itemInCart = state.cart.items.find((i => i.key === key));
                if (!itemInCart) {
                    item.remove();
                    return newItems;
                }
                newItems.push(item);
                return newItems;
            }), []);
            const currentItemsKeys = this.items.map((item => item.key));
            const newItems = [];
            state.cart.items.forEach(((item, i) => {
                if (!currentItemsKeys.includes(item.key)) {
                    const newCartItem = CartItems.#createCartItem(item);
                    if (i === 0) {
                        this.prepend(newCartItem);
                    } else {
                        newItems[i - 1].after(newCartItem);
                    }
                    newItems.push(newCartItem);
                } else {
                    const oldItem = this.items.find((j => j.key === item.key));
                    if (currentItemsKeys.indexOf(oldItem.key) !== i) {
                        if (i === 0) {
                            this.prepend(oldItem);
                        } else {
                            newItems[i - 1].after(oldItem);
                        }
                    }
                    newItems.push(oldItem);
                }
            }));
            this.items = newItems;
        }));
    }
    disconnectedCallback() {
        this.unsubscribe();
    }
    static #createCartItem(item) {
        const cartItemTemplate = document.getElementById("template-cart-item").content;
        const cartItemFragment = cartItemTemplate.cloneNode(true);
        const cartItem = cartItemFragment.querySelector("cart-item");
        cartItem.setAttribute("key", item.key);
        return cartItem;
    }
}

customElements.define("cart-items", CartItems);

class CartItem extends HTMLElement {
    #boundRemoveProduct;
    #debouncedChangeQuantity;
    #isRendered;
    static #plugins={};
    constructor() {
        super();
        this.#debouncedChangeQuantity = debounce(this.#changeQuantity.bind(this), 250);
        this.#boundRemoveProduct = this.#removeProduct.bind(this);
    }
    connectedCallback() {
        this.key = this.getAttribute("key");
        this.item = Cart.getState().cart.items.find((item => item.key === this.key));
        if (!this.item) return;
        if (this.item.variant_id === Cart.getState().giftWrapping.productId) {
            this.giftWrappingItem = true;
            this.noQuantityInput = true;
            this.noLinks = true;
            this.giftWrappingMessageEnabled = Cart.getState().giftWrapping.giftMessageEnabled;
            this.giftWrappingMessage = Cart.getState().cart.attributes["gift-wrapping-message"] || "";
        }
        this.image = this.querySelector("cart-item-image-container img");
        this.imageContainerRatio = this.getAttribute("image-container-ratio").trim();
        this.imageFit = this.hasAttribute("image-fit");
        this.details = this.querySelector("cart-item-details");
        this.#isRendered = this.hasAttribute("rendered");
        if (!this.#isRendered) {
            this.#render();
        }
        this.quantity = this.querySelector("quantity-input");
        this.removeItemButton = this.querySelector("[cart-item-remove");
        setTimeout((() => {
            if (this.quantity) this.quantity.addEventListener("update", this.#debouncedChangeQuantity);
            if (this.removeItemButton) this.removeItemButton.addEventListener("click", this.#boundRemoveProduct);
        }));
        this.unsubscribe = Cart.subscribe(((state, prevState) => {
            if (state.lineItemsBeingUpdated.length > 0) {
                this.#renderError();
            }
            if (state.lineItemsBeingUpdated.includes(this.key)) {
                this.#toggleSpinner(true);
            } else {
                const newItem = state.cart.items.find((item => item.key === this.key));
                if (newItem && prevState.lineItemsBeingUpdated.includes(this.key)) {
                    this.#toggleSpinner(false);
                }
                if (!state.lineItemsBeingUpdated.includes(this.key)) {
                    if (this.quantity && this.quantity.value !== newItem.quantity) {
                        this.quantity.value = newItem.quantity;
                    } else {
                        const quantityDisplay = this.querySelector("quantity-display");
                        if (quantityDisplay) {
                            quantityDisplay.innerHTML = newItem.quantity;
                        }
                    }
                }
                this.item = newItem;
                this.#clearTotalPrice();
                this.#renderTotalPriceAndDiscounts();
                this.#runPostRenderFunctions();
            }
        }));
        setTimeout((() => this.#runPostRenderFunctions));
    }
    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
        if (this.quantity) this.quantity.removeEventListener("update", this.#debouncedChangeQuantity);
        if (this.removeItemButton) this.removeItemButton.removeEventListener("click", this.#boundRemoveProduct);
    }
    static registerPlugin(priority, fn) {
        if (CartItem.#plugins[priority]) throw new Error(`Plugin with priority ${priority} is already registered`);
        CartItem.#plugins[priority] = fn;
    }
    #runPostRenderFunctions() {
        Object.entries(CartItem.#plugins).sort((([a], [b]) => a - b)).forEach((([, fn]) => {
            fn.call(this, Cart, this, this.item);
        }));
    }
    #render() {
        this.querySelectorAll("a[cart-item-url]").forEach((link => {
            if (this.noLinks) {
                const div = document.createElement("div");
                if (link.hasAttribute("class")) {
                    div.setAttribute("class", link.getAttribute("class"));
                }
                if (link.hasAttribute("style")) {
                    div.setAttribute("style", link.getAttribute("style"));
                }
                div.innerHTML = link.innerHTML;
                link.replaceWith(div);
                this.image = this.querySelector("cart-item-image-container img");
            } else {
                link.setAttribute("href", this.item.url);
            }
        }));
        this.#setImage();
        if (this.imageContainerRatio === "natural") {
            this.image.closest(".o-ratio").style.paddingBottom = `${1 / (this.item.featured_image ? this.item.featured_image.aspect_ratio : 1) * 100}%`;
        } else {
            this.image.closest(".o-ratio").style.paddingBottom = null;
        }
        this.#updateSkeleton();
        this.querySelector("cart-item-title").innerHTML = this.item.product_title;
        const metaItemTemplate = document.getElementById("template-cart-item-meta").content;
        const vendor = this.querySelector("cart-item-vendor");
        if (vendor) {
            vendor.appendChild(metaItemTemplate.cloneNode(true));
            vendor.querySelector("property-value").innerHTML = this.item.vendor;
        }
        if (this.item.variant_title && !this.item.variant_title.includes("Default")) {
            const defaultProperty = this.querySelector("cart-item-default-property");
            defaultProperty.appendChild(metaItemTemplate.cloneNode(true));
            defaultProperty.querySelector("property-value").innerHTML = this.item.variant_title;
        }
        if (Object.keys(this.item.properties || {}).length > 0) {
            const propertyItemTemplate = document.getElementById("template-cart-item-property").content;
            const properties = this.querySelector("cart-item-properties");
            Object.entries(this.item.properties).forEach((([name, value]) => {
                if (value !== "" && name.slice(0, 1) !== "_") {
                    const propertyTemplate = propertyItemTemplate.cloneNode(true);
                    let propertyName = name;
                    if (this.item.gift_card && name === "Recipient email") {
                        propertyName = window.theme.localize("GIFT_CARD_RECIPIENT_EMAIL");
                    } else if (this.item.gift_card && name === "Recipient name") {
                        propertyName = window.theme.localize("GIFT_CARD_RECIPIENT_NAME");
                    } else if (this.item.gift_card && name === "Recipient message") {
                        propertyName = window.theme.localize("GIFT_CARD_RECIPIENT_MESSAGE");
                    } else if (this.item.gift_card && name === "Recipient send on") {
                        propertyName = window.theme.localize("GIFT_CARD_RECIPIENT_SEND_ON");
                    }
                    propertyTemplate.querySelector("property-name").innerHTML = propertyName;
                    propertyTemplate.querySelector("property-value").innerHTML = value.includes("/uploads/") ? `<a href="${value}">${value.split("/").pop()}</a>` : value;
                    properties.appendChild(propertyTemplate);
                }
            }));
        }
        if (this.item.selling_plan_allocation) {
            const sellingPlanAllocation = this.querySelector("cart-item-selling-plan-allocation");
            sellingPlanAllocation.appendChild(metaItemTemplate.cloneNode(true));
            sellingPlanAllocation.querySelector("property-value").innerHTML = `${this.item.selling_plan_allocation.selling_plan.name}${this.item.selling_plan_allocation.compare_at_price && this.item.selling_plan_allocation.compare_at_price !== this.item.selling_plan_allocation.price ? ` (-${Math.round((1 - this.item.selling_plan_allocation.price / this.item.selling_plan_allocation.compare_at_price) * 100)}%)` : ""}`;
        }
        const sku = this.querySelector("cart-item-sku");
        if (sku && this.item.sku) {
            sku.appendChild(metaItemTemplate.cloneNode(true));
            sku.querySelector("property-value").innerHTML = this.item.sku;
        }
        if (this.item.unit_price_measurement) {
            const itemUnitPrice = this.querySelector("cart-item-unit-price");
            const unitPriceTemplate = document.getElementById("template-unit-price").content;
            itemUnitPrice.appendChild(unitPriceTemplate.cloneNode(true));
            const baseUnit = `${this.item.unit_price_measurement.reference_value !== 1 ? this.item.unit_price_measurement.reference_value : ""}${this.item.unit_price_measurement.reference_unit}`;
            itemUnitPrice.querySelector("unit-price").innerHTML = formatMoney(this.item.unit_price, window.theme.money_format);
            itemUnitPrice.querySelector("base-unit").innerHTML = baseUnit;
        }
        if (this.giftWrappingItem && this.giftWrappingMessageEnabled) {
            const giftWrappingMessageTemplate = document.getElementById("template-cart-gift-wrapping-message").content;
            this.querySelector("cart-item-micro-copy").appendChild(giftWrappingMessageTemplate.cloneNode(true));
            this.classList.add("cart-item--full-details");
            this.querySelector("cart-text-input").value = this.giftWrappingMessage;
        }
        if (this.noQuantityInput) {
            const quantityDisplay = document.createElement("quantity-display");
            quantityDisplay.classList.add("cart-item__qty-display");
            quantityDisplay.innerHTML = this.item.quantity;
            this.querySelector("cart-item-quantity").appendChild(quantityDisplay);
        } else {
            const quantityInputTemplate = document.getElementById("template-quantity-input").content;
            const quantityElement = quantityInputTemplate.cloneNode(true);
            this.quantity = quantityElement.querySelector("quantity-input");
            const quantityInput = quantityElement.querySelector('input[type="number"]');
            quantityInput.setAttribute("id", `updates_${this.item.key}`);
            quantityInput.setAttribute("name", `updates[]`);
            this.querySelector("cart-item-quantity").appendChild(this.quantity);
            setTimeout((() => {
                this.quantity.value = this.item.quantity;
            }));
            this.removeItemButton = this.querySelector("button[cart-item-remove]");
        }
        this.#renderTotalPriceAndDiscounts();
        this.setAttribute("rendered", "");
    }
    #setImage(srcsetWidths = [ 120, 240, 360, 480 ]) {
        if (!this.image) return;
        const imageData = this.item.featured_image;
        if (imageData && imageData.url) {
            const {width: width, height: height, url: url} = imageData;
            const imageContainerRatio = this.imageContainerRatio !== "natural" ? this.imageContainerRatio.split(":").reduce(((ratio, value) => ratio !== 0 ? value / ratio : value), 0) : null;
            const aspectRatio = width / height;
            const uncroppedImage = this.imageContainerRatio === "natural" || imageContainerRatio && this.imageFit;
            let masterWidth = width;
            let masterHeight = height;
            if (!uncroppedImage) {
                masterHeight = Math.round(masterWidth * imageContainerRatio);
                if (masterHeight > height) {
                    masterHeight = height;
                    masterWidth = Math.round(masterHeight / imageContainerRatio);
                }
            }
            const srcset = srcsetWidths.reduce(((srcSet, srcWidth) => {
                const srcHeight = Math.round(uncroppedImage ? srcWidth / aspectRatio : srcWidth * imageContainerRatio);
                if (srcWidth > masterWidth || srcHeight > masterHeight) return srcSet;
                return `${srcSet}${url}${url.includes("?") ? "&" : "?"}width=${srcWidth}${!uncroppedImage ? `&height=${srcHeight}&crop=center` : ""} ${srcWidth}w ${srcHeight}h, `;
            }), "");
            const masterSrc = !uncroppedImage ? `${url}${url.includes("?") ? "&" : "?"}width=${masterWidth}&height=${masterHeight}&crop=center` : url;
            this.image.setAttribute("src", masterSrc);
            this.image.setAttribute("srcset", srcset);
            this.image.setAttribute("width", masterWidth);
            this.image.setAttribute("height", masterHeight);
        }
        this.image.setAttribute("alt", `Image for ${this.item.title}`);
    }
    #updateSkeleton() {
        if (!this.image) return;
        const skeleton = this.image.previousElementSibling && this.image.previousElementSibling.tagName.toLowerCase() === "image-skeleton" ? this.image.previousElementSibling : null;
        if (skeleton) {
            const svg = skeleton.querySelector("svg");
            const rect = svg.querySelector("rect");
            const width = this.image.getAttribute("width");
            const height = this.image.getAttribute("height");
            skeleton.setAttribute("aria-label", `Loading image for ${this.item.title}`);
            svg.setAttribute("width", width);
            svg.setAttribute("height", height);
            svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
            rect.setAttribute("width", width);
            rect.setAttribute("height", height);
        }
    }
    #toggleSpinner(visible = true) {
        if (visible) {
            this.#clearTotalPrice();
            const quantityInputTemplate = document.getElementById("template-spinner").content;
            this.querySelector("cart-item-spinner").appendChild(quantityInputTemplate.cloneNode(true));
        } else {
            this.querySelector("cart-item-spinner").innerHTML = "";
        }
    }
    #clearTotalPrice() {
        const priceContainer = this.querySelector("cart-item-original-line-price").parentElement;
        if (priceContainer) {
            const priceContainerWidth = priceContainer.offsetWidth;
            const priceContainerHeight = priceContainer.offsetHeight;
            priceContainer.style.width = `${priceContainerWidth}px`;
            priceContainer.style.height = `${priceContainerHeight}px`;
        }
        this.querySelector("cart-item-original-line-price").innerHTML = "";
        this.querySelector("cart-item-final-line-price").innerHTML = "";
    }
    #renderTotalPriceAndDiscounts() {
        const originalLinePrice = this.querySelector("cart-item-original-line-price");
        const finalLinePrice = this.querySelector("cart-item-final-line-price");
        const priceTemplate = document.getElementById("template-price").content;
        if (this.item.original_line_price !== this.item.final_line_price) {
            originalLinePrice.appendChild(priceTemplate.cloneNode(true));
            originalLinePrice.querySelector(".price").classList.add("price--original");
            originalLinePrice.querySelector("money-amount").innerHTML = formatMoney(this.item.original_line_price, window.theme.money_format);
            finalLinePrice.appendChild(priceTemplate.cloneNode(true));
            finalLinePrice.querySelector(".price").classList.add("price--sale");
            finalLinePrice.querySelector("money-amount").innerHTML = formatMoney(this.item.final_line_price, window.theme.money_format);
        } else {
            originalLinePrice.appendChild(priceTemplate.cloneNode(true));
            originalLinePrice.querySelector("money-amount").innerHTML = formatMoney(this.item.final_line_price, window.theme.money_format);
        }
        const discountsContainer = this.querySelector("cart-item-discounts");
        const discounts = discountsContainer.querySelector("discount-list");
        const discountItems = JSON.stringify(this.item.line_level_discount_allocations.reduce(((items, {amount: amount, discount_application: {key: key, title: title}}) => {
            items.push({
                key: key,
                title: title,
                amount: amount
            });
            return items;
        }), []));
        discounts.setAttribute("items", discountItems);
        this.classList.toggle("has-discounts", this.item.line_level_discount_allocations.length > 0);
        const priceContainer = this.querySelector("cart-item-original-line-price").parentElement;
        if (priceContainer) {
            priceContainer.style.width = "";
            priceContainer.style.height = "";
        }
    }
    #renderError(errorText = "") {
        const errorContainer = this.querySelector("cart-item-errors");
        this.classList.toggle("has-errors", errorText);
        errorContainer.innerHTML = `<div class="errors qty-error u-small">${errorText}</div>`;
    }
    async #changeQuantity() {
        if (!this.key) return;
        try {
            await Cart.change({
                id: this.key,
                quantity: this.quantity.value
            });
        } catch (e) {
            if (e.name && e.name === "AbortError") return;
            this.#renderError(e.message);
        }
    }
    async #removeProduct(e) {
        if (!this.key) return;
        e.preventDefault();
        if (this.giftWrappingItem) {
            await Cart.setGiftWrapping(false);
        } else {
            await Cart.change({
                id: this.key,
                quantity: 0
            });
        }
    }
}

customElements.define("cart-item", CartItem);

class DiscountList extends HTMLElement {
    constructor() {
        super();
        this.items = JSON.parse(this.getAttribute("items") || "[]");
    }
    static get observedAttributes() {
        return [ "items" ];
    }
    attributeChangedCallback(_, oldVal, newVal) {
        if (oldVal !== newVal) {
            this.items = JSON.parse(newVal);
            this.#renderDiscounts();
        }
    }
    #renderDiscounts() {
        this.innerHTML = "";
        if (this.items.length > 0) {
            const discountsList = document.createElement("ul");
            discountsList.classList.add("discounts");
            this.appendChild(discountsList);
            this.items.forEach((item => {
                const discount = document.createElement("li");
                discount.classList.add("discount");
                discountsList.appendChild(discount);
                const discountTemplate = document.getElementById("template-discount-item").content;
                discount.appendChild(discountTemplate.cloneNode(true));
                discount.querySelector("discount-title").innerHTML = item.title;
                if (item.amount > 0) {
                    discount.querySelector("discount-amount").innerHTML = formatMoney(item.amount, window.theme.money_format);
                }
            }));
        }
    }
}

customElements.define("discount-list", DiscountList);

class CartTextInput extends HTMLElement {
    #function;
    #spinnerTemplate;
    #status;
    #text;
    #updated;
    #updatedHTML;
    #updating;
    async connectedCallback() {
        this.#text = this.querySelector('textarea, input[type="text"]');
        this.#status = this.querySelector("cart-text-input-status");
        this.#updatedHTML = '<div class="is-saved">&checkmark;</div>';
        this.#updating = false;
        this.#updated = false;
        this.#spinnerTemplate = document.getElementById("template-spinner").content;
        this.#function = () => {};
        this.#text.addEventListener("input", this.#function);
    }
    disconnectedCallback() {
        this.#text.removeEventListener("input", this.#function);
    }
    set updating(isUpdating) {
        this.#updated = false;
        this.#updating = isUpdating;
        if (isUpdating) {
            this.#status.innerHTML = "";
            this.#status.appendChild(this.#spinnerTemplate.cloneNode(true));
        }
    }
    get updating() {
        return this.#updating;
    }
    set updated(isUpdated) {
        this.#updating = false;
        this.#updated = isUpdated;
        if (isUpdated) {
            this.#status.innerHTML = this.#updatedHTML;
        }
    }
    get updated() {
        return this.#updated;
    }
    set value(value) {
        this.#text.value = value;
    }
    get value() {
        return this.#text.value;
    }
    set updatedHTML(html) {
        this.#updatedHTML = html;
    }
    get updatedHTML() {
        return this.#updatedHTML;
    }
    set function(f) {
        this.#text.removeEventListener("input", this.#function);
        this.#function = debounce(f, 1e3);
        this.#text.addEventListener("input", this.#function);
    }
    get function() {
        return this.#function;
    }
}

customElements.define("cart-text-input", CartTextInput);

class CartGiftWrappingMessage extends HTMLElement {
    #cartTextInput;
    async connectedCallback() {
        this.#cartTextInput = this.querySelector("cart-text-input");
        setTimeout((() => {
            this.#cartTextInput.function = CartGiftWrappingMessage.#updateMessage.bind(this);
        }));
        this.unsubscribe = Cart.subscribe(((state, prevState) => {
            if (state.giftWrapping.messageBeingUpdated) {
                this.#cartTextInput.updating = true;
            } else if (prevState.giftWrapping.messageBeingUpdated) {
                this.#cartTextInput.updated = true;
            }
        }));
    }
    disconnectedCallback() {
        this.unsubscribe();
    }
    static async #updateMessage(e) {
        try {
            await Cart.updateGiftWrappingMessage(e.target.value);
        } catch (error) {
            if (error.name && error.name === "AbortError") return;
            console.log(e);
        }
    }
}

customElements.define("cart-gift-wrapping-message", CartGiftWrappingMessage);

class CartNote extends HTMLElement {
    #cartTextInput;
    connectedCallback() {
        this.#cartTextInput = this.querySelector("cart-text-input");
        setTimeout((() => {
            this.#cartTextInput.function = CartNote.#updateNote.bind(this);
        }));
        this.unsubscribe = Cart.subscribe(((state, prevState) => {
            if (state.noteBeingUpdated) {
                this.#cartTextInput.updating = true;
            } else if (prevState.noteBeingUpdated) {
                this.#cartTextInput.updated = true;
            }
        }));
    }
    disconnectedCallback() {
        this.unsubscribe();
    }
    static async #updateNote(e) {
        try {
            await Cart.updateCartNote(e.target.value);
        } catch (error) {
            if (error.name && error.name === "AbortError") return;
            console.log(e);
        }
    }
}

customElements.define("cart-note", CartNote);

class CartTerms extends HTMLElement {
    #boundInputChange;
    #boundValidateForm;
    connectedCallback() {
        this.form = this.closest("form");
        this.input = this.querySelector('input[type="checkbox"]');
        this.error = this.querySelector("cart-terms-error");
        this.#boundValidateForm = this.#validateForm.bind(this);
        this.#boundInputChange = this.#inputChange.bind(this);
        setTimeout((() => {
            if (Cookies.get("cart_order_terms") === "accepted") {
                this.input.checked = true;
            }
            this.form.addEventListener("submit", this.#boundValidateForm);
            this.input.addEventListener("change", this.#boundInputChange);
        }));
    }
    disconnectedCallback() {
        this.form.removeEventListener("submit", this.#boundValidateForm);
        this.input.removeEventListener("change", this.#boundInputChange);
    }
    #validateForm(e) {
        if (!this.input.checked) {
            e.preventDefault();
            this.#toggleError(true);
        }
    }
    #inputChange({target: {checked: checked}}) {
        if (checked) {
            this.#toggleError(false);
        }
        Cookies.set("cart_order_terms", checked ? "accepted" : "", {
            secure: true,
            SameSite: "None"
        });
    }
    #toggleError(visible = true) {
        if (visible) {
            this.error.removeAttribute("hidden");
            this.error.classList.add("is-active");
        } else {
            this.error.classList.remove("is-active");
            this.error.setAttribute("hidden", "");
        }
    }
}

customElements.define("cart-terms", CartTerms);

class CartNotification extends HTMLElement {
    #imagePlaceholder;
    connectedCallback() {
        this.image = this.querySelector("cart-item-image-container img");
        this.#imagePlaceholder = this.image.cloneNode();
        this.imageContainerRatio = this.querySelector(".cart-item").getAttribute("image-container-ratio").trim();
        this.imageFit = this.querySelector(".cart-item").hasAttribute("image-fit");
        this.item = Cart.getState().latestAddedProduct;
        this.unsubscribe = Cart.subscribe((state => {
            if (state.latestAddedProduct) {
                this.item = state.latestAddedProduct;
                this.#render();
            } else {
                this.item = null;
            }
        }));
    }
    disconnectedCallback() {
        this.unsubscribe();
    }
    #render() {
        if (!this.item) return;
        this.#setImage();
        if (this.imageContainerRatio === "natural") {
            this.image.closest(".o-ratio").style.paddingBottom = `${1 / (this.item.featured_image ? this.item.featured_image.aspect_ratio : 1) * 100}%`;
        } else {
            this.image.closest(".o-ratio").style.paddingBottom = null;
        }
        this.#updateSkeleton();
        this.querySelector("cart-item-title").innerHTML = this.item.product_title;
        const metaItemTemplate = document.getElementById("template-cart-item-meta").content;
        if (this.item.variant_title && !this.item.variant_title.includes("Default")) {
            const defaultProperty = this.querySelector("cart-item-default-property");
            defaultProperty.innerHTML = "";
            defaultProperty.appendChild(metaItemTemplate.cloneNode(true));
            defaultProperty.querySelector("property-value").innerHTML = this.item.variant_title;
        }
        const vendor = this.querySelector("cart-item-vendor");
        if (vendor) {
            vendor.innerHTML = "";
            vendor.appendChild(metaItemTemplate.cloneNode(true));
            vendor.querySelector("property-value").innerHTML = this.item.vendor;
        }
    }
    #setImage(srcsetWidths = [ 120, 240, 360, 480 ]) {
        if (!this.image) return;
        const imageData = this.item.featured_image;
        if (imageData && imageData.url) {
            const {width: width, height: height, url: url} = imageData;
            const imageContainerRatio = this.imageContainerRatio !== "natural" ? this.imageContainerRatio.split(":").reduce(((ratio, value) => ratio !== 0 ? value / ratio : value), 0) : null;
            const aspectRatio = width / height;
            const uncroppedImage = this.imageContainerRatio === "natural" || imageContainerRatio && this.imageFit;
            let masterWidth = width;
            let masterHeight = height;
            if (!uncroppedImage) {
                masterHeight = Math.round(masterWidth * imageContainerRatio);
                if (masterHeight > height) {
                    masterHeight = height;
                    masterWidth = Math.round(masterHeight / imageContainerRatio);
                }
            }
            const srcset = srcsetWidths.reduce(((srcSet, srcWidth) => {
                const srcHeight = Math.round(uncroppedImage ? srcWidth / aspectRatio : srcWidth * imageContainerRatio);
                if (srcWidth > masterWidth || srcHeight > masterHeight) return srcSet;
                return `${srcSet}${url}${url.includes("?") ? "&" : "?"}width=${srcWidth}${!uncroppedImage ? `&height=${srcHeight}&crop=center` : ""} ${srcWidth}w ${srcHeight}h, `;
            }), "");
            const masterSrc = !uncroppedImage ? `${url}${url.includes("?") ? "&" : "?"}width=${masterWidth}&height=${masterHeight}&crop=center` : url;
            this.image.setAttribute("src", masterSrc);
            this.image.setAttribute("srcset", srcset);
            this.image.setAttribute("width", masterWidth);
            this.image.setAttribute("height", masterHeight);
        } else {
            this.image.setAttribute("src", this.#imagePlaceholder.getAttribute("src"));
            this.image.setAttribute("srcset", this.#imagePlaceholder.getAttribute("srcset"));
            this.image.setAttribute("width", this.#imagePlaceholder.getAttribute("width"));
            this.image.setAttribute("height", this.#imagePlaceholder.getAttribute("height"));
        }
        this.image.setAttribute("alt", `Image for ${this.item.title}`);
    }
    #updateSkeleton() {
        if (!this.image) return;
        const skeleton = this.image.nextElementSibling && this.image.nextElementSibling.tagName.toLowerCase() === "image-skeleton" ? this.image.nextElementSibling : null;
        if (skeleton) {
            const svg = skeleton.querySelector("svg");
            const rect = svg.querySelector("rect");
            const width = this.image.getAttribute("width");
            const height = this.image.getAttribute("height");
            skeleton.setAttribute("aria-label", `Loading image for ${this.item.title}`);
            svg.setAttribute("width", width);
            svg.setAttribute("height", height);
            svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
            rect.setAttribute("width", width);
            rect.setAttribute("height", height);
        }
    }
}

customElements.define("cart-notification", CartNotification);

class CartQuantityInfo extends HTMLElement {
    constructor() {
        super();
        this.itemsCount = this.querySelector("items-count");
        this.infoContent = this.querySelector("info-content");
    }
    connectedCallback() {
        this.unsubscribe = Cart.subscribe((state => {
            if (state.cart.item_count > 0) {
                this.removeAttribute("hidden");
                if (state.cart.item_count === 1) {
                    this.infoContent.innerHTML = window.theme.localize("CART_ITEM_SINGULAR");
                } else {
                    this.infoContent.innerHTML = window.theme.localize("CART_ITEM_PLURAL");
                }
            } else {
                this.setAttribute("hidden", "");
            }
            this.itemsCount.innerHTML = state.cart.item_count.toString();
        }));
    }
    disconnectedCallback() {
        this.unsubscribe();
    }
}

customElements.define("cart-quantity-info", CartQuantityInfo);

class CartGiftWrappingBanner extends HTMLElement {
    #boundEnable;
    constructor() {
        super();
        this.#boundEnable = this.#enable.bind(this);
    }
    connectedCallback() {
        this.trigger = this.querySelector("button");
        this.stagedAction = this.querySelector("staged-action");
        const giftWrappingEnabled = Boolean(Cart.getState().cart.attributes["gift-wrapping"] === "false" ? false : Cart.getState().cart.attributes["gift-wrapping"]);
        if (giftWrappingEnabled) {
            this.setAttribute("hidden", "");
        }
        this.unsubscribe = Cart.subscribe((state => {
            const giftWrappingSet = Boolean(state.cart.attributes["gift-wrapping"]);
            if (!giftWrappingSet) {
                this.removeAttribute("hidden");
            }
        }));
        this.trigger.addEventListener("click", this.#boundEnable);
    }
    disconnectedCallback() {
        this.unsubscribe();
        this.trigger.removeEventListener("click", this.#boundEnable);
    }
    async #enable(e) {
        e.preventDefault();
        try {
            if (this.stagedAction) await this.stagedAction.setState("DOING");
            await Cart.setGiftWrapping();
            if (this.stagedAction) await this.stagedAction.setState("DONE");
            this.setAttribute("hidden", "");
        } catch (error) {
            console.log(error);
            if (this.stagedAction) await this.stagedAction.setState("IDLE");
        }
    }
}

customElements.define("cart-gift-wrapping-banner", CartGiftWrappingBanner);

plugins.map((({functions: functions}) => functions)).forEach((pluginFunctions => {
    Object.entries(pluginFunctions).forEach((([componentType, functions]) => {
        if (componentType === "interactive-cart") {
            Object.entries(functions).forEach((([priority, fn]) => {
                InteractiveCart.registerPlugin(priority, fn);
            }));
        }
        if (componentType === "cart-item") {
            Object.entries(functions).forEach((([priority, fn]) => {
                CartItem.registerPlugin(priority, fn);
            }));
        }
    }));
}));

export { CartItem, InteractiveCart };
//# sourceMappingURL=cart-components.js.map
