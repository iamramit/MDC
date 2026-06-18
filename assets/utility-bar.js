/*! Copyright (c) Safe As Milk. All rights reserved. */
class UtilityBar extends HTMLElement {
    connectedCallback() {
        this.id = this.getAttribute("id");
        this.carouselContainer = this.querySelector(".utility-announcement");
        this.carouselWrapper = this.querySelector(".utility-announcement__wrapper");
        this.carouselSlides = this.querySelectorAll(".utility-announcement__slides");
        if (this.carouselContainer != null) {
            this.interactions = true;
            this.autoplay = this.carouselContainer.hasAttribute("autoplay");
            this.autoplayDelay = Number(this.carouselContainer.getAttribute("autoplay-delay") || "5000");
            this.currentSlide = 0;
            this.autoplayInterval = null;
            if (this.carouselSlides.length > 1) this.#createNavigation();
            this.intersectionObserver = new IntersectionObserver(this.handleIntersection.bind(this));
            this.mutationObserver = new MutationObserver((() => {
                this.handleWindowResize();
            }));
            this.handleWindowResize();
            window.addEventListener("resize", (() => {
                this.handleWindowResize();
            }));
            this.observeMutations();
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
        }
        this.setAttribute("loaded", "");
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
    handleWindowResize() {
        this.#calculateSlidesWidth();
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
            const announcementMessage = slide.querySelector(".utility-announcement__message");
            const announcementText = slide.querySelector(".utility-announcement__text");
            const computedStyles = window.getComputedStyle(announcementMessage);
            const textWidth = announcementText.offsetWidth + parseFloat(computedStyles.paddingLeft) + parseFloat(computedStyles.paddingRight);
            this.slidesWidth += textWidth;
        }));
        this.slidesWrap = this.slidesWidth > this.containerWidth;
    }
    #createNavigation() {
        this.carouselPrevBtn = document.createElement("button");
        this.carouselPrevBtn.classList.add("utility-announcement__carousel-button", "carousel-prev");
        this.carouselPrevBtn.setAttribute("aria-label", "Previous Announcement");
        const arrowPreviousSVG = document.getElementById("template-icon-chevron").content.cloneNode(true).firstElementChild;
        arrowPreviousSVG.classList.add("icon--left");
        this.carouselPrevBtn.append(arrowPreviousSVG);
        this.carouselContainer.prepend(this.carouselPrevBtn);
        this.carouselNextBtn = document.createElement("button");
        this.carouselNextBtn.classList.add("utility-announcement__carousel-button", "carousel-next");
        this.carouselNextBtn.setAttribute("aria-label", "Next Announcement");
        const arrowNextSVG = document.getElementById("template-icon-chevron").content.cloneNode(true).firstElementChild;
        this.carouselNextBtn.append(arrowNextSVG);
        this.carouselContainer.append(this.carouselNextBtn);
        this.carouselPrevBtn.addEventListener("click", (() => this.showPrevSlide()));
        this.carouselNextBtn.addEventListener("click", (() => this.showNextSlide()));
    }
}

customElements.define("utility-bar", UtilityBar);
//# sourceMappingURL=utility-bar.js.map
