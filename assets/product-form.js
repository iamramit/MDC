/*! Copyright (c) Safe As Milk. All rights reserved. */
import Cart from "cart-store";

class ProductForm extends HTMLElement {
    #boundSubmit;
    #eventAttached;
    static #formsBeingProcessed=[];
    constructor() {
        super();
        this.#boundSubmit = this.submit.bind(this);
    }
    connectedCallback() {
        this.#eventAttached = false;
        setTimeout((() => {
            this.form = this.querySelector("form");
            this.idInput = this.form.querySelector('input[name="id"]');
            this.submitButton = this.form.elements.add;
            this.stagedAction = this.querySelector("staged-action");
            this.idInput.removeAttribute("disabled");
            this.notifyOnAdd = this.hasAttribute("notify-on-add");
            this.redirectOnAdd = this.getAttribute("redirect-on-add");
            this.#eventAttached = true;
            this.form.addEventListener("submit", this.#boundSubmit);
        }));
    }
    disconnectedCallback() {
        if (this.#eventAttached) {
            this.#eventAttached = false;
            this.form.removeEventListener("submit", this.#boundSubmit);
        }
    }
    async submit(e) {
        e.preventDefault();
        const data = new FormData(e.target);
        const item = Object.fromEntries(data.entries());
        try {
            this.removeError();
            if (this.redirectOnAdd && !ProductForm.#formsBeingProcessed.includes(this.form.id)) {
                ProductForm.#formsBeingProcessed.push(this.form.id);
            }
            if (this.stagedAction) await this.stagedAction.setState("DOING");
            await Cart.add(item);
            if (this.redirectOnAdd) {
                ProductForm.#formsBeingProcessed = ProductForm.#formsBeingProcessed.filter((id => id !== this.form.id));
                if (ProductForm.#formsBeingProcessed.length === 0) {
                    window.location.href = this.redirectOnAdd;
                }
            }
            if (this.stagedAction) await this.stagedAction.setState("DONE");
            const quickShop = this.closest("quick-shop");
            if (quickShop) {
                await quickShop.close();
            }
            if (this.notifyOnAdd) {
                await Cart.resetVariantsBeingAdded();
                if (!this.closest(".modal--cart")) {
                    const cart = document.querySelector(".modal--cart, .popup--cart-notification");
                    if (cart && !cart.shown) {
                        cart.open();
                    } else if (cart && cart.interval) {
                        cart.interval.reset();
                        cart.interval.start();
                    }
                }
            } else {
                await Cart.resetLatestAddedProduct();
                await Cart.resetVariantsBeingAdded(item.id);
            }
        } catch (error) {
            this.#renderError(error.message);
            if (this.stagedAction) await this.stagedAction.setState("IDLE");
            if (this.redirectOnAdd) {
                ProductForm.#formsBeingProcessed = ProductForm.#formsBeingProcessed.filter((id => id !== this.form.id));
            }
        }
    }
    removeError() {
        const error = this.querySelector(".errors");
        if (!error) return;
        error.remove();
    }
    #renderError(message) {
        this.removeError();
        if (this.submitButton) {
            const error = document.createElement("div");
            error.classList.add("errors", "qty-error", "u-small");
            error.innerHTML = message;
            this.submitButton.before(error);
        }
    }
}

customElements.define("product-form", ProductForm);
//# sourceMappingURL=product-form.js.map
