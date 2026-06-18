/*! Copyright (c) Safe As Milk. All rights reserved. */
class VideoGallery extends HTMLElement {
    #currentSlideId;
    #boundHandleClick;
    #thumbnails;
    constructor() {
        super();
        this.#boundHandleClick = this.#handleClick.bind(this);
    }
    connectedCallback() {
        const activeSlide = this.querySelector("video-gallery-slide.is-active");
        if (!activeSlide) throw new Error("No active slide found");
        this.#currentSlideId = activeSlide.id;
        setTimeout((() => {
            const videoPlayer = activeSlide.querySelector("video-player");
            if (videoPlayer) {
                videoPlayer.loadContent();
            }
            this.#thumbnails = this.querySelectorAll("video-gallery-thumbnails button");
            this.#thumbnails.forEach((thumbnail => {
                thumbnail.addEventListener("click", this.#boundHandleClick);
            }));
        }));
    }
    disconnectedCallback() {
        if (this.#thumbnails) {
            this.#thumbnails.forEach((thumbnail => {
                thumbnail.removeEventListener("click", this.#boundHandleClick);
            }));
        }
    }
    changeSlide(videoSlideId) {
        if (this.#currentSlideId === videoSlideId) return this;
        const targetSlide = this.querySelector(`#${videoSlideId}`);
        if (!targetSlide) return this;
        const targetVideoPlayer = targetSlide.querySelector(`video-player`);
        if (targetVideoPlayer) {
            targetVideoPlayer.loadContent().play();
        }
        const activeSlide = this.querySelector("video-gallery-slide.is-active");
        if (activeSlide) {
            const activeVideoPlayer = activeSlide.querySelector(`video-player`);
            activeSlide.classList.remove("is-active");
            activeVideoPlayer.pause();
        }
        targetSlide.classList.add("is-active");
        this.querySelector("video-gallery-thumbnails .is-active")?.classList.remove("is-active");
        const newActiveThumbnail = this.querySelector(`video-gallery-thumbnails button[data-target-id="${videoSlideId}"]`)?.closest(".home-video__item");
        if (newActiveThumbnail) newActiveThumbnail.classList.add("is-active");
        this.#currentSlideId = videoSlideId;
        return this;
    }
    #handleClick(e) {
        const {target: target} = e;
        this.changeSlide(target.dataset.targetId);
    }
}

customElements.define("video-gallery", VideoGallery);

class VideoGalleryThumbnail extends HTMLElement {
    connectedCallback() {
        this.#updateVimeoThumbnail();
    }
    async #updateVimeoThumbnail() {
        const vimeoThumbnail = this.querySelector(".js-vimeo-thumb");
        if (!vimeoThumbnail) return;
        try {
            const data = await fetch(`https://vimeo.com/api/v2/video/${vimeoThumbnail.dataset.vimeoId}.json`);
            const [videoData] = await data.json();
            const {thumbnail_medium: thumbnail} = videoData;
            vimeoThumbnail.setAttribute("src", thumbnail);
            vimeoThumbnail.style.setProperty("opacity", "1");
        } catch (e) {
            console.error(`Could not load Vimeo poster: ${e}`);
        }
    }
}

customElements.define("video-gallery-thumbnail", VideoGalleryThumbnail);
//# sourceMappingURL=video-gallery.js.map
