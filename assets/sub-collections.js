/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce } from "utils";

class SubCollections extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.container = this.querySelector("[data-sub-container]");
        this.prev = this.querySelector("[data-sub-prev]");
        this.next = this.querySelector("[data-sub-next]");
        this.prev.addEventListener("click", (() => this.scroll("prev")));
        this.next.addEventListener("click", (() => this.scroll("next")));
        this.container.addEventListener("scroll", debounce(this.updateNavVisibility.bind(this), 50));
        window.addEventListener("resize", debounce(this.updateNavVisibility.bind(this), 50));
        this.updateNavVisibility();
    }
    scroll(direction) {
        const {scrollLeft: scrollLeft, clientWidth: clientWidth} = this.container;
        const left = direction === "prev" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
        this.container.scroll({
            left: left,
            behavior: "smooth"
        });
    }
    updateNavVisibility() {
        const {scrollLeft: scrollLeft, clientWidth: clientWidth, scrollWidth: scrollWidth} = this.container;
        this.prev.style.opacity = scrollLeft === 0 ? "0" : "1";
        this.prev.style.pointerEvents = scrollLeft === 0 ? "none" : "auto";
        this.next.style.opacity = scrollLeft + clientWidth >= scrollWidth ? "0" : "1";
        this.next.style.pointerEvents = scrollLeft + clientWidth >= scrollWidth ? "none" : "auto";
    }
}

customElements.define("sub-collections", SubCollections);
//# sourceMappingURL=sub-collections.js.map
