/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce } from "utils";

class AnnouncementBar extends HTMLElement {
    #boundPopupListener;
    constructor() {
        super();
        this.#boundPopupListener = this.#popupListener.bind(this);
    }
    connectedCallback() {
        this.id = this.getAttribute("id");
        this.isDismissible = this.hasAttribute("dismissible");
        this.isStatic = this.hasAttribute("static");
        this.interactions = true;
        this.autoplay = this.hasAttribute("autoplay");
        this.autoplayDelay = Number(this.getAttribute("autoplay-delay") || "5000");
        this.wrapper = this.querySelector(".announcement__bg");
        this.carouselContainer = this.querySelector(".announcement__container");
        this.carouselWrapper = this.querySelector(".announcement__wrapper");
        this.carouselSlides = this.querySelectorAll(".announcement__slides");
        this.popups = this.querySelectorAll("popup-dialog");
        this.currentSlide = 0;
        this.autoplayInterval = null;
        if (this.carouselSlides.length > 1) this.#createNavigation();
        this.intersectionObserver = new IntersectionObserver(this.handleIntersection.bind(this));
        this.textSizeObserver = new ResizeObserver(debounce((() => {
            this.#setMaxContainerWidth();
        })), 50);
        this.mutationObserver = new MutationObserver((() => {
            this.handleWindowResize();
        }));
        if (this.isDismissible) this.#setUpDismissible();
        this.handleWindowResize();
        window.addEventListener("resize", (() => {
            this.handleWindowResize();
        }));
        this.observeMutations();
        this.setAttribute("loaded", "");
        this.carouselSlides[this.currentSlide].dataset.active = true;
        if (this.autoplay) {
            this.startAutoplay();
            this.carouselContainer.addEventListener("mouseenter", (() => this.stopAutoplay()));
            this.carouselContainer.addEventListener("mouseleave", (() => {
                if (this.hasAttribute("popup-open")) return;
                this.startAutoplay();
            }));
        }
        this.observeSlides();
        this.observeSlidesText();
        if (this.popups.length > 0) {
            this.popups.forEach((popup => {
                popup.on("on:popup:opening", this.#boundPopupListener).on("on:popup:closed", this.#boundPopupListener);
            }));
        }
    }
    observeMutations() {
        this.mutationObserver.observe(this.carouselWrapper, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    observeSlides() {
        this.carouselSlides.forEach((slide => {
            this.intersectionObserver.observe(slide);
        }));
    }
    observeSlidesText() {
        Array.from(this.querySelectorAll(".announcement__text")).forEach((text => {
            this.textSizeObserver.observe(text);
        }));
    }
    handleWindowResize() {
        const desktopView = window.innerWidth > 767;
        this.#calculateSlidesWidth();
        if (this.isStatic) {
            if (desktopView && !this.slidesWrap) {
                this.staticDisplay = true;
            } else {
                this.staticDisplay = false;
            }
        } else {
            this.staticDisplay = false;
        }
        this.#toggleClassBasedOnScreenSize();
        this.#setMaxContainerWidth();
    }
    handleScroll() {
        const slideWidth = this.carouselSlides[0].getBoundingClientRect().width;
        this.currentSlide = Math.round(this.carouselWrapper.scrollLeft / slideWidth);
        this.carouselSlides.forEach(((slide, index) => {
            if (index === this.currentSlide) {
                slide.setAttribute("data-active", "");
            } else {
                slide.removeAttribute("data-active");
            }
        }));
    }
    handleIntersection(entries) {
        entries.forEach((entry => {
            if (entry.isIntersecting) {
                this.carouselWrapper.addEventListener("scroll", (() => this.handleScroll()));
            } else {
                this.carouselWrapper.removeEventListener("scroll", (() => this.handleScroll()));
            }
        }));
    }
    disconnectedCallback() {
        if (!this.staticDisplay) {
            this.stopAutoplay();
            this.carouselPrevBtn?.removeEventListener("click", this.showPrevSlide);
            this.carouselNextBtn?.removeEventListener("click", this.showNextSlide);
            this.carouselContainer.removeEventListener("mouseenter", this.stopAutoplay);
            this.carouselContainer.removeEventListener("mouseleave", this.startAutoplay);
            this.intersectionObserver.disconnect();
            this.textSizeObserver.disconnect();
        }
        this.mutationObserver.disconnect();
        window.removeEventListener("resize", this.handleWindowResize);
        this.removeAttribute("loaded");
        if (this.popups.length > 0) {
            this.popups.forEach((popup => {
                popup.off("on:popup:opening", this.#boundPopupListener).off("on:popup:closed", this.#boundPopupListener);
            }));
        }
    }
    showPrevSlide() {
        if (this.currentSlide === 0) {
            this.moveToSlide(this.carouselSlides.length - 1);
        } else {
            this.moveToSlide(this.currentSlide - 1);
        }
        this.dispatchEvent(new CustomEvent("on:announcement-bar:slide-change", {
            detail: {
                currentSlide: this.currentSlide
            }
        }));
    }
    showNextSlide() {
        if (this.currentSlide === this.carouselSlides.length - 1) {
            this.moveToSlide(0);
        } else {
            this.moveToSlide(this.currentSlide + 1);
        }
        this.dispatchEvent(new CustomEvent("on:announcement-bar:slide-change", {
            detail: {
                currentSlide: this.currentSlide
            }
        }));
    }
    startAutoplay() {
        if (!this.interactions) return;
        if (this.autoplayInterval === null) {
            this.setAttribute("scrolling", "");
            this.autoplayInterval = setInterval((() => {
                this.showNextSlide();
            }), this.autoplayDelay);
        }
    }
    stopAutoplay() {
        if (!this.interactions) return;
        if (this.autoplayInterval !== null) {
            this.removeAttribute("scrolling");
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }
    moveToSlide(slideIndex, behavior = "smooth") {
        this.carouselWrapper.scrollTo({
            left: this.carouselSlides[slideIndex].offsetLeft,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : behavior
        });
        this.currentSlide = slideIndex;
        this.carouselSlides.forEach(((slide, index) => {
            if (index === this.currentSlide) {
                slide.setAttribute("data-active", "");
            } else {
                slide.removeAttribute("data-active");
            }
        }));
    }
    moveToSlideById(slideId, behavior = "smooth") {
        const slideToScrollTo = document.getElementById(slideId);
        if (!slideToScrollTo) return;
        const slideToScrollToIndex = [ ...this.carouselSlides ].indexOf(slideToScrollTo);
        if (slideToScrollToIndex > -1) {
            this.moveToSlide(slideToScrollToIndex, behavior);
        }
    }
    dismiss() {
        sessionStorage.setItem(this.id, 0);
        this.setAttribute("hidden", "hidden");
        this.dispatchEvent(new CustomEvent("on:announcement-bar:dismiss"));
    }
    stopInteractions() {
        this.interactions = false;
    }
    resumeInteractions() {
        this.interactions = true;
    }
    #calculateSlidesWidth() {
        this.slidesWidth = 0;
        this.containerWidth = window.innerWidth * .89;
        const {carouselSlides: carouselSlides} = this;
        carouselSlides.forEach((slide => {
            const announcementMessage = slide.querySelector(".announcement__message");
            const announcementText = slide.querySelector(".announcement__text");
            const computedStyles = window.getComputedStyle(announcementMessage);
            const textWidth = announcementText.offsetWidth + parseFloat(computedStyles.paddingLeft) + parseFloat(computedStyles.paddingRight);
            this.slidesWidth += textWidth;
        }));
        this.slidesWrap = this.slidesWidth > this.containerWidth;
    }
    #toggleClassBasedOnScreenSize() {
        const containerClass = "announcement__container--carousel";
        const wrapperClass = "announcement__wrapper--carousel";
        const slideClass = "announcement__slides--carousel";
        const showCarousel = !this.staticDisplay;
        this.carouselContainer.classList.toggle(containerClass, showCarousel);
        this.carouselWrapper.classList.toggle(wrapperClass, showCarousel);
        this.carouselSlides.forEach((slide => {
            slide.classList.toggle(slideClass, showCarousel);
        }));
        if (!this.carouselPrevBtn || !this.carouselNextBtn) return;
        this.carouselPrevBtn.toggleAttribute("hidden", !showCarousel);
        this.carouselNextBtn.toggleAttribute("hidden", !showCarousel);
    }
    #setMaxContainerWidth() {
        if (this.staticDisplay) {
            this.carouselContainer.style.maxWidth = "100%";
        } else {
            const maxTextWidth = Math.max(...Array.from(this.carouselSlides).map((slide => slide.querySelector(".announcement__text").offsetWidth)));
            const containerPadding = 180;
            this.carouselContainer.style.maxWidth = `${maxTextWidth + containerPadding}px`;
        }
    }
    #setUpDismissible() {
        this.closeBtn = document.createElement("button");
        this.closeBtn.classList.add("announcement__close");
        this.closeBtn.setAttribute("aria-label", "Close Announcement Bar");
        this.closeBtn.append(document.getElementById("template-icon-close").content.cloneNode(true).firstElementChild);
        this.wrapper.append(this.closeBtn);
        this.closeBtn.addEventListener("click", this.dismiss.bind(this));
    }
    #createNavigation() {
        this.carouselPrevBtn = document.createElement("button");
        this.carouselPrevBtn.classList.add("announcement__carousel-button", "carousel-prev");
        this.carouselPrevBtn.setAttribute("aria-label", "Previous Announcement");
        const arrowPreviousSVG = document.getElementById("template-icon-chevron").content.cloneNode(true).firstElementChild;
        arrowPreviousSVG.classList.add("icon--left");
        this.carouselPrevBtn.append(arrowPreviousSVG);
        this.carouselContainer.prepend(this.carouselPrevBtn);
        this.carouselNextBtn = document.createElement("button");
        this.carouselNextBtn.classList.add("announcement__carousel-button", "carousel-next");
        this.carouselNextBtn.setAttribute("aria-label", "Next Announcement");
        const arrowNextSVG = document.getElementById("template-icon-chevron").content.cloneNode(true).firstElementChild;
        this.carouselNextBtn.append(arrowNextSVG);
        this.carouselContainer.append(this.carouselNextBtn);
        this.carouselPrevBtn.addEventListener("click", (() => this.showPrevSlide()));
        this.carouselNextBtn.addEventListener("click", (() => this.showNextSlide()));
    }
    #popupListener(e) {
        if (e.type === "on:popup:opening") {
            this.setAttribute("popup-open", "");
            this.stopAutoplay();
        } else if (e.type === "on:popup:closed") {
            this.removeAttribute("popup-open", "");
            this.startAutoplay();
        }
    }
}

customElements.define("announcement-bar", AnnouncementBar);
//# sourceMappingURL=announcement-bar.js.map
