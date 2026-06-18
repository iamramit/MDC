/*! Copyright (c) Safe As Milk. All rights reserved. */
import DetailsDisclosure from "details-disclosure";

class HeaderDetailsDisclosure extends DetailsDisclosure {
    #boundMouseEnterListener;
    #boundMouseLeaveListener;
    #summaryLink;
    constructor() {
        super();
        this.#boundMouseEnterListener = this.mouseEnterListener.bind(this);
        this.#boundMouseLeaveListener = this.mouseLeaveListener.bind(this);
    }
    connectedCallback() {
        this.#summaryLink = this.querySelector("summary > a");
        if (!this.mainDetailsToggle.hasAttribute("open")) this.#disableSummaryLink();
        this.mainDetailsToggle.addEventListener("mouseenter", this.#boundMouseEnterListener);
        this.mainDetailsToggle.addEventListener("mouseleave", this.#boundMouseLeaveListener);
    }
    disconnectedCallback() {
        this.disableListeners();
    }
    open() {
        if (this.mainDetailsToggle.hasAttribute("open")) return;
        this.mainDetailsToggle.setAttribute("open", "");
        this.querySelector("summary").setAttribute("aria-expanded", true);
        if (this.content.getBoundingClientRect().x + this.content.offsetWidth > window.innerWidth - 30) {
            this.content.classList.add("is-left-aligned");
        }
        if (this.hasAttribute("adjust-mega-menu-height")) this.#setContentHeight(36);
    }
    close() {
        if (!this.mainDetailsToggle.hasAttribute("open")) return;
        this.mainDetailsToggle.removeAttribute("open");
        this.mainDetailsToggle.querySelector("summary").setAttribute("aria-expanded", false);
        this.content.classList.remove("is-left-aligned");
        if (this.hasAttribute("adjust-mega-menu-height")) this.#removeContentHeight();
    }
    onToggle() {
        if (!this.panelAnimations) this.panelAnimations = this.content.getAnimations();
        if (!this.contentAnimations) {
            this.contentAnimations = Array.from(this.querySelectorAll(".has-animation")).reduce(((animations, element) => {
                const animation = element.getAnimations();
                return [ ...animations, ...animation ];
            }), []);
        }
        if (this.mainDetailsToggle.hasAttribute("open")) {
            setTimeout((() => {
                this.#enableSummaryLink();
            }), 50);
            this.panelAnimations.forEach((animation => animation.play()));
            this.contentAnimations.forEach((animation => animation.play()));
            document.body.setAttribute("header-menu-open", "");
            if (this.classList.contains("mega")) {
                document.body.setAttribute("header-mega-menu-open", "");
            }
        } else {
            this.#disableSummaryLink();
            this.panelAnimations.forEach((animation => animation.cancel()));
            this.contentAnimations.forEach((animation => animation.cancel()));
            document.body.removeAttribute("header-menu-open", "");
            if (this.classList.contains("mega")) {
                document.body.removeAttribute("header-mega-menu-open", "");
            }
        }
    }
    mouseEnterListener() {
        if (!document.querySelector("body").hasAttribute("header-details-disclosure-edit")) this.open();
    }
    mouseLeaveListener() {
        if (!document.querySelector("body").hasAttribute("header-details-disclosure-edit")) this.close();
    }
    disableListeners() {
        this.mainDetailsToggle.removeEventListener("mouseenter", this.#boundMouseEnterListener);
        this.mainDetailsToggle.removeEventListener("mouseleave", this.#boundMouseLeaveListener);
    }
    #setContentHeight(padding = 0) {
        const headerSection = document.querySelector(".js-header");
        const headerBottomBoundary = headerSection && headerSection.getBoundingClientRect().bottom > 0 ? headerSection.getBoundingClientRect().bottom : 0;
        const combinedPanelCutoff = Math.round(headerBottomBoundary + padding);
        if (this.content.offsetHeight > window.innerHeight - combinedPanelCutoff) {
            this.content.style.setProperty("--header-elements-height", `${combinedPanelCutoff}px`);
            this.content.classList.add("has-height-control");
        }
    }
    #removeContentHeight() {
        this.content.classList.remove("has-height-control");
    }
    #enableSummaryLink() {
        if (this.#summaryLink) {
            this.#summaryLink.removeEventListener("click", HeaderDetailsDisclosure.#summaryLinkListener);
        }
    }
    #disableSummaryLink() {
        if (this.#summaryLink) {
            this.#summaryLink.addEventListener("click", HeaderDetailsDisclosure.#summaryLinkListener);
        }
    }
    static #summaryLinkListener(e) {
        e.preventDefault();
    }
}

customElements.define("header-details-disclosure", HeaderDetailsDisclosure);
//# sourceMappingURL=header-details-disclosure.js.map
