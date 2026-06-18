/*! Copyright (c) Safe As Milk. All rights reserved. */
import Cart from "cart-store";

import { formatMoney } from "utils";

class FreeShippingBar extends HTMLElement {
    #animationInterval=null;
    #boundOrchestrateModalEvent;
    #parentModal;
    #playingAnimation;
    constructor() {
        super();
        this.#boundOrchestrateModalEvent = this.#orchestrateModalEvent.bind(this);
    }
    async connectedCallback() {
        this.amountToSpendElement = this.querySelector("amount-to-spend");
        this.amountLeftElement = this.querySelector("amount-left");
        this.moneyValueLeftElement = this.amountLeftElement.querySelector("money-value");
        this.minimumReachedElement = this.querySelector("minimum-reached");
        this.track = this.querySelector("free-shipping-bar-track");
        this.goalAnimation = null;
        this.#playingAnimation = false;
        this.minimumValue = Number(this.getAttribute("minimum-value"));
        this.value = Number(this.getAttribute("value"));
        this.#parentModal = this.closest("modal-dialog, popup-dialog");
        this.#setVariables();
        this.unsubscribe = Cart.subscribe((state => {
            if (this.value !== state.cart.total_price) {
                this.value = state.cart.total_price;
                this.#update();
            }
            if (this.value >= this.minimumValue) {
                this.track.addEventListener("transitionend", (() => {
                    setTimeout((() => {
                        this.#playGoalAnimation();
                    }), 250);
                }), {
                    once: true
                });
            }
        }));
        this.revealDelay = this.getAttribute("reveal-delay") || 0;
        if (this.#parentModal) {
            this.#parentModal.addEventListener("on:modal:opened", this.#boundOrchestrateModalEvent);
            this.#parentModal.addEventListener("on:modal:closed", this.#boundOrchestrateModalEvent);
        } else {
            const options = {
                rootMargin: "0px",
                threshold: .95
            };
            this.visibilityObserver = new IntersectionObserver((entries => {
                entries.forEach((entry => {
                    setTimeout((() => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add("is-visible");
                            setTimeout((() => {
                                if (this.amountLeft === 0) this.#playGoalAnimation();
                            }), 500);
                            this.visibilityObserver.disconnect();
                        }
                    }), this.revealDelay);
                }));
            }), options);
            this.visibilityObserver.observe(this);
        }
        const goalAnimationElement = this.querySelector("free-shipping-bar-goal-animation");
        if (goalAnimationElement) {
            const {DotLottie: DotLottie} = await import("dotlottie");
            const loadAnimation = () => {
                this.goalAnimation = new DotLottie({
                    canvas: goalAnimationElement.querySelector("canvas"),
                    loop: false,
                    autoplay: false,
                    src: goalAnimationElement.getAttribute("data-url")
                });
            };
            if (this.#parentModal) {
                this.#parentModal.on("on:modal:opening", loadAnimation, {
                    once: true
                });
            } else {
                loadAnimation();
            }
        }
    }
    disconnectedCallback() {
        this.classList.remove("is-visible");
        if (this.visibilityObserver) this.visibilityObserver.disconnect();
        if (this.#parentModal) {
            this.#parentModal.removeEventListener("on:modal:opened", this.#boundOrchestrateModalEvent);
            this.#parentModal.removeEventListener("on:modal:closed", this.#boundOrchestrateModalEvent);
        }
        if (this.unsubscribe) this.unsubscribe();
        if (this.#animationInterval) clearInterval(this.#animationInterval);
    }
    #setVariables() {
        this.amountLeft = this.minimumValue - this.value <= 0 ? 0 : this.minimumValue - this.value;
        this.moneyLeft = formatMoney(this.amountLeft, window.theme.money_format).replace(/[.,]00$/, "");
        this.displacement = Math.round(this.amountLeft / this.minimumValue * 100);
    }
    #update() {
        this.setAttribute("value", this.value);
        this.#setVariables();
        if (this.moneyValueLeftElement) this.moneyValueLeftElement.innerHTML = this.moneyLeft;
        if (this.value > 0) {
            this.amountToSpendElement.setAttribute("hidden", "");
        } else {
            this.amountToSpendElement.removeAttribute("hidden");
        }
        if (this.value === 0 || this.amountLeft === 0) {
            this.amountLeftElement.setAttribute("hidden", "");
        } else {
            this.amountLeftElement.removeAttribute("hidden");
        }
        if (this.amountLeft > 0) {
            this.minimumReachedElement.setAttribute("hidden", "");
        } else {
            this.minimumReachedElement.removeAttribute("hidden");
        }
        this.track.style.setProperty("--displacement", `${this.displacement}%`);
    }
    #playGoalAnimation() {
        const goalAnimationElement = this.querySelector("free-shipping-bar-goal-animation");
        const animationShown = Boolean(localStorage.getItem("freeShippingAnimationShown"));
        if (!goalAnimationElement || animationShown || this.#playingAnimation) return;
        this.#playingAnimation = true;
        this.#animationInterval = setInterval((() => {
            if (this.goalAnimation && this.goalAnimation.isLoaded) {
                clearInterval(this.#animationInterval);
                this.#animationInterval = null;
                const goalAnimationElementCanvas = this.querySelector("free-shipping-bar-goal-animation canvas");
                if (goalAnimationElementCanvas.getAttribute("width") === "0") {
                    goalAnimationElementCanvas.setAttribute("width", 300);
                    goalAnimationElementCanvas.setAttribute("height", 300);
                }
                localStorage.setItem("freeShippingAnimationShown", true);
                this.goalAnimation.play();
            }
        }), 100);
    }
    #orchestrateModalEvent(e) {
        if (e.type === "on:modal:opened") {
            this.classList.add("is-visible");
        } else if (e.type === "on:modal:closed") {
            this.classList.remove("is-visible");
        }
    }
}

customElements.define("free-shipping-bar", FreeShippingBar);
//# sourceMappingURL=cart-free-shipping-bar.js.map
