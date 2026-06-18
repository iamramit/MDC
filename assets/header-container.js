/*! Copyright (c) Safe As Milk. All rights reserved. */
class HeaderContainer extends HTMLElement {
    #boundSetScrollStatus;
    #didScroll=false;
    #headerStickyObserver;
    #interval;
    #lastScrollTop=0;
    #sticky=false;
    constructor() {
        super();
        this.#boundSetScrollStatus = this.#setScrollStatus.bind(this);
    }
    connectedCallback() {
        this.#sticky = Boolean(this.dataset.sticky);
        if (this.#sticky) {
            this.#headerStickyObserver = new IntersectionObserver((([e]) => document.body.classList.toggle("header-stuck", !e.isIntersecting)), {
                threshold: [ 1 ]
            });
            this.#headerStickyObserver.observe(this);
            const header = this.querySelector(".js-header");
            if (header?.classList.contains("js-header-scroll")) {
                const navbarHeight = header.getBoundingClientRect().height + 50;
                window.addEventListener("scroll", this.#boundSetScrollStatus);
                this.#interval = setInterval((() => {
                    if (this.#didScroll) {
                        this.#hasScrolled(navbarHeight);
                        this.#setScrollStatus(false);
                    }
                }), 250);
            }
        }
    }
    disconnectedCallback() {
        if (this.#sticky) {
            if (this.#headerStickyObserver) {
                this.#headerStickyObserver.disconnect();
            }
            if (this.#interval) {
                clearInterval(this.#interval);
            }
            window.removeEventListener("scroll", this.#boundSetScrollStatus);
        }
    }
    #setScrollStatus(didScroll = true) {
        this.#didScroll = didScroll;
    }
    #hasScrolled(navbarHeight, delta = 5) {
        const st = window.scrollY;
        if (Math.abs(this.#lastScrollTop - st) <= delta) return;
        if (st > this.#lastScrollTop && st > navbarHeight) {
            document.body.classList.remove("header-down");
            document.body.classList.add("header-up");
            this.dispatchEvent(new CustomEvent("on:header:sticky", {
                detail: {
                    visible: false
                }
            }));
        } else {
            document.body.classList.remove("header-up");
            document.body.classList.add("header-down");
            this.dispatchEvent(new CustomEvent("on:header:sticky", {
                detail: {
                    visible: true
                }
            }));
        }
        this.#lastScrollTop = st;
    }
}

customElements.define("header-container", HeaderContainer);
//# sourceMappingURL=header-container.js.map
