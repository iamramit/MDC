/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce } from "utils";

import ItemsScroll from "items-scroll";

class ItemsScrollPagedNavigation extends ItemsScroll {
    #boundItemsScroll;
    #boundHandleStateChange;
    #boundPageNavigationClick;
    #controlsListenersEnabled=false;
    #itemAtScrollIndex;
    #navigationPagesAmount;
    #resizeObserver;
    #ticking=false;
    constructor() {
        super();
        this.pageNavigationWrapper = null;
        this.navigationCounterOnly = this.hasAttribute("mobile-counter-only");
        this.navigationCounterSeparator = "/";
        this.navigationCounterShowForPagesAmount = 7;
        this.navigationCounterShowUpToContainerSize = 768;
        this.#boundItemsScroll = this.#handleItemsScroll.bind(this);
        this.#boundHandleStateChange = this.#handleStateChange.bind(this);
        this.#boundPageNavigationClick = this.#handlePageNavigationClick.bind(this);
    }
    connectedCallback() {
        super.connectedCallback();
        this.#setPageNavigationState();
        this.#resizeObserver = new ResizeObserver(debounce((() => {
            this.#updatePageNavigationList();
        })), 50);
        this.#resizeObserver.observe(this.items);
        this.addEventListener("on:items-scroll:change-state", this.#boundHandleStateChange);
        if (this.pageNavigationContainer) this.pageNavigationContainer.addEventListener("click", this.#handlePageNavigationClick.bind(this));
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener("on:items-scroll:change-state", this.#boundHandleStateChange);
        if (this.#resizeObserver) {
            this.#resizeObserver.disconnect();
            this.#resizeObserver = null;
        }
        this.#disableControlsListeners();
    }
    #enableControlsListeners() {
        if (this.#controlsListenersEnabled) return;
        this.items.addEventListener("scroll", this.#boundItemsScroll);
        if (this.pageNavigationContainer) this.pageNavigationContainer.addEventListener("click", this.#boundPageNavigationClick);
        this.#controlsListenersEnabled = true;
    }
    #disableControlsListeners() {
        if (!this.#controlsListenersEnabled) return;
        this.items.removeEventListener("scroll", this.#boundItemsScroll);
        if (this.pageNavigationContainer) this.pageNavigationContainer.removeEventListener("click", this.#boundPageNavigationClick);
        this.#controlsListenersEnabled = false;
    }
    #updatePageNavigationList() {
        if (!this.pageNavigationWrapper) {
            this.pageNavigationWrapper = document.createElement("div");
            this.pageNavigationWrapper.classList.add("page-navigation-wrapper");
            this.appendChild(this.pageNavigationWrapper);
        }
        const pagesAmount = Math.ceil(this.items.children.length / this.itemsPerPage);
        if (pagesAmount !== this.#navigationPagesAmount) {
            this.#navigationPagesAmount = pagesAmount;
            if (this.navigationCounterShowUpToContainerSize && this.navigationCounterShowUpToContainerSize >= this.offsetWidth && this.navigationCounterShowForPagesAmount && (this.navigationCounterOnly || this.#navigationPagesAmount >= this.navigationCounterShowForPagesAmount)) {
                if (this.pageNavigationContainer) this.pageNavigationContainer.setAttribute("hidden", true);
                if (!this.pageNavigationCounter) {
                    this.pageNavigationCounter = document.createElement("div");
                    this.pageNavigationCounter.classList.add("page-navigation-counter");
                    this.pageNavigationWrapper.appendChild(this.pageNavigationCounter);
                }
                this.pageNavigationCounter.removeAttribute("hidden");
                this.pageNavigationCounter.innerHTML = `\n          <span class="page-navigation-counter__current">${this.#itemAtScrollIndex || 1}</span>\n          <span class="page-navigation-counter__separator">${this.navigationCounterSeparator}</span>\n          <span class="page-navigation-counter__total">${this.#navigationPagesAmount}</span>\n        `;
                this.#setPageNavigationState();
            } else {
                if (this.pageNavigationCounter) this.pageNavigationCounter.setAttribute("hidden", true);
                if (!this.pageNavigationContainer) {
                    this.pageNavigationContainer = document.createElement("ul");
                    this.pageNavigationContainer.classList.add("page-navigation");
                    this.pageNavigationContainer.setAttribute("role", "tablist");
                    this.pageNavigationWrapper.appendChild(this.pageNavigationContainer);
                }
                this.pageNavigationContainer.removeAttribute("hidden");
                if (this.#navigationPagesAmount > 1) {
                    this.pageNavigationContainer.innerHTML = `\n            ${Array.from({
                        length: pagesAmount
                    }, ((_, i) => `\n              <li class="page-navigation__item" role="presentation">\n                <button type="button" role="tab" class="page-navigation__button" data-page="${i + 1}" aria-label="Scroll to page ${i + 1} of ${this.#navigationPagesAmount}" tabindex="-1">\n                  <span class="visually-hidden">${i + 1}</span>\n                </button>\n              </li>\n            `)).join("\n")}\n          `;
                    this.#setPageNavigationState();
                } else {
                    this.pageNavigationContainer.innerHTML = "";
                }
            }
        }
    }
    #handleStateChange({detail: {scrollable: scrollable}}) {
        if (scrollable) {
            this.#updatePageNavigationList();
            this.#enableControlsListeners();
        } else if (this.pageNavigationContainer) {
            this.#disableControlsListeners();
        }
    }
    #handlePageNavigationClick(e) {
        const {target: target} = e;
        if (!target.classList.contains("page-navigation__button")) return;
        const page = Number(target.dataset.page);
        this.#moveItems(this.items.children[this.itemsPerPage * (page - 1)].offsetLeft, "smooth");
    }
    #setPageNavigationState() {
        if (this.pageNavigationDisabled) return;
        if (!this.#navigationPagesAmount || !this.#navigationPagesAmount > 1) return;
        const {itemAtScroll: itemAtScroll} = this;
        const itemAtScrollIndex = [ ...this.items.children ].indexOf(itemAtScroll);
        this.#itemAtScrollIndex = itemAtScrollIndex;
        const currentNavigationPageIndex = this.#itemAtScrollIndex + this.itemsPerPage > this.items.children.length - 1 ? this.#navigationPagesAmount - 1 : Math.floor(itemAtScrollIndex / this.itemsPerPage);
        if (this.pageNavigationContainer) {
            if (this.pageNavigationContainer.querySelector(".is-active")) {
                this.pageNavigationContainer.querySelector(".is-active").classList.remove("is-active");
            }
            if (this.pageNavigationContainer.children[currentNavigationPageIndex]) this.pageNavigationContainer.children[currentNavigationPageIndex].querySelector("button").classList.add("is-active");
        }
        if (this.pageNavigationCounter) {
            const pageNavigationCounterCurrentElement = this.pageNavigationCounter.querySelector(".page-navigation-counter__current");
            this.pageNavigationCounter.setAttribute("aria-label", `Page ${currentNavigationPageIndex + 1} of ${this.#navigationPagesAmount}`);
            if (pageNavigationCounterCurrentElement) {
                pageNavigationCounterCurrentElement.innerHTML = currentNavigationPageIndex + 1;
            }
        }
    }
    #handleItemsScroll() {
        if (this.pageNavigationDisabled) return;
        if (!this.#ticking) {
            window.requestAnimationFrame((() => {
                this.#setPageNavigationState();
                this.#ticking = false;
            }));
            this.#ticking = true;
        }
    }
    #moveItems(position, behavior = "instant") {
        let itemsScrollX = position;
        if (itemsScrollX < 0) {
            itemsScrollX = 0;
        } else if (itemsScrollX > this.items.scrollWidth - this.items.offsetWidth) {
            itemsScrollX = this.items.scrollWidth - this.items.offsetWidth;
        }
        if (behavior === "instant") {
            this.items.scrollTo({
                behavior: "instant",
                left: itemsScrollX
            });
        } else {
            this.smoothScrollItems(itemsScrollX);
        }
    }
}

customElements.define("items-scroll-paged-navigation", ItemsScrollPagedNavigation);
//# sourceMappingURL=items-scroll-paged-navigation.js.map
