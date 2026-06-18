/*! Copyright (c) Safe As Milk. All rights reserved. */
import PopupDialog from "popup-dialog";

class VideoDialog extends PopupDialog {
    #boundLoadVideoAndPlay;
    #boundPauseVideo;
    constructor() {
        super();
        this.#boundLoadVideoAndPlay = this.#loadVideoAndPlay.bind(this);
        this.#boundPauseVideo = this.#pauseVideo.bind(this);
    }
    connectedCallback() {
        this.videoPlayer = this.querySelector("video-player");
        if (!this.videoPlayer) return;
        super.connectedCallback();
        this.on("on:popup:opened", this.#boundLoadVideoAndPlay).on("on:popup:closing", this.#boundPauseVideo);
    }
    disconnectedCallback() {
        this.off("on:popup:opened", this.#boundLoadVideoAndPlay).off("on:popup:closing", this.#boundPauseVideo);
        super.disconnectedCallback();
    }
    #loadVideoAndPlay() {
        if (!this.videoPlayer) return;
        this.videoPlayer.loadContent().play();
    }
    #pauseVideo() {
        if (!this.videoPlayer) return;
        this.videoPlayer.pause();
    }
}

customElements.define("video-dialog", VideoDialog);
//# sourceMappingURL=video-dialog.js.map
