/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce } from "utils";

class ScrollingLogos extends HTMLElement {
    #debouncedUpdateMarqueeSettings;
    #debouncedMouseEnter;
    #debouncedMouseLeave;
    constructor() {
        super();
        this.#debouncedUpdateMarqueeSettings = debounce(this.#updateMarqueeSettings.bind(this), 50);
        this.#debouncedMouseEnter = debounce((() => this.stop()), 100);
        this.#debouncedMouseLeave = debounce((() => this.start()), 100);
    }
    connectedCallback() {
        this.marqueeContent = this.querySelector(".scrolling-logos__track");
        this.marqueeElements = Array.from(this.querySelectorAll(".scrolling-logos__item"));
        this.scrollSpeed = parseFloat(this.dataset.scrollSpeed);
        this.resizeObserver = new ResizeObserver(this.#debouncedUpdateMarqueeSettings);
        this.resizeObserver.observe(this);
        this.#debouncedUpdateMarqueeSettings();
        this.#setupSectionObserver();
        if (this.dataset.scrollStyle === "auto_hover_pause") {
            this.addEventListener("pointerenter", this.#debouncedMouseEnter);
            this.addEventListener("pointerleave", this.#debouncedMouseLeave);
        }
    }
    disconnectedCallback() {
        if (this.resizeObserver) this.resizeObserver.unobserve(this);
        if (this.sectionObserver) this.sectionObserver.disconnect();
        if (this.dataset.scrollStyle === "auto_hover_pause") {
            this.removeEventListener("pointerenter", this.#debouncedMouseEnter);
            this.removeEventListener("pointerleave", this.#debouncedMouseLeave);
        }
    }
    setAnimationState(state, eventName) {
        if (this.marqueeContent.style.animationPlayState !== state) {
            this.marqueeContent.style.animationPlayState = state;
            this.dispatchEvent(new CustomEvent(`on:scrolling-logos:${eventName}`));
        }
    }
    start() {
        this.setAnimationState("running", "start");
    }
    stop() {
        this.setAnimationState("paused", "stop");
    }
    #updateMarqueeSettings() {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const styles = getComputedStyle(this);
        const sizeProp = isMobile ? "--scrolling-logo-size-mob" : "--scrolling-logo-size-desk";
        const spacingProp = isMobile ? "--scrolling-logo-spacing-mob" : "--scrolling-logo-spacing-desk";
        const logoSize = parseFloat(styles.getPropertyValue(sizeProp));
        const logoSizeModifier = isMobile ? .35 : 1;
        const logosDisplayed = (14 - logoSize) * logoSizeModifier;
        const spacingSize = parseFloat(styles.getPropertyValue(spacingProp));
        const spacingSizeModifier = isMobile ? 2 : 1;
        const gapSize = spacingSize * spacingSizeModifier;
        const logosAdded = this.marqueeElements.length;
        const gapValuePx = gapSize / 100 * window.innerWidth;
        const currentDisplayed = parseFloat(this.style.getPropertyValue("--scrolling-logo-elements-displayed"));
        const currentElements = parseFloat(this.style.getPropertyValue("--scrolling-logo-elements"));
        const currentGap = parseFloat(this.style.getPropertyValue("--scrolling-logo-gap"));
        if (currentDisplayed !== logosDisplayed) {
            this.style.setProperty("--scrolling-logo-elements-displayed", logosDisplayed);
        }
        if (currentElements !== logosAdded) {
            this.style.setProperty("--scrolling-logo-elements", logosAdded);
        }
        if (currentGap !== gapSize) {
            this.style.setProperty("--scrolling-logo-gap", `${gapSize}vw`);
        }
        this.#cloneElements(logosDisplayed);
        this.#updateScrollSpeed(gapValuePx);
    }
    #cloneElements(logosDisplayed) {
        const {marqueeContent: marqueeContent, marqueeElements: marqueeElements} = this;
        const fragment = document.createDocumentFragment();
        if (this.lastDisplayedCount === logosDisplayed) return;
        if (!this.clonePool) {
            this.clonePool = marqueeElements.map((el => el.cloneNode(true)));
        }
        while (marqueeContent.children.length > marqueeElements.length) {
            marqueeContent.removeChild(marqueeContent.lastChild);
        }
        const totalClones = Math.max(logosDisplayed, this.clonePool.length);
        for (let i = 0; i < totalClones; i += 1) {
            const clone = this.clonePool[i % this.clonePool.length].cloneNode(true);
            fragment.appendChild(clone);
        }
        marqueeContent.appendChild(fragment);
        this.lastDisplayedCount = logosDisplayed;
    }
    #updateScrollSpeed(gapValuePx) {
        const speedModifier = this.isMobile ? 15 : 20;
        const speed = this.scrollSpeed * speedModifier;
        const totalWidth = this.marqueeElements.reduce(((acc, element) => acc + element.offsetWidth + gapValuePx), 0);
        const animationDuration = totalWidth / speed;
        this.style.setProperty("--scroll-duration", `${animationDuration}s`);
    }
    #setupSectionObserver() {
        const options = {
            root: null,
            rootMargin: "0px",
            threshold: 0
        };
        this.sectionObserver = new IntersectionObserver((entries => {
            entries.forEach((entry => {
                if (entry.isIntersecting) {
                    this.start();
                    this.#loadImagesEagerly();
                } else {
                    this.stop();
                }
            }));
        }), options);
        this.sectionObserver.observe(this);
    }
    #loadImagesEagerly() {
        this.marqueeContent.querySelectorAll("img").forEach((image => {
            const img = image;
            img.setAttribute("loading", "eager");
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
            }
        }));
    }
}

customElements.define("scrolling-logos", ScrollingLogos);
//# sourceMappingURL=scrolling-logos.js.map
