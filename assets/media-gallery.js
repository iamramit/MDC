/*! Copyright (c) Safe As Milk. All rights reserved. */
import PhotoSwipeLightbox from "photoswipe-lightbox";

import { debounce, StateSwitch } from "utils";

class MediaGallery extends HTMLElement {
    #navigationResizeObserver;
    #sliderResizeObserver;
    #boundHandleDeferredMedia;
    #boundHandleMediaQueryChange;
    #boundUpdateThumbs;
    #boundUpdateViewInSpace;
    #lightbox;
    #stateSwitch=null;
    #thumbWidth=70;
    #thumbHeight=70;
    constructor() {
        super();
        this.#boundHandleMediaQueryChange = this.#handleMediaQueryChange.bind(this);
        this.#boundUpdateThumbs = this.#updateThumbs.bind(this);
        this.#boundUpdateViewInSpace = this.#updateViewInSpace.bind(this);
        this.#boundHandleDeferredMedia = this.#handleDeferredMedia.bind(this);
    }
    connectedCallback() {
        this.carousel = this.querySelector("media-carousel");
        this.navigation = this.querySelector("media-gallery-navigation");
        this.navigationThumbList = this.navigation?.querySelector(".js-media-gallery-thumb-list");
        this.navigationPrevious = this.navigation?.querySelector(".js-media-gallery-nav-prev");
        this.navigationNext = this.navigation?.querySelector(".js-media-gallery-nav-next");
        this.viewInSpaceButton = this.querySelector(".js-product-view-in-space-btn");
        this.classList.remove("media-gallery--loading", "media-gallery--loading@mob", "media-gallery--loading@desk");
        this.autoplayVideos = this.getAttribute("data-enable-video-autoplay") === "true";
        if (this.carousel) {
            if (typeof this.carousel.index !== "undefined") {
                this.#init();
            } else {
                this.carousel.addEventListener("on:media-carousel:init", (() => {
                    this.#init();
                }), {
                    once: true
                });
            }
        }
        if (this.dataset.zoom) this.#initZoom();
        const videoPlayerIntersectionCallback = entries => {
            entries.forEach((entry => {
                if (entry.isIntersecting) {
                    const videoPlayer = entry.target;
                    if (!videoPlayer.hasAttribute("loaded")) videoPlayer.loadContent();
                    if (this.autoplayVideos) {
                        videoPlayer.play();
                    }
                } else {
                    const videoPlayer = entry.target;
                    if (videoPlayer.pause && videoPlayer.playing) videoPlayer.pause();
                }
            }));
        };
        const options = {
            rootMargin: "0px",
            threshold: .25
        };
        const videoPlayerObserver = new IntersectionObserver(videoPlayerIntersectionCallback, options);
        Array.from(this.querySelectorAll(".js-slides video-player")).forEach((videoPlayer => {
            videoPlayerObserver.observe(videoPlayer);
        }));
    }
    disconnectedCallback() {
        if (this.#navigationResizeObserver) this.#navigationResizeObserver.disconnect();
        if (this.#sliderResizeObserver) this.#sliderResizeObserver.disconnect();
        this.carousel?.off("on:media-carousel:init", this.#boundHandleDeferredMedia).off("on:media-carousel:slide-change", this.#boundUpdateThumbs).off("on:media-carousel:slide-change", this.#boundUpdateViewInSpace).off("on:media-carousel:slide-change", this.#boundHandleDeferredMedia).off("on:media-carousel:before-slide-change", MediaGallery.#pauseDeferredMedia);
        if (this.#lightbox) this.#lightbox.destroy();
        if (this.#stateSwitch) this.#stateSwitch.off(this.#boundHandleMediaQueryChange);
    }
    goToSlide(mediaId) {
        const slide = this.carousel?.querySelector(`[data-media-id="${mediaId}"]`);
        if (!slide) return;
        const slideIndex = slide.dataset.slideId;
        if (this.carousel.initialized) {
            this.carousel.slideTo(Number(slideIndex), 200);
        }
    }
    #init() {
        if (this.navigationThumbList) {
            const currentSlideId = this.carousel.index;
            this.navigationThumbList.children[currentSlideId].classList.add("thumbnail-list__item--active");
            this.navigationThumbList.children[currentSlideId].querySelector(".thumbnail").setAttribute("aria-current", "true");
            if ("ResizeObserver" in window) {
                this.#navigationResizeObserver = new ResizeObserver(debounce((entries => {
                    entries.forEach((entry => {
                        const active = entry.target.querySelector(".thumbnail-list__item--active");
                        this.#setCSSVars(this.#thumbWidth, this.#thumbHeight);
                        this.#adjustThumbs(active);
                        this.#navigationPagingVisibilityControl();
                    }));
                }), 50));
                this.#navigationResizeObserver.observe(this.navigationThumbList);
                this.#sliderResizeObserver = new ResizeObserver(debounce((entries => {
                    entries.forEach((() => {
                        this.#setCSSVars(this.#thumbWidth, this.#thumbHeight);
                    }));
                }), 100));
                this.#sliderResizeObserver.observe(this.carousel);
            } else {
                const active = this.navigation.querySelector(".thumbnail-list__item--active");
                this.#setCSSVars(this.#thumbWidth, this.#thumbHeight);
                this.#adjustThumbs(active);
                this.#navigationPagingVisibilityControl();
            }
            Array.from(this.navigation.querySelectorAll(".thumbnail")).forEach((el => {
                el.addEventListener("click", (e => {
                    const slideNumber = Number(e.target.dataset.slideNumber);
                    this.carousel.slideTo(slideNumber, 200);
                }));
            }));
            this.#stateSwitch = new StateSwitch({
                max: "tab"
            });
            if (this.#stateSwitch.active()) {
                this.#setThumbnailDimensions("mobile");
            } else {
                this.#setThumbnailDimensions("desktop");
            }
            this.#stateSwitch.on(this.#boundHandleMediaQueryChange);
        }
        if (this.navigationThumbList && this.navigationPrevious && this.navigationNext) {
            this.#navigationControl();
        }
        if (this.carousel.currentSlide) {
            this.#loadAndPlayDeferredMedia(this.carousel.currentSlide);
        }
        this.carousel.on("on:media-carousel:slide-change", this.#boundUpdateThumbs).on("on:media-carousel:slide-change", this.#boundUpdateViewInSpace).on("on:media-carousel:slide-change", this.#boundHandleDeferredMedia).on("on:media-carousel:before-slide-change", MediaGallery.#pauseDeferredMedia);
    }
    #initZoom() {
        const images = Array.from(this.querySelectorAll(`${this.carousel ? ".js-slides" : ""} .media-gallery__link`)).map((el => ({
            id: el.dataset.slideId,
            src: el.href,
            width: el.dataset.pswpWidth,
            height: el.dataset.pswpHeight
        })));
        const closeSVG = document.getElementById("template-icon-close").content.cloneNode(true).firstElementChild;
        closeSVG.classList.add("pswp__icn");
        const arrowNextSVG = document.getElementById("template-icon-chevron").content.cloneNode(true).firstElementChild;
        arrowNextSVG.classList.add("pswp__icn");
        const arrowPreviousSVG = document.getElementById("template-icon-chevron").content.cloneNode(true).firstElementChild;
        arrowPreviousSVG.classList.add("pswp__icn", "icon--left");
        const zoomIcon = document.getElementById("template-media-gallery-zoom-icon").content.cloneNode(true).firstElementChild;
        zoomIcon.classList.add("pswp__icn");
        this.#lightbox = new PhotoSwipeLightbox({
            arrowPrevSVG: arrowPreviousSVG.outerHTML,
            arrowNextSVG: arrowNextSVG.outerHTML,
            zoomSVG: zoomIcon.outerHTML,
            closeSVG: closeSVG.outerHTML,
            counter: false,
            dataSource: images,
            bgOpacity: 1,
            showHideAnimationType: "fade",
            pswpModule: () => import("photoswipe")
        });
        this.#lightbox.init();
        this.#lightbox.addFilter("thumbEl", ((thumbEl, data) => {
            const el = (this.carousel || this).querySelector(`[data-slide-id="${data.id}"] img`);
            if (el) {
                return el;
            }
            return thumbEl;
        }));
        this.#lightbox.addFilter("placeholderSrc", ((placeholderSrc, slide) => {
            const el = (this.carousel || this).querySelector(`[data-slide-id="${slide.data.id}"] img`);
            if (el) {
                return el.src;
            }
            return placeholderSrc;
        }));
        if (this.carousel) {
            this.#lightbox.on("change", (() => {
                const current = this.#lightbox.pswp.currSlide;
                const {id: id} = current.data;
                if (id) {
                    this.carousel.slideTo(Number(id));
                }
            }));
        }
        const handleZoomLink = event => {
            event.preventDefault();
            const index = event.target.closest(".media-gallery__item")?.dataset.imageSlideIndex;
            if (Number(index) >= 0) this.#lightbox.loadAndOpen(Number(index));
        };
        const boundHandleZoomLink = handleZoomLink.bind(this);
        if (this.carousel) {
            if (this.carousel.initialized) {
                this.carousel.currentSlide.querySelector(".media-gallery__link")?.addEventListener("click", boundHandleZoomLink);
            }
            this.carousel.addEventListener("on:media-carousel:init", (() => {
                this.carousel.currentSlide.querySelector(".media-gallery__link")?.addEventListener("click", boundHandleZoomLink);
            }));
            this.carousel.addEventListener("on:media-carousel:slide-change", (({detail: {currentSlide: currentSlide, previousSlide: previousSlide}}) => {
                const previousLink = previousSlide?.querySelector(".media-gallery__link");
                if (previousLink) {
                    previousLink.removeEventListener("click", boundHandleZoomLink);
                }
                const link = currentSlide.querySelector(".media-gallery__link");
                if (link) {
                    link.addEventListener("click", boundHandleZoomLink);
                }
            }));
        }
        this.querySelectorAll(".media-gallery__link").forEach((link => {
            link.addEventListener("click", boundHandleZoomLink);
        }));
    }
    #isThumbContainerVertical() {
        return this.classList.contains("media-gallery--thumbnails-aside") && window.matchMedia("(min-width: 768px)").matches;
    }
    #adjustThumbs(activeElement, behavior = "instant") {
        if (!this.navigationThumbList) return;
        const isVertical = this.#isThumbContainerVertical();
        const coordinatesMapping = {
            size: isVertical ? "height" : "width",
            start: isVertical ? "top" : "left",
            end: isVertical ? "bottom" : "right",
            marginBefore: isVertical ? "marginTop" : "marginLeft",
            marginAfter: isVertical ? "marginBottom" : "marginRight"
        };
        const activeElementMarginBefore = Number(window.getComputedStyle(activeElement)[coordinatesMapping.marginBefore].replace("px", ""));
        const activeElementMarginAfter = Number(window.getComputedStyle(activeElement)[coordinatesMapping.marginAfter].replace("px", ""));
        const activeElementFullWidth = activeElementMarginBefore + activeElement.getBoundingClientRect()[coordinatesMapping.size] + activeElementMarginAfter;
        const isActiveOutsideBefore = this.navigationThumbList.getBoundingClientRect()[coordinatesMapping.start] + activeElementFullWidth > activeElement.getBoundingClientRect()[coordinatesMapping.end] + activeElementMarginAfter;
        const isActiveOutsideAfter = !isActiveOutsideBefore && this.navigationThumbList.getBoundingClientRect()[coordinatesMapping.end] - activeElementFullWidth < activeElement.getBoundingClientRect()[coordinatesMapping.start] - activeElementMarginBefore;
        let displacement = 0;
        if (isActiveOutsideBefore) {
            displacement = activeElement.getBoundingClientRect()[coordinatesMapping.start] - activeElementMarginBefore - this.navigationThumbList.getBoundingClientRect()[coordinatesMapping.start];
        }
        if (isActiveOutsideAfter) {
            displacement = activeElement.getBoundingClientRect()[coordinatesMapping.end] + activeElementMarginAfter - this.navigationThumbList.getBoundingClientRect()[coordinatesMapping.end];
        }
        const elementBeforeActive = activeElement.previousSibling;
        if (elementBeforeActive) {
            const elementBeforeActiveMarginBefore = Number(window.getComputedStyle(activeElement)[coordinatesMapping.marginBefore].replace("px", ""));
            const elementBeforeActiveMarginAfter = Number(window.getComputedStyle(activeElement)[coordinatesMapping.marginAfter].replace("px", ""));
            const elementBeforeActiveFullWidth = elementBeforeActiveMarginBefore + elementBeforeActive.getBoundingClientRect()[coordinatesMapping.size] + elementBeforeActiveMarginAfter;
            const elementBeforeActiveIsOutside = this.navigationThumbList.getBoundingClientRect()[coordinatesMapping.start] + elementBeforeActiveFullWidth > elementBeforeActive.getBoundingClientRect()[coordinatesMapping.end] + elementBeforeActiveMarginAfter + 1;
            if (elementBeforeActiveIsOutside) {
                displacement = elementBeforeActive.getBoundingClientRect()[coordinatesMapping.start] - elementBeforeActiveMarginBefore - this.navigationThumbList.getBoundingClientRect()[coordinatesMapping.start];
            }
        }
        const elementAfterActive = activeElement.nextSibling;
        if (elementAfterActive) {
            const elementAfterActiveMarginBefore = Number(window.getComputedStyle(activeElement)[coordinatesMapping.marginBefore].replace("px", ""));
            const elementAfterActiveMarginAfter = Number(window.getComputedStyle(activeElement)[coordinatesMapping.marginAfter].replace("px", ""));
            const elementAfterActiveFullWidth = elementAfterActiveMarginBefore + elementAfterActive.getBoundingClientRect()[coordinatesMapping.size] + elementAfterActiveMarginAfter;
            const elementAfterActiveIsOutside = this.navigationThumbList.getBoundingClientRect()[coordinatesMapping.end] - elementAfterActiveFullWidth < elementAfterActive.getBoundingClientRect()[coordinatesMapping.start] - elementAfterActiveMarginBefore;
            if (elementAfterActiveIsOutside) {
                displacement = elementAfterActive.getBoundingClientRect()[coordinatesMapping.end] + elementAfterActiveMarginAfter - this.navigationThumbList.getBoundingClientRect()[coordinatesMapping.end];
            }
        }
        if (displacement) {
            this.navigationThumbList.scrollBy({
                top: isVertical ? displacement : 0,
                left: !isVertical ? displacement : 0,
                behavior: behavior
            });
        }
        this.navigation?.classList.remove("media-gallery__nav--loading");
        this.navigation?.classList.add("is-loaded");
    }
    #navigationPagingVisibilityControl() {
        if (!this.navigationThumbList || !this.navigationPrevious || !this.navigationNext) return;
        const isVertical = this.#isThumbContainerVertical();
        const coordinatesMapping = {
            scrollSize: isVertical ? "scrollHeight" : "scrollWidth",
            clientSize: isVertical ? "clientHeight" : "clientWidth"
        };
        if (this.navigationThumbList[coordinatesMapping.scrollSize] > this.navigationThumbList[coordinatesMapping.clientSize]) {
            this.navigationPrevious.removeAttribute("hidden");
            this.navigationNext.removeAttribute("hidden");
        } else {
            this.navigationPrevious.setAttribute("hidden", "");
            this.navigationNext.setAttribute("hidden", "");
        }
    }
    #navigationControl() {
        if (!this.navigationThumbList) return;
        const options = {
            root: this.navigationThumbList,
            rootMargin: "2px",
            threshold: 1
        };
        this.#navigationPagingVisibilityControl();
        this.navigationPrevious.addEventListener("click", (() => {
            const isVertical = this.#isThumbContainerVertical();
            const listComputedStyle = window.getComputedStyle(this.navigationThumbList);
            const gapValue = parseInt(listComputedStyle.getPropertyValue("column-gap"), 10);
            let displacement = this.navigationThumbList.getBoundingClientRect()[isVertical ? "height" : "width"] + gapValue;
            const remainingScroll = this.navigationThumbList[isVertical ? "scrollTop" : "scrollLeft"];
            if (remainingScroll < this.navigationThumbList.getBoundingClientRect()[isVertical ? "height" : "width"]) {
                displacement = remainingScroll;
            }
            this.navigationThumbList.scrollBy({
                top: isVertical ? 0 - displacement : 0,
                left: !isVertical ? 0 - displacement : 0,
                behavior: "smooth"
            });
        }));
        this.navigationNext.addEventListener("click", (() => {
            const isVertical = this.#isThumbContainerVertical();
            const listComputedStyle = window.getComputedStyle(this.navigationThumbList);
            const gapValue = parseInt(listComputedStyle.getPropertyValue("column-gap"), 10);
            let displacement = this.navigationThumbList.getBoundingClientRect()[isVertical ? "height" : "width"] + gapValue;
            const remainingScroll = this.navigationThumbList[isVertical ? "scrollHeight" : "scrollWidth"] - displacement - this.navigationThumbList[isVertical ? "scrollTop" : "scrollLeft"];
            if (remainingScroll < this.navigationThumbList.getBoundingClientRect()[isVertical ? "height" : "width"]) {
                displacement = remainingScroll + gapValue;
            }
            this.navigationThumbList.scrollBy({
                top: isVertical ? displacement : 0,
                left: !isVertical ? displacement : 0,
                behavior: "smooth"
            });
        }));
        const callback = entries => {
            entries.forEach((entry => {
                const containerRect = this.navigationThumbList.getBoundingClientRect();
                const targetRect = entry.target.getBoundingClientRect();
                const isVertical = this.#isThumbContainerVertical();
                const coordinatesMapping = {
                    dimension: isVertical ? "height" : "width",
                    start: isVertical ? "top" : "left",
                    end: isVertical ? "bottom" : "right"
                };
                if (containerRect[coordinatesMapping.start] + targetRect[coordinatesMapping.dimension] >= targetRect[coordinatesMapping.end]) {
                    if (entry.isIntersecting) {
                        this.navigationPrevious.setAttribute("disabled", "");
                    } else {
                        this.navigationPrevious.removeAttribute("disabled");
                    }
                }
                if (containerRect[coordinatesMapping.end] - targetRect[coordinatesMapping.dimension] <= targetRect[coordinatesMapping.start]) {
                    if (entry.isIntersecting) {
                        this.navigationNext.setAttribute("disabled", "");
                    } else {
                        this.navigationNext.removeAttribute("disabled");
                    }
                }
            }));
        };
        if (this.navigationThumbList.children.length > 3) {
            const observer = new IntersectionObserver(callback, options);
            observer.observe(this.navigationThumbList.children[0]);
            observer.observe(this.navigationThumbList.children[this.navigationThumbList.children.length - 1]);
        }
    }
    #calculateThumbsRatio(preferredThumbSize = 70, minContainerSize = 300) {
        const gap = Number(window.getComputedStyle(this.navigationThumbList).gap.split(" ")[0].replace("px", ""));
        const containerRect = this.navigationThumbList.getBoundingClientRect();
        const isVertical = this.#isThumbContainerVertical();
        const dimension = isVertical ? "height" : "width";
        const containerSize = containerRect[dimension];
        const deviation = Math.floor(preferredThumbSize / 10);
        const getRatio = currentContainerSize => {
            const lowerBound = Math.floor(currentContainerSize / (preferredThumbSize + gap - deviation));
            const upperBound = Math.floor(currentContainerSize / (preferredThumbSize + gap + deviation));
            const finalRatio = upperBound > lowerBound ? upperBound : lowerBound;
            return finalRatio > 2 ? finalRatio : 3;
        };
        return containerSize <= minContainerSize ? getRatio(minContainerSize) : getRatio(containerSize);
    }
    #setCSSVars(preferredThumbWidth = 70, preferredThumbHeight = 70) {
        if (!this.navigationThumbList) return;
        const isVertical = this.#isThumbContainerVertical();
        this.navigationThumbList.style.setProperty("--thumbRatio", this.#calculateThumbsRatio(isVertical ? preferredThumbHeight : preferredThumbWidth));
        if (!isVertical) {
            this.navigationThumbList.style.setProperty("--justify", this.navigationThumbList.scrollWidth > this.navigationThumbList.clientWidth ? "start" : "center");
        } else {
            this.navigationThumbList.style.setProperty("--justify", "start");
        }
        const navWrapper = this.navigation.closest(".js-product-slider-nav");
        if (navWrapper && !navWrapper.classList.contains("is-loaded")) navWrapper.classList.add("is-loaded");
    }
    #updateThumbs({detail: {activeIndex: activeIndex}}) {
        if (!this.navigationThumbList) return;
        const currentElement = this.navigationThumbList.querySelector(".thumbnail-list__item--active");
        const nextElement = this.navigationThumbList.children[activeIndex];
        currentElement.classList.remove("thumbnail-list__item--active");
        currentElement.querySelector(".thumbnail").removeAttribute("aria-current");
        nextElement.classList.add("thumbnail-list__item--active");
        nextElement.querySelector(".thumbnail").setAttribute("aria-current", "true");
        this.#adjustThumbs(nextElement, "smooth");
    }
    #updateViewInSpace({detail: {currentSlide: currentSlide}}) {
        if (!this.viewInSpaceButton) return;
        const model = currentSlide?.querySelector(".media-gallery__item--model");
        if (model) {
            this.viewInSpaceButton.dataset.shopifyModel3dId = model.dataset.mediaId;
        }
    }
    #setThumbnailDimensions(viewport = "mobile") {
        const [thumbWidthString, thumbHeightString] = (this.dataset.thumbnailsSize || "70:70").split(":");
        const [thumbWidthStringMobile, thumbHeightStringMobile] = (this.dataset.thumbnailsSizeMobile || "50:50").split(":");
        const thumbWidth = Number(thumbWidthString);
        const thumbHeight = Number(thumbHeightString);
        const thumbWidthMobile = Number(thumbWidthStringMobile);
        const thumbHeightMobile = Number(thumbHeightStringMobile);
        if (viewport === "mobile") {
            this.#thumbWidth = thumbWidthMobile;
            this.#thumbHeight = thumbHeightMobile;
        } else {
            this.#thumbWidth = thumbWidth;
            this.#thumbHeight = thumbHeight;
        }
    }
    #handleMediaQueryChange(e) {
        if (e.matches) {
            this.#setThumbnailDimensions("mobile");
        } else {
            this.#setThumbnailDimensions("desktop");
        }
    }
    #loadAndPlayDeferredMedia(currentSlide) {
        const deferredMedia = currentSlide?.querySelector(".deferred-media, video-player");
        if (!deferredMedia) return;
        if (!deferredMedia.hasAttribute("loaded")) {
            if (deferredMedia.tagName === "PRODUCT-MODEL") {
                deferredMedia.addEventListener("on:product-model:loaded", (() => {
                    currentSlide.classList.add("swiper-no-swiping");
                }), {
                    once: true
                });
            }
            if (deferredMedia.tagName === "VIDEO-PLAYER" && this.autoplayVideos) {
                deferredMedia.play();
            }
            deferredMedia.loadContent();
        } else if (deferredMedia.tagName === "PRODUCT-MODEL") {
            deferredMedia.querySelector("model-viewer")?.play();
        } else if (deferredMedia.tagName === "VIDEO-PLAYER" && this.autoplayVideos) {
            deferredMedia.play();
        }
    }
    #handleDeferredMedia({detail: {currentSlide: currentSlide}}) {
        this.#loadAndPlayDeferredMedia(currentSlide);
    }
    static #pauseDeferredMedia({detail: {previousSlide: previousSlide}}) {
        const deferredMedia = previousSlide?.querySelector(".deferred-media, video-player");
        if (deferredMedia?.tagName === "PRODUCT-MODEL") {
            deferredMedia?.querySelector("model-viewer")?.pause();
        }
        if (deferredMedia?.tagName === "VIDEO-PLAYER") {
            deferredMedia.pause();
        }
    }
}

customElements.define("media-gallery", MediaGallery);
//# sourceMappingURL=media-gallery.js.map
