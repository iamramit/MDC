/*! Copyright (c) Safe As Milk. All rights reserved. */
import PageAnimations, { Animations } from "animations";

class ProductRecommendations extends HTMLElement {
    constructor() {
        super();
        this.fetch_delay = 0;
    }
    connectedCallback() {
        this.onPageLoad = this.hasAttribute("on-page-load");
        if (this.onPageLoad) {
            this.#loadRecommendations();
        } else {
            const handleIntersection = (entries, observer) => {
                entries.forEach((entry => {
                    if (entry.isIntersecting) {
                        observer.unobserve(this);
                        this.fetch_delay = Number(window.theme?.complementary_products_fetch_delay || "0");
                        setTimeout((() => {
                            this.#loadRecommendations();
                        }), this.fetch_delay);
                    }
                }));
            };
            new IntersectionObserver(handleIntersection.bind(this), {
                rootMargin: "0px 0px 400px 0px"
            }).observe(this);
        }
    }
    #loadRecommendations() {
        fetch(this.dataset.url).then((response => response.text())).then((text => {
            const html = document.createElement("div");
            html.innerHTML = text;
            const recommendations = html.querySelector("product-recommendations");
            if (recommendations && recommendations.innerHTML.trim().length) {
                const existingContentCards = this.querySelectorAll(".product-card");
                const newContentCards = Array.from(recommendations.querySelectorAll(".product-card"));
                if (existingContentCards.length === 0 && newContentCards.length === 0) {
                    this.setAttribute("hidden", "");
                } else {
                    this.removeAttribute("hidden");
                }
                if (existingContentCards.length > 0) {
                    const imageSkeletons = recommendations.querySelectorAll("image-skeleton");
                    const elementToReveal = recommendations.querySelector(".js-animate-sequence");
                    imageSkeletons.forEach((el => el.setAttribute("loaded", "")));
                    Animations.setRevealedState(elementToReveal);
                }
                if (newContentCards.length > 0 && newContentCards.length > 0 && existingContentCards.length === newContentCards.length) {
                    existingContentCards.forEach(((card, i) => {
                        const newLink = newContentCards[i].querySelector("[product-card-link]").getAttribute("href");
                        card.querySelectorAll("[product-card-link]").forEach((link => link.setAttribute("href", newLink)));
                    }));
                } else {
                    this.innerHTML = recommendations.innerHTML;
                    PageAnimations.setup(this);
                }
                if (this.dataset.quickShopDynamicCheckout === "true") {
                    const shopifyPaymentButtonInterval = setInterval((() => {
                        if (window.Shopify.PaymentButton) {
                            window.Shopify.PaymentButton.init();
                            clearInterval(shopifyPaymentButtonInterval);
                        }
                    }), 50);
                }
            } else {
                this.setAttribute("hidden", "");
            }
        })).catch((e => {
            console.error(e);
        }));
    }
}

customElements.define("product-recommendations", ProductRecommendations);
//# sourceMappingURL=product-recommendations.js.map
