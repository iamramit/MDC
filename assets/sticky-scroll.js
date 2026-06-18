/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce } from "utils";

class StickyScroll extends HTMLElement {
    #ticking;
    #topGap;
    #maxDisplacement;
    #scrollPosition;
    #intersectionObserver;
    #topPosition;
    constructor() {
        super();
        this.#topGap = 18;
        this.#intersectionObserver = null;
    }
    connectedCallback() {
        const scrollListener = () => {
            if (!this.#ticking) {
                window.requestAnimationFrame((() => {
                    this.#setStickyDisplacement();
                    this.#ticking = false;
                }));
                this.#ticking = true;
            }
        };
        const handleIntersection = entries => {
            entries.forEach((entry => {
                if (entry.isIntersecting) {
                    window.addEventListener("scroll", scrollListener);
                } else {
                    window.removeEventListener("scroll", scrollListener);
                }
            }));
        };
        const updateMaxDisplacement = () => {
            const getHeightWithBottomMargin = () => {
                const paddingBottom = Number(window.getComputedStyle(this).getPropertyValue("padding-bottom").replace("px", ""));
                if (!paddingBottom) {
                    this.style.paddingBottom = "1px";
                    const fullHeight = this.offsetHeight - 1;
                    this.style.paddingBottom = null;
                    return fullHeight;
                } else {
                    return this.offsetHeight;
                }
            };
            this.#maxDisplacement = window.innerHeight - getHeightWithBottomMargin() - 18;
        };
        const updateObserver = () => {
            this.#setTopGap();
            if (!this.#topPosition) this.#topPosition = this.#topGap;
            updateMaxDisplacement();
            this.#scrollPosition = window.scrollY;
            this.#setStyles();
            if (window.innerHeight < this.offsetHeight) {
                if (!this.#intersectionObserver) {
                    this.#intersectionObserver = new IntersectionObserver(handleIntersection.bind(this), {
                        rootMargin: "0px"
                    });
                }
                this.#intersectionObserver.observe(this);
                this.classList.add("is-scrollable");
                this.classList.remove("is-not-scrollable");
            } else if (window.innerHeight >= this.offsetHeight && this.#intersectionObserver) {
                this.#intersectionObserver.disconnect();
                window.removeEventListener("scroll", scrollListener);
                this.classList.add("is-not-scrollable");
                this.classList.remove("is-scrollable");
            }
        };
        updateObserver();
        window.addEventListener("resize", debounce(updateObserver, 100));
        const resizeObserver = new ResizeObserver(debounce(updateObserver, 100));
        resizeObserver.observe(this);
    }
    #setTopGap() {
        const header = document.querySelector("header");
        this.#topGap = header.getAttribute("data-sticky-header") === "true" ? header.offsetHeight + 18 : 18;
    }
    #setStyles() {
        this.style.display = "block";
        this.style.position = "sticky";
        this.style.top = `${this.#topPosition}px`;
        this.classList.add("is-not-scrollable");
    }
    #setStickyDisplacement() {
        const stickyElementTop = Number(this.style.top.replace("px", ""));
        if (window.scrollY < this.#scrollPosition) {
            if (stickyElementTop < this.#topGap) {
                const topMath = stickyElementTop + this.#scrollPosition - window.scrollY;
                this.style.top = `${topMath}px`;
                this.#topPosition = topMath;
                if (topMath >= this.#topGap) {
                    this.style.top = `${this.#topGap}px`;
                    this.#topPosition = this.#topGap;
                }
            } else if (stickyElementTop >= this.#topGap) {
                this.style.top = `${this.#topGap}px`;
                this.#topPosition = this.#topGap;
            }
        } else if (stickyElementTop > this.#maxDisplacement) {
            const topMath = stickyElementTop + this.#scrollPosition - window.scrollY;
            this.style.top = `${topMath}px`;
            this.#topPosition = topMath;
            if (topMath <= this.#maxDisplacement) {
                this.style.top = `${this.#maxDisplacement}px`;
                this.#topPosition = this.#maxDisplacement;
            }
        } else if (stickyElementTop <= this.#maxDisplacement) {
            this.style.top = `${this.#maxDisplacement}px`;
            this.#topPosition = this.#maxDisplacement;
        }
        this.#scrollPosition = window.scrollY;
    }
}

customElements.define("sticky-scroll", StickyScroll);
//# sourceMappingURL=sticky-scroll.js.map
