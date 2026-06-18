/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce, StateSwitch } from "utils";

class ItemsScroll extends HTMLElement {
    items;
    scrollBar;
    scrollBarTrack;
    navigationContainer;
    navigationPrevButton;
    navigationNextButton;
    pageNavigationContainer;
    #isScrollBarDragged;
    #boundScrollStart;
    #boundScrollEnd;
    #boundUpdateState;
    #itemsPerPage;
    #controlsListenersEnabled;
    #boundPrevNavigationAction;
    #boundNextNavigationAction;
    #isNavigating=false;
    #scrollPosition=0;
    #navigationStateControlObserver;
    #itemsMutationObserver;
    #resizeObserver;
    #imageContainerRatio;
    #stateSwitch;
    static observedAttributes=[ "scrollable" ];
    constructor() {
        super();
        this.items = this.querySelector("[data-items]");
        this.pageNavigationWrapper = null;
        this.navigationContainer = null;
        this.navigationPrevButton = null;
        this.navigationNextButton = null;
        this.snap = this.getAttribute("snap");
        this.#boundPrevNavigationAction = null;
        this.#boundNextNavigationAction = null;
        this.#controlsListenersEnabled = false;
        this.#navigationStateControlObserver = null;
        this.#itemsMutationObserver = null;
        this.#resizeObserver = null;
        this.#boundScrollStart = this.#handleScrollStart.bind(this);
        this.#boundScrollEnd = this.#handleScrollEnd.bind(this);
        this.#boundUpdateState = this.#updateState.bind(this);
    }
    connectedCallback() {
        if (!this.items) throw Error("Items container missing");
        this.#scrollPosition = this.items.scrollLeft;
        if (this.hasAttribute("breakpoint-min") || this.hasAttribute("breakpoint-max")) {
            this.#stateSwitch = new StateSwitch({
                min: this.getAttribute("breakpoint-min"),
                max: this.getAttribute("breakpoint-max")
            });
            if (this.#stateSwitch.active()) this.setAttribute("scroll-enabled", "");
            this.#stateSwitch.on(this.#boundUpdateState);
        } else {
            this.setAttribute("scroll-enabled", "");
        }
        this.#resizeObserver = new ResizeObserver(debounce((() => {
            this.#updateControls();
        })), 50);
        this.#resizeObserver.observe(this.items);
        if (!this.#navigationStateControlObserver) {
            this.#setUpNavigationStateControl();
        }
        if (!this.#itemsMutationObserver) {
            this.#setUpItemsMutationObserver();
        }
        this.#imageContainerRatio = this.getAttribute("image-container-ratio");
        this.items.addEventListener("scroll", this.#boundScrollStart, {
            once: true
        });
        this.items.addEventListener("scrollend", this.#boundScrollEnd);
    }
    disconnectedCallback() {
        this.items.removeEventListener("scroll", this.#boundScrollStart);
        this.items.removeEventListener("scrollend", this.#boundScrollEnd);
        if (this.#navigationStateControlObserver) {
            this.#navigationStateControlObserver.disconnect();
            this.#navigationStateControlObserver = null;
        }
        if (this.#itemsMutationObserver) {
            this.#itemsMutationObserver.disconnect();
            this.#itemsMutationObserver = null;
        }
        if (this.#resizeObserver) {
            this.#resizeObserver.disconnect();
            this.#resizeObserver = null;
        }
        if (this.#stateSwitch) this.#stateSwitch.off(this.#updateState);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "scrollable" && oldValue !== newValue) {
            this.dispatchEvent(new CustomEvent("on:items-scroll:change-state", {
                detail: {
                    scrollable: this.hasAttribute("scrollable")
                }
            }));
        }
    }
    get isNavigating() {
        return this.#isNavigating;
    }
    get itemAtScroll() {
        return this.#getItemAtScroll();
    }
    get itemsPerPage() {
        return this.#itemsPerPage;
    }
    #getItemAtScroll() {
        const itemsComputedStyle = window.getComputedStyle(this.items);
        const itemsGap = Number(itemsComputedStyle.getPropertyValue("column-gap").replace("px", ""));
        const itemComputedStyle = window.getComputedStyle(this.items.firstElementChild);
        const itemMarginLeft = Number(itemComputedStyle.getPropertyValue("margin-left").replace("px", ""));
        const itemMarginRight = Number(itemComputedStyle.getPropertyValue("margin-right").replace("px", ""));
        const itemAtScroll = Array.from(this.items.children)[Math.round(this.items.scrollLeft / (itemMarginLeft + this.items.firstElementChild.getBoundingClientRect().width + itemMarginRight + itemsGap))];
        return itemAtScroll;
    }
    #createNavigation() {
        const navigationContainer = document.createElement("div");
        navigationContainer.classList.add("navigation");
        navigationContainer.innerHTML = `\n      <button type="button" class="navigation__button navigation__button--prev" data-navigation-prev aria-label="Previous page"></button>\n      <button type="button" class="navigation__button navigation__button--next" data-navigation-next aria-label="Next page"></button>\n    `;
        this.appendChild(navigationContainer);
        this.navigationContainer = navigationContainer;
        this.navigationPrevButton = navigationContainer.querySelector("[data-navigation-prev]");
        this.navigationNextButton = navigationContainer.querySelector("[data-navigation-next]");
        const arrowPreviousSVG = document.getElementById("template-icon-chevron").content.cloneNode(true).firstElementChild;
        arrowPreviousSVG.classList.add("icon--left");
        this.navigationPrevButton.append(arrowPreviousSVG);
        const arrowNextSVG = document.getElementById("template-icon-chevron").content.cloneNode(true).firstElementChild;
        this.navigationNextButton.append(arrowNextSVG);
    }
    #handlePrevNavigationAction(e) {
        e.preventDefault();
        if (this.#isNavigating) return;
        const itemAtScroll = this.#getItemAtScroll();
        const previousItem = itemAtScroll.previousElementSibling;
        if (previousItem) {
            this.smoothScrollItems(previousItem.offsetLeft);
        }
    }
    #handleNextNavigationAction(e) {
        e.preventDefault();
        if (this.#isNavigating) return;
        const itemAtScroll = this.#getItemAtScroll();
        const nextItem = itemAtScroll.nextElementSibling;
        if (nextItem) {
            this.smoothScrollItems(nextItem.offsetLeft);
        }
    }
    #handleScrollStart() {
        const position = this.items.scrollLeft;
        const direction = position > this.#scrollPosition ? "FORWARD" : "BACKWARD";
        this.#isNavigating = true;
        this.classList.add("is-scrolling");
        this.dispatchEvent(new CustomEvent("on:items-scroll:scroll-start", {
            detail: {
                direction: direction
            }
        }));
    }
    #handleScrollEnd() {
        const position = this.items.scrollLeft;
        const direction = position > this.#scrollPosition ? "FORWARD" : "BACKWARD";
        this.#isNavigating = false;
        this.classList.remove("is-scrolling");
        this.dispatchEvent(new CustomEvent("on:items-scroll:scroll-end", {
            detail: {
                direction: direction,
                position: position
            }
        }));
        this.#scrollPosition = position;
        this.items.addEventListener("scroll", this.#boundScrollStart, {
            once: true
        });
    }
    #enableControlsListeners() {
        if (this.#controlsListenersEnabled) return;
        this.#boundPrevNavigationAction = this.#handlePrevNavigationAction.bind(this);
        this.#boundNextNavigationAction = this.#handleNextNavigationAction.bind(this);
        this.navigationPrevButton.addEventListener("click", this.#boundPrevNavigationAction);
        this.navigationNextButton.addEventListener("click", this.#boundNextNavigationAction);
        this.#controlsListenersEnabled = true;
    }
    #disableControlsListeners() {
        if (!this.#controlsListenersEnabled) return;
        this.navigationPrevButton.removeEventListener("click", this.#boundPrevNavigationAction);
        this.navigationNextButton.removeEventListener("click", this.#boundNextNavigationAction);
        this.#controlsListenersEnabled = false;
    }
    #updateState(e) {
        this.toggleAttribute("scroll-enabled", e.matches);
    }
    #updateControls() {
        const getNavigationRatio = (imageContainerRatio, itemsPerPage) => {
            const [imageContainerWidth, imageContainerHeight] = imageContainerRatio.split(":").map((string => Number(string)));
            const gap = Number(window.getComputedStyle(this.items).getPropertyValue("column-gap").replace("px", "") || 0);
            const findGcd = (a, b) => b ? findGcd(b, a % b) : a;
            const gcd = findGcd(imageContainerHeight, Math.round(this.items.offsetHeight));
            return `${imageContainerWidth * itemsPerPage * Math.round(this.items.offsetHeight) / gcd + gap * (itemsPerPage - 1) * imageContainerHeight / gcd} / ${imageContainerHeight * Math.round(this.items.offsetHeight) / gcd}`;
        };
        if (this.items.children.length > 0) {
            const itemsPerPage = Math.floor(this.items.offsetWidth / this.items.children[0].offsetWidth);
            if (itemsPerPage) this.#itemsPerPage = itemsPerPage;
        }
        if (this.hasAttribute("scroll-enabled") && this.items.scrollWidth > this.items.offsetWidth + 10) {
            this.setAttribute("scrollable", "");
            this.items.setAttribute("tabindex", "0");
            if (!this.navigationContainer) this.#createNavigation();
            if (!this.snap) {
                if (this.items.children.length > 0 && this.items.children[0].offsetWidth > this.items.offsetWidth / 2) {
                    this.setAttribute("snap", "center");
                } else {
                    this.setAttribute("snap", "start");
                }
            }
            this.#enableControlsListeners();
        } else {
            if (this.navigationContainer) {
                this.#disableControlsListeners();
            }
            this.removeAttribute("scrollable", "");
            this.items.setAttribute("tabindex", "-1");
        }
        if (this.#imageContainerRatio && this.#imageContainerRatio.toLowerCase() !== "natural") {
            this.style.setProperty("--navigation-ratio", getNavigationRatio(this.#imageContainerRatio, this.#itemsPerPage));
        }
        if (this.items.classList.contains("grid-layout")) {
            if (this.items.children.length < this.#itemsPerPage) {
                this.items.classList.add("grid-layout--align-center");
            } else {
                this.items.classList.remove("grid-layout--align-center");
            }
        }
    }
    #setUpItemsMutationObserver() {
        const config = {
            attributes: false,
            childList: true,
            subtree: false
        };
        this.#itemsMutationObserver = new MutationObserver((mutationList => {
            mutationList.forEach((mutation => {
                if (mutation.type === "childList") {
                    this.#updateControls();
                    this.#setUpNavigationStateControl();
                }
            }));
        }));
        this.#itemsMutationObserver.observe(this.items, config);
    }
    #setUpNavigationStateControl() {
        if (!this.items.firstElementChild) return;
        const options = {
            root: this.items,
            rootMargin: "0px",
            threshold: .75
        };
        if (this.#navigationStateControlObserver) this.#navigationStateControlObserver.disconnect();
        this.#navigationStateControlObserver = new IntersectionObserver((entries => {
            if (this.navigationContainer) {
                entries.forEach((({target: target, isIntersecting: isIntersecting}) => {
                    if (!target.previousElementSibling) this.navigationPrevButton.disabled = isIntersecting;
                    if (!target.nextElementSibling) this.navigationNextButton.disabled = isIntersecting;
                }));
            }
        }), options);
        this.#navigationStateControlObserver.observe(this.items.firstElementChild);
        this.#navigationStateControlObserver.observe(this.items.lastElementChild);
    }
    smoothScrollItems(position) {
        return new Promise(((resolve, reject) => {
            let same = 0;
            let lastPos = null;
            const check = () => {
                const newPos = this.items.scrollLeft;
                if (this.#isScrollBarDragged) return reject(newPos);
                if (newPos === lastPos) {
                    same += 1;
                    if (same > 2) {
                        return resolve(position);
                    }
                } else {
                    same = 0;
                    lastPos = newPos;
                }
                window.requestAnimationFrame(check);
                return null;
            };
            this.items.scrollTo({
                left: position,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
            });
            window.requestAnimationFrame(check);
        }));
    }
}

customElements.define("items-scroll", ItemsScroll);

export default ItemsScroll;
//# sourceMappingURL=items-scroll.js.map
