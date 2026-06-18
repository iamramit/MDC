/*! Copyright (c) Safe As Milk. All rights reserved. */
import Cart from "cart-store";

class CartRecommendations extends HTMLElement {
    async connectedCallback() {
        this.sectionId = this.getAttribute("section-id");
        this.recommendationsAmount = 10;
        this.recommendations = [];
        this.sectionTitle = this.querySelector("cart-recommendations-title");
        this.container = this.querySelector("[cart-recommendations-content]");
        this.itemsScroll = this.querySelector("items-scroll");
        this.intent = this.getAttribute("product-recommendations-type");
        this.cards = Array.from(this.container.children);
        this.unsubscribe = Cart.subscribe(((state, prevState) => {
            const getCartProductsWithoutBeingAdded = (items, productVariantsBeingAdded) => items.reduce(((ids, item) => {
                const id = item.product_id.toString();
                if (productVariantsBeingAdded.includes(item.variant_id.toString())) return ids;
                if (!ids.includes(id)) {
                    ids.push(id);
                }
                return ids;
            }), []);
            const previousFinalCartProductsIds = getCartProductsWithoutBeingAdded(prevState.cart.items, prevState.productVariantsBeingAdded);
            const finalCartProductsIds = getCartProductsWithoutBeingAdded(state.cart.items, state.productVariantsBeingAdded);
            const prepareRecommendations = (recommendationItems, cartProductsIds) => Object.values(recommendationItems).reduce(((recommendations, value) => {
                const weightedRecommendations = value.products.reduce(((uniqueProducts, product, i) => {
                    if (!recommendations.find((r => r.item.id === product.id)) && !cartProductsIds.includes(product.id.toString())) {
                        uniqueProducts.push({
                            weight: (i + 1) / value.weight,
                            item: product
                        });
                    }
                    return uniqueProducts;
                }), []);
                return [ ...recommendations, ...weightedRecommendations ];
            }), []).sort(((a, b) => a.weight - b.weight)).slice(0, this.recommendationsAmount);
            const newRecommendations = prepareRecommendations(state.recommendations.items, finalCartProductsIds);
            const oldRecommendations = prepareRecommendations(prevState.recommendations.items, previousFinalCartProductsIds);
            if (newRecommendations.map((({item: item}) => item.id)).toString() === oldRecommendations.map((({item: item}) => item.id)).toString()) return;
            this.recommendations = newRecommendations;
            this.cards = this.cards.reduce(((newItems, item) => {
                const cardProductId = item.getAttribute("product-id");
                const itemInRecommendations = this.recommendations.find((({item: i}) => i.id.toString() === cardProductId));
                if (!itemInRecommendations) {
                    item.remove();
                    return newItems;
                }
                newItems.push(item);
                return newItems;
            }), []);
            const currentCardsProductIds = this.cards.map((card => card.getAttribute("product-id")));
            const newCards = [];
            this.recommendations.forEach((({item: item}, i) => {
                if (!currentCardsProductIds.includes(item.id.toString())) {
                    const newCard = this.#createCard();
                    if (i === 0) {
                        this.container.prepend(newCard);
                    } else {
                        newCards[i - 1].after(newCard);
                    }
                    newCard.sectionId = this.sectionId;
                    newCard.product = item;
                    newCard.id = `cart-recommendation--${item.id}`;
                    newCards.push(newCard);
                } else {
                    const oldCard = this.cards.find((j => j.getAttribute("product-id") === item.id.toString()));
                    if (currentCardsProductIds.indexOf(oldCard.getAttribute("product-id")) !== i) {
                        if (i === 0) {
                            this.container.prepend(oldCard);
                        } else {
                            newCards[i - 1].after(oldCard);
                        }
                    }
                    newCards.push(oldCard);
                }
            }));
            this.cards = newCards;
            if (this.itemsScroll) this.itemsScroll.smoothScrollItems(0);
            if (this.recommendations.length > 0) {
                this.removeAttribute("hidden");
            } else {
                this.setAttribute("hidden", "");
            }
        }));
        await Cart.enableCartRecommendations(this.intent);
    }
    disconnectedCallback() {
        this.unsubscribe();
    }
    #createCard() {
        const cardTemplate = document.getElementById(`${this.sectionId}--template-cart-recommendations-card`).content;
        const cardFragment = cardTemplate.cloneNode(true);
        const card = cardFragment.children[0];
        return card;
    }
}

customElements.define("cart-recommendations", CartRecommendations);
//# sourceMappingURL=cart-recommendations.js.map
