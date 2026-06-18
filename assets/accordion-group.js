/*! Copyright (c) Safe As Milk. All rights reserved. */
class Accordion {
    #reducedMotionMediaQuery;
    constructor(el) {
        this.#reducedMotionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        this.el = el;
        this.summary = el.querySelector("summary");
        this.content = el.querySelector("details-content");
        this.animation = null;
        this.isClosing = false;
        this.isExpanding = false;
        this.summary.addEventListener("click", (e => this.onClick(e)));
        this.elementToScrollTo = document.getElementById(this.el.dataset.scrollToElementIdOnClose);
    }
    onClick(e) {
        e.preventDefault();
        if (this.el.hasAttribute("non-dismissible")) {
            return;
        }
        if (this.isClosing || !this.el.open) {
            this.open();
        } else if (this.isExpanding || this.el.open) {
            this.shrink();
        }
    }
    shrink() {
        this.el.dispatchEvent(new CustomEvent("on:accordion:closing"));
        this.isClosing = true;
        this.el.classList.add("is-closing");
        this.el.style.overflow = "hidden";
        const startHeight = `${this.el.offsetHeight}px`;
        const endHeight = `${this.summary.offsetHeight}px`;
        if (this.elementToScrollTo) {
            this.elementToScrollTo.scrollIntoView({
                behavior: "smooth"
            });
        }
        if (this.animation) {
            this.animation.cancel();
            this.el.dispatchEvent(new CustomEvent("on:accordion:cancelled"));
        }
        this.animation = this.el.animate({
            height: [ startHeight, endHeight ]
        }, {
            duration: this.#reducedMotionMediaQuery.matches ? 0 : 300,
            easing: "ease-in-out"
        });
        this.animation.onfinish = () => {
            this.onAnimationFinish(false);
            this.el.dispatchEvent(new CustomEvent("on:accordion:closed"));
        };
        this.animation.oncancel = () => {
            this.isClosing = false;
            this.el.classList.remove("is-closing");
        };
    }
    open() {
        this.el.style.overflow = "hidden";
        this.el.style.height = `${this.el.offsetHeight}px`;
        this.el.open = true;
        window.requestAnimationFrame((() => this.expand()));
    }
    expand() {
        this.el.dispatchEvent(new CustomEvent("on:accordion:opening"));
        this.isExpanding = true;
        this.el.classList.add("is-opening");
        const startHeight = `${this.el.offsetHeight}px`;
        const endHeight = `${this.summary.offsetHeight + this.content.offsetHeight}px`;
        if (this.animation) {
            this.animation.cancel();
            this.el.dispatchEvent(new CustomEvent("on:accordion:cancelled"));
        }
        this.animation = this.el.animate({
            height: [ startHeight, endHeight ]
        }, {
            duration: this.#reducedMotionMediaQuery.matches ? 0 : 300,
            easing: "ease-in-out"
        });
        this.animation.onfinish = () => {
            this.onAnimationFinish(true);
            this.el.dispatchEvent(new CustomEvent("on:accordion:opened"));
        };
        this.animation.oncancel = () => {
            this.isExpanding = false;
            this.el.classList.remove("is-opening");
        };
    }
    onAnimationFinish(open) {
        this.el.open = open;
        this.animation = null;
        this.isClosing = false;
        this.el.classList.remove("is-closing");
        this.isExpanding = false;
        this.el.classList.remove("is-opening");
        this.el.style.height = "";
        this.el.style.overflow = "";
    }
}

export { Accordion };

class AccordionGroup extends HTMLElement {
    #alwaysOpen;
    #boundHandleNonDismissible;
    #boundHandleSingleOpen;
    #singleOpen;
    constructor() {
        super();
        this.#boundHandleSingleOpen = this.#handleSingleOpen.bind(this);
        this.#boundHandleNonDismissible = this.#handleNonDismissible.bind(this);
    }
    connectedCallback() {
        this.#singleOpen = this.hasAttribute("single-open");
        this.#alwaysOpen = this.hasAttribute("always-open");
        this.triggers = this.querySelectorAll("summary");
        this.details = this.querySelectorAll("details");
        this.accordions = {};
        if (this.details.length === 0) return;
        this.details.forEach((el => {
            this.accordions[el.id] = new Accordion(el);
        }));
        if (this.#singleOpen) {
            const openAccordions = Array.from(this.querySelectorAll("details[open]"));
            if (openAccordions.length > 0) {
                openAccordions.forEach(((el, index) => {
                    if (index > 0) this.close(el.id);
                }));
            } else {
                this.open(this.details[0].id);
            }
            this.details.forEach((details => {
                details.addEventListener("on:accordion:opening", this.#boundHandleSingleOpen);
            }));
        }
        if (this.#alwaysOpen) {
            let currentlyOpen = this.querySelector("details[open]");
            if (!currentlyOpen) {
                if (this.details.length > 0) {
                    this.open(this.details[0].id);
                    [currentlyOpen] = this.details;
                }
            }
            if (currentlyOpen) {
                currentlyOpen.setAttribute("non-dismissible", "");
            }
            this.details.forEach((details => {
                details.addEventListener("on:accordion:opening", this.#boundHandleNonDismissible);
            }));
        }
        window.addEventListener("DOMContentLoaded", (() => {
            const outsideTriggers = document.querySelectorAll(Array.from(this.details).map((el => `a[href="#${el.id}"]`)).toString());
            outsideTriggers.forEach((trigger => {
                trigger.addEventListener("click", (e => {
                    e.preventDefault();
                    this.open(trigger.getAttribute("href").slice(1));
                    const elementToScrollTo = document.querySelector(trigger.getAttribute("href"));
                    if (elementToScrollTo) {
                        let scrollOffset = 24;
                        const header = document.querySelector(".js-header");
                        if (header && header.classList.contains("js-header-sticky")) {
                            scrollOffset += header.offsetHeight;
                        }
                        const announcement = document.querySelector(".js-section__announcement");
                        if (announcement) {
                            scrollOffset += announcement.offsetHeight;
                        }
                        window.scrollTo({
                            top: elementToScrollTo.offsetTop + scrollOffset,
                            behavior: "smooth"
                        });
                    }
                }));
            }));
        }));
    }
    disconnectedCallback() {
        if (this.#singleOpen || this.#alwaysOpen) {
            this.details.forEach((details => {
                if (this.#singleOpen) details.removeEventListener("on:accordion:opening", this.#boundHandleSingleOpen);
                if (this.#alwaysOpen) details.removeEventListener("on:accordion:opening", this.#boundHandleNonDismissible);
            }));
        }
    }
    open(id) {
        if (this.accordions[id]) {
            this.accordions[id].open();
        }
    }
    close(id) {
        if (this.accordions[id]) {
            this.accordions[id].shrink();
        }
    }
    #handleSingleOpen(e) {
        const {id: id} = e.target.closest("details");
        const currentlyOpen = Array.from(this.querySelectorAll("details[open]"));
        Array.from(currentlyOpen).filter((el => el.id !== id)).forEach((el => {
            this.close(el.id);
        }));
    }
    #handleNonDismissible(e) {
        Array.from(this.querySelectorAll("details[non-dismissible]")).forEach((el => {
            el.removeAttribute("non-dismissible");
        }));
        e.target.setAttribute("non-dismissible", "");
    }
}

customElements.define("accordion-group", AccordionGroup);
//# sourceMappingURL=accordion-group.js.map
