/*! Copyright (c) Safe As Milk. All rights reserved. */
class ScrollToTarget extends HTMLElement {
    #link;
    connectedCallback() {
        this.#link = this.querySelector("a");
        if (!this.#link) return;
        this.#link.addEventListener("click", ScrollToTarget.#handleLinkClick);
    }
    disconnectedCallback() {
        this.#link.removeEventListener("click", ScrollToTarget.#handleLinkClick);
    }
    static #handleLinkClick(e) {
        e.preventDefault();
        const id = e.target.getAttribute("href");
        const elementToScrollTo = document.querySelector(id);
        if (!elementToScrollTo) return;
        let scrollOffset = 18;
        const header = document.querySelector(".js-header");
        if (header?.classList.contains("js-header-sticky")) {
            scrollOffset = header.getBoundingClientRect().height + 18;
        }
        const y = elementToScrollTo.getBoundingClientRect().top + window.scrollY;
        window.scroll({
            top: y - scrollOffset,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
        });
    }
}

customElements.define("scroll-to-target", ScrollToTarget);
//# sourceMappingURL=scroll-to-target.js.map
