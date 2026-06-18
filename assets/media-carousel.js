/*! Copyright (c) Safe As Milk. All rights reserved. */
import Swiper, { A11y, Autoplay, EffectFade, Navigation, Pagination, Virtual } from "swiper";

import { BREAKPOINTS, StateSwitch, debounce } from "utils";

class MediaCarousel extends HTMLElement {
    #boundHandleMediaQueryChange;
    #boundHandleMobileNextImagePreviewMediaQueryChange;
    #indexProp;
    #isVirtual;
    #mobileNextImagePreviewStateSwitch=null;
    #navigationElement;
    #paginationElement;
    #resizeObserver;
    #slideElements;
    #sliderElement;
    #swiper=null;
    #stateSwitch=null;
    #wrapperElement;
    static #MEDIA_CAROUSEL_CLASS="swiper";
    static #MEDIA_CAROUSEL_WRAPPER_CLASS="swiper-wrapper";
    static #MEDIA_CAROUSEL_SLIDE_CLASS="swiper-slide";
    constructor() {
        super();
        this.#boundHandleMediaQueryChange = this.#handleMediaQueryChange.bind(this);
        this.#boundHandleMobileNextImagePreviewMediaQueryChange = this.#handleMobileNextImagePreviewMediaQueryChange.bind(this);
    }
    connectedCallback() {
        this.currentSlideId = this.currentSlideId !== undefined ? this.currentSlideId : this.dataset.initialSlide || 0;
        this.#sliderElement = this.querySelector("media-carousel-slider");
        this.#wrapperElement = this.querySelector("media-carousel-wrapper");
        this.#slideElements = this.querySelectorAll("media-carousel-slide");
        this.#paginationElement = this.querySelector("media-carousel-pagination");
        this.#navigationElement = this.querySelector("media-carousel-navigation");
        this.#indexProp = this.dataset.loop ? "realIndex" : "activeIndex";
        this.#isVirtual = Boolean(this.dataset.virtual && this.querySelector(".js-slides"));
        const handleIntersection = (entries, observer) => {
            entries.forEach((entry => {
                if (entry.isIntersecting) {
                    observer.unobserve(this);
                    if (this.dataset.breakpointMin || this.dataset.breakpointMax) {
                        this.#stateSwitch = new StateSwitch({
                            min: this.dataset.breakpointMin,
                            max: this.dataset.breakpointMax
                        });
                        if (this.#stateSwitch.active()) this.#init(document.body.clientWidth < BREAKPOINTS.tab && this.dataset.mobileNextImagePreview);
                        this.#stateSwitch.on(this.#boundHandleMediaQueryChange);
                    } else if (this.dataset.mobileNextImagePreview) {
                        this.#mobileNextImagePreviewStateSwitch = new StateSwitch({
                            max: "tab"
                        });
                        this.#init(this.#mobileNextImagePreviewStateSwitch.active());
                        this.#mobileNextImagePreviewStateSwitch.on(this.#boundHandleMobileNextImagePreviewMediaQueryChange);
                    } else {
                        this.#init();
                    }
                }
            }));
        };
        new IntersectionObserver(handleIntersection.bind(this)).observe(this);
    }
    disconnectedCallback() {
        if (this.#swiper) {
            this.#swiper.destroy();
            this.#swiper = null;
        }
        if (this.#stateSwitch) this.#stateSwitch.off(this.#boundHandleMediaQueryChange);
        if (this.#mobileNextImagePreviewStateSwitch) this.#mobileNextImagePreviewStateSwitch.off(this.#boundHandleMobileNextImagePreviewMediaQueryChange);
        if (this.#resizeObserver) {
            this.#resizeObserver.disconnect();
            this.#resizeObserver = null;
        }
    }
    get initialized() {
        return Boolean(this.#swiper ? this.#isVirtual ? this.#swiper.virtual.cache[this.#swiper[this.#indexProp]] : this.#swiper.slides[this.#swiper[this.#indexProp]] : false);
    }
    get index() {
        return this.#swiper ? this.#swiper[this.#indexProp] : undefined;
    }
    get currentSlide() {
        return this.#swiper ? this.#isVirtual ? this.#swiper.virtual.cache[this.#swiper[this.#indexProp]] : this.#swiper.slides[this.#swiper[this.#indexProp]] : undefined;
    }
    slideTo(index, speed = 0) {
        if (!(typeof index === "number" && index >= 0)) throw new Error("Invalid slide index");
        if (!this.#swiper) return null;
        if (this.dataset.loop) {
            this.#swiper.slideToLoop(index, speed);
        } else {
            this.#swiper.slideTo(index, speed);
        }
        this.#swiper.update();
        return this.#swiper;
    }
    stop() {
        if (!this.#swiper?.autoplay) return this.#swiper;
        this.#swiper.autoplay.stop();
        return this.#swiper;
    }
    start() {
        if (!this.#swiper?.autoplay) return this.#swiper;
        this.#swiper.autoplay.start();
        return this.#swiper;
    }
    on(type, handler, options) {
        this.addEventListener(type, handler, options);
        return this;
    }
    off(type, handler, options) {
        this.removeEventListener(type, handler, options);
        return this;
    }
    #init(mobileNextImagePreview = false) {
        if (this.#swiper) return;
        const loadAdjacentSlidesImages = swiper => {
            const previousSlide = this.#isVirtual ? swiper.virtual.cache[swiper[this.#indexProp] - 1] : swiper.el?.querySelector(".swiper-slide-prev");
            const nextSlide = this.#isVirtual ? swiper.virtual.cache[swiper[this.#indexProp] + 1] : swiper.el?.querySelector(".swiper-slide-next");
            const imagesToLoad = [ ...previousSlide ? previousSlide.querySelectorAll("img") : [], ...nextSlide ? nextSlide.querySelectorAll("img") : [] ];
            imagesToLoad.map((img => img.setAttribute("loading", "eager")));
        };
        if (this.#isVirtual) Array.from(this.querySelectorAll("video-player")).forEach((player => {
            if (player.reset) player.reset();
        }));
        this.#sliderElement.classList.add(MediaCarousel.#MEDIA_CAROUSEL_CLASS);
        if (this.#wrapperElement) {
            this.#wrapperElement.classList.add(MediaCarousel.#MEDIA_CAROUSEL_WRAPPER_CLASS);
        }
        if (this.#slideElements.length > 0) {
            this.#slideElements.forEach((el => el.classList.add(MediaCarousel.#MEDIA_CAROUSEL_SLIDE_CLASS)));
        }
        if (this.#paginationElement) this.#paginationElement.removeAttribute("hidden");
        if (this.#navigationElement) this.#navigationElement.removeAttribute("hidden");
        if (mobileNextImagePreview) {
            const updateSlideshow = () => {
                if (!this.#swiper) return;
                if (document.body.clientWidth < BREAKPOINTS.tab) {
                    this.#swiper.params.slidesOffsetAfter = this.offsetWidth * .09;
                } else {
                    this.#swiper.params.slidesOffsetAfter = 0;
                }
            };
            this.#resizeObserver = new ResizeObserver(debounce(updateSlideshow.bind(this), 100));
            this.#resizeObserver.observe(this);
        }
        this.#swiper = new Swiper(this.#sliderElement, {
            autoHeight: Boolean(this.dataset.autoHeight),
            initialSlide: this.currentSlideId,
            loop: Boolean(this.dataset.loop),
            modules: [ A11y, ...this.dataset.autoplay ? [ Autoplay ] : [], ...this.dataset.fade ? [ EffectFade ] : [], ...this.dataset.navigation ? [ Navigation ] : [], ...this.dataset.pagination ? [ Pagination ] : [], ...this.#isVirtual ? [ Virtual ] : [] ],
            observer: true,
            observeParents: true,
            slidesPerGroup: Number(this.dataset.slidesPerGroup || 1),
            ...mobileNextImagePreview ? {
                effect: "slide",
                slidesOffsetAfter: this.offsetWidth * .09
            } : {
                slidesPerView: Number(this.dataset.slidesPerView || 1),
                ...this.dataset.fade ? {
                    effect: "fade",
                    fadeEffect: {
                        crossFade: true
                    }
                } : {}
            },
            spaceBetween: Number(this.dataset.spaceBetween || 10),
            speed: Number(this.dataset.speed || 200),
            ...this.dataset.autoplay ? {
                autoplay: {
                    delay: Number(this.dataset.autoplay || 3e3)
                }
            } : {},
            ...this.dataset.navigation ? {
                navigation: {
                    nextEl: this.querySelector(".js-carousel-next"),
                    prevEl: this.querySelector(".js-carousel-prev")
                }
            } : {},
            ...this.dataset.pagination ? {
                pagination: {
                    clickable: true,
                    el: this.querySelector(".js-carousel-pagination"),
                    ...this.dataset.paginationDynamic ? {
                        dynamicBullets: true,
                        dynamicMainBullets: Number(this.dataset.paginationDynamic)
                    } : {}
                }
            } : {},
            ...this.#isVirtual ? {
                virtual: {
                    slides: (() => Array.from(this.querySelectorAll(".js-slides [data-slide]")).map((el => {
                        if (this.dataset.videoAutoplay) {
                            Array.from(el.querySelectorAll("video-player")).forEach((player => {
                                player.setAttribute("data-controls", "");
                            }));
                        }
                        return el.innerHTML;
                    })))()
                }
            } : {},
            on: {
                afterInit: swiper => {
                    const previewImage = this.querySelector("media-carousel-preview-image");
                    if (previewImage) previewImage.setAttribute("hidden", "");
                    const interval = setInterval((() => {
                        const currentSlide = this.#isVirtual ? swiper.virtual.cache[swiper[this.#indexProp]] : swiper.el?.querySelector(".swiper-slide-active");
                        loadAdjacentSlidesImages(swiper);
                        const dispatch = () => {
                            this.dispatchEvent(new CustomEvent("on:media-carousel:init", {
                                detail: {
                                    currentSlide: currentSlide,
                                    activeIndex: swiper[this.#indexProp]
                                }
                            }));
                            this.classList.remove("is-loading");
                            this.classList.add("is-initialized");
                            currentSlide.classList.add("is-visible");
                        };
                        if (currentSlide) {
                            dispatch();
                            clearInterval(interval);
                        }
                    }), 5);
                },
                slideChange: swiper => {
                    const interval = setInterval((() => {
                        const currentSlide = this.#isVirtual ? swiper.virtual.cache[swiper[this.#indexProp]] : swiper.el?.querySelector(".swiper-slide-active");
                        loadAdjacentSlidesImages(swiper);
                        const dispatch = () => {
                            this.dispatchEvent(new CustomEvent("on:media-carousel:slide-change", {
                                detail: {
                                    currentSlide: currentSlide,
                                    activeIndex: swiper[this.#indexProp],
                                    previousIndex: swiper.previousIndex,
                                    previousSlide: this.#isVirtual ? swiper.virtual.cache[swiper.previousIndex] : swiper.el?.querySelector(".swiper-slide-prev")
                                }
                            }));
                        };
                        if (currentSlide) {
                            this.currentSlideId = swiper[this.#indexProp];
                            dispatch();
                            clearInterval(interval);
                        }
                    }), 5);
                },
                slideChangeTransitionStart: swiper => {
                    const interval = setInterval((() => {
                        const currentSlide = this.#isVirtual ? swiper.virtual.cache[swiper[this.#indexProp]] : swiper.el?.querySelector(".swiper-slide-active");
                        const previousSlide = this.#isVirtual ? swiper.virtual.cache[swiper.previousIndex] : swiper.el?.querySelector(".swiper-slide-prev");
                        const dispatch = () => {
                            this.dispatchEvent(new CustomEvent("on:media-carousel:before-slide-change", {
                                detail: {
                                    currentSlide: currentSlide,
                                    previousSlide: previousSlide,
                                    activeIndex: swiper[this.#indexProp],
                                    previousIndex: swiper.previousIndex
                                }
                            }));
                            currentSlide.classList.add("is-visible");
                        };
                        if (currentSlide) {
                            dispatch();
                            clearInterval(interval);
                        }
                    }), 5);
                },
                transitionEnd: swiper => {
                    const currentSlide = this.#isVirtual ? swiper.virtual.cache[swiper[this.#indexProp]] : swiper.el?.querySelector(".swiper-slide-active");
                    const previousSlide = this.#isVirtual ? swiper.virtual.cache[swiper.previousIndex] : swiper.el?.querySelector(".swiper-slide-prev");
                    previousSlide?.classList.remove("is-visible");
                    this.dispatchEvent(new CustomEvent("on:media-carousel:slide-transition-end", {
                        detail: {
                            currentSlide: currentSlide,
                            previousSlide: previousSlide,
                            activeIndex: swiper[this.#indexProp],
                            previousIndex: swiper.previousIndex
                        }
                    }));
                }
            }
        });
    }
    #destroy() {
        if (!this.#swiper) return;
        this.#swiper.destroy();
        this.#swiper = null;
        this.#sliderElement.classList.remove(MediaCarousel.#MEDIA_CAROUSEL_CLASS);
        this.querySelector("is-visible")?.classList.remove("is-visible");
        if (this.#wrapperElement) {
            this.#wrapperElement.classList.remove(MediaCarousel.#MEDIA_CAROUSEL_WRAPPER_CLASS);
            if (this.#isVirtual) {
                this.#wrapperElement.innerHTML = "";
            }
        }
        if (this.#slideElements.length > 0) {
            this.#slideElements.forEach((el => el.classList.remove(MediaCarousel.#MEDIA_CAROUSEL_SLIDE_CLASS)));
        }
        if (this.#paginationElement) this.#paginationElement.setAttribute("hidden", "");
        if (this.#navigationElement) this.#navigationElement.setAttribute("hidden", "");
    }
    #handleMediaQueryChange(e) {
        if (e.matches && !this.#swiper) {
            this.#init(document.body.clientWidth < BREAKPOINTS.tab && this.dataset.mobileNextImagePreview);
        } else if (this.#swiper) {
            this.#destroy();
        }
    }
    #handleMobileNextImagePreviewMediaQueryChange(e) {
        if (this.#swiper) {
            this.#destroy();
        }
        this.#init(e.matches);
    }
}

customElements.define("media-carousel", MediaCarousel);
//# sourceMappingURL=media-carousel.js.map
