/*! Copyright (c) Safe As Milk. All rights reserved. */
import DeferredMedia from "deferred-media";

class LazyVideo extends DeferredMedia {
    connectedCallback() {
        const lazyVideoObserver = new IntersectionObserver((entries => {
            entries.forEach((entry => {
                const lazyVideo = entry.target;
                if (entry.isIntersecting) {
                    if (!lazyVideo.hasAttribute("loaded")) {
                        lazyVideo.loadContent();
                        const videoElement = lazyVideo.querySelector("video");
                        videoElement.play().catch((error => {
                            if (error.name === "NotAllowedError") {
                                videoElement.remove();
                            }
                        }));
                    } else {
                        const videoElement = lazyVideo.querySelector("video");
                        if (videoElement) videoElement.play();
                    }
                } else {
                    if (!lazyVideo.hasAttribute("loaded")) return;
                    const videoElement = lazyVideo.querySelector("video");
                    if (videoElement) videoElement.pause();
                }
            }));
        }));
        lazyVideoObserver.observe(this);
    }
}

customElements.define("lazy-video", LazyVideo);
//# sourceMappingURL=lazy-video.js.map
