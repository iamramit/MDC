/*! Copyright (c) Safe As Milk. All rights reserved. */
import Cart from "cart-store";

class CartLink extends HTMLElement {
    constructor() {
        super();
        this.itemsCount = this.querySelector("items-count");
    }
    connectedCallback() {
        this.unsubscribe = Cart.subscribe((state => {
            this.itemsCount.innerHTML = state.cart.item_count.toString();
        }));
    }
    disconnectedCallback() {
        this.unsubscribe();
    }
}

customElements.define("cart-link", CartLink);
//# sourceMappingURL=cart-link.js.map
