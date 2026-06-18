/*! Copyright (c) Safe As Milk. All rights reserved. */
const VIDEO_TYPES = [ "html5", "youtube", "vimeo" ];

class VideoPlayer extends HTMLElement {
    static YoutubeAPIStatus="NOT_LOADED";
    static VimeoAPIStatus="NOT_LOADED";
    #boundPlay;
    #isPlaying=false;
    #isPlayScheduled=false;
    #loading=false;
    #loadingIndicator=null;
    #player=null;
    #playButton=null;
    #posterUrl="";
    #posterElement=null;
    #type;
    #videoElementContainer=null;
    constructor() {
        super();
        this.#boundPlay = this.play.bind(this);
    }
    connectedCallback() {
        this.#type = this.dataset.type;
        if (!this.#type || !VIDEO_TYPES.includes(this.#type)) throw new Error('Video type must be provided and one of: "html5", "Youtube", "Vimeo"');
        this.#videoElementContainer = this.querySelector("video-element");
        this.#loadingIndicator = this.querySelector("video-loading-indicator");
        this.#playButton = this.querySelector(".video-play-button");
        this.#posterUrl = this.dataset.poster;
        this.#posterElement = this.querySelector("video-poster");
        if (this.#type !== "html5") {
            VideoPlayer.loadVideoAPI(this.#type);
        }
        if (this.#posterElement) {
            this.#posterElement.addEventListener("click", this.loadContent.bind(this), {
                once: true
            });
        }
    }
    disconnectedCallback() {
        this.#loading = false;
        this.reset();
        if (this.#isPlayScheduled) {
            this.removeEventListener("on:video-player:playing", this.#boundPlay);
            this.#isPlayScheduled = false;
        }
    }
    get playing() {
        return this.#isPlaying;
    }
    loadContent() {
        if (this.hasAttribute("loaded") || this.#loading) return this;
        this.classList.add("is-loading");
        this.#videoElementContainer.appendChild(this.querySelector("template").content.firstElementChild.cloneNode(true));
        if (this.#type === "html5") {
            this.#player = this.querySelector("video");
            if (this.#loadingIndicator) this.#loadingIndicator.setAttribute("hidden", "");
            if (this.#playButton) {
                this.#playButton.removeAttribute("hidden");
                this.#playButton.addEventListener("click", this.#boundPlay);
            }
            this.#player.addEventListener("play", (() => {
                this.#isPlaying = true;
                this.classList.add("is-playing");
                this.classList.remove("is-suspended");
                if (this.hasAttribute("data-controls")) {
                    this.#player.setAttribute("controls", "controls");
                }
                if (this.#posterElement) this.#posterElement.classList.add("is-hidden");
                if (this.#loadingIndicator) this.#loadingIndicator.setAttribute("hidden", "");
                this.dispatchEvent(new CustomEvent("on:video-player:playing", {
                    detail: {
                        player: this.#player
                    }
                }));
            }));
            this.#player.addEventListener("pause", (() => {
                this.#isPlaying = false;
                this.classList.remove("is-playing");
                if (this.hasAttribute("data-controls") && this.#type !== "html5") {
                    this.#player.removeAttribute("controls");
                }
                this.dispatchEvent(new CustomEvent("on:video-player:paused", {
                    detail: {
                        player: this.#player
                    }
                }));
            }));
            this.#player.addEventListener("suspend", (() => {
                this.classList.add("is-suspended");
                this.dispatchEvent(new CustomEvent("on:video-player:suspended", {
                    detail: {
                        player: this.#player
                    }
                }));
            }));
            this.dispatchEvent(new CustomEvent("on:video-player:ready", {
                detail: {
                    player: this.#player
                }
            }));
            this.classList.remove("is-loading");
            this.setAttribute("loaded", "");
        } else if (this.#type === "youtube") {
            if (VideoPlayer.YoutubeAPIStatus === "LOADED") {
                this.#initYoutubePlayer();
            } else {
                document.addEventListener("on:youtube-api:loaded", this.#initYoutubePlayer.bind(this), {
                    once: true
                });
            }
        } else if (this.#type === "vimeo") {
            if (VideoPlayer.VimeoAPIStatus === "LOADED") {
                this.#initVimeoPlayer();
            } else {
                document.addEventListener("on:vimeo-api:loaded", this.#initVimeoPlayer.bind(this), {
                    once: true
                });
            }
        }
        return this;
    }
    #initYoutubePlayer() {
        if (this.hasAttribute("loaded")) return;
        const iframe = this.querySelector("iframe");
        if (!iframe || VideoPlayer.YoutubeAPIStatus !== "LOADED") return;
        this.classList.add("is-loading");
        if (this.#loadingIndicator) this.#loadingIndicator.removeAttribute("hidden");
        this.#player = new window.YT.Player(iframe, {
            events: {
                onReady: () => {
                    this.#handleHostedPlayerReadyEvent();
                },
                onStateChange: ({data: data}) => {
                    if (data === window.YT.PlayerState.PLAYING) {
                        this.#handleHostedPlayerPlayEvent();
                    } else if (data === window.YT.PlayerState.PAUSED) {
                        this.#handleHostedPlayerPauseEvent();
                    } else if (data === window.YT.PlayerState.ENDED) {
                        this.#handleHostedPlayerEndEvent();
                    }
                }
            }
        });
    }
    #initVimeoPlayer() {
        if (this.hasAttribute("loaded")) return;
        const iframe = this.querySelector("iframe");
        if (!iframe || VideoPlayer.VimeoAPIStatus !== "LOADED") return;
        this.classList.add("is-loading");
        if (this.#loadingIndicator) this.#loadingIndicator.removeAttribute("hidden");
        this.#player = new window.Vimeo.Player(iframe);
        this.#player.on("loaded", (() => {
            this.#handleHostedPlayerReadyEvent();
        }));
        this.#player.on("play", (() => {
            this.#handleHostedPlayerPlayEvent();
        }));
        this.#player.on("pause", (() => {
            this.#handleHostedPlayerPauseEvent();
        }));
        this.#player.on("ended", (() => {
            this.#handleHostedPlayerEndEvent();
        }));
    }
    #handleHostedPlayerReadyEvent() {
        this.#loading = false;
        this.setAttribute("loaded", "");
        this.classList.remove("is-loading");
        if (this.#loadingIndicator) this.#loadingIndicator.setAttribute("hidden", "");
        if (this.#playButton) {
            this.#playButton.removeAttribute("hidden");
            this.#playButton.addEventListener("click", this.#boundPlay);
        }
        this.dispatchEvent(new CustomEvent("on:video-player:ready", {
            detail: {
                player: this.#player
            }
        }));
    }
    #handleHostedPlayerPlayEvent() {
        this.#isPlaying = true;
        this.classList.add("is-playing");
        this.classList.remove("is-suspended");
        if (this.#posterElement) this.#posterElement.classList.add("is-hidden");
        if (this.#playButton) {
            this.#playButton.setAttribute("hidden", "");
        }
        this.dispatchEvent(new CustomEvent("on:video-player:playing", {
            detail: {
                player: this.#player
            }
        }));
    }
    #handleHostedPlayerPauseEvent() {
        this.#isPlaying = false;
        this.classList.remove("is-playing");
        this.dispatchEvent(new CustomEvent("on:video-player:paused", {
            detail: {
                player: this.#player
            }
        }));
    }
    #handleHostedPlayerEndEvent() {
        this.#isPlaying = false;
        this.classList.remove("is-playing");
        this.dispatchEvent(new CustomEvent("on:video-player:ended", {
            detail: {
                player: this.#player
            }
        }));
    }
    play() {
        if (this.#isPlaying) return this;
        if (this.#player && this.#type === "html5") {
            this.#player.play().catch((e => {
                if (e.name === "NotAllowedError") {
                    if (this.#posterElement) this.#posterElement.classList.remove("is-hidden");
                    this.#player.pause();
                }
            }));
        } else if (this.#player && this.#type === "youtube" && this.hasAttribute("loaded")) {
            this.#player.playVideo();
        } else if (this.#player && this.#type === "vimeo" && this.hasAttribute("loaded")) {
            this.#player.play();
        } else if (!this.#isPlayScheduled) {
            this.#isPlayScheduled = true;
            this.addEventListener("on:video-player:ready", this.#boundPlay, {
                once: true
            });
        }
        return this;
    }
    pause() {
        if (!this.#isPlaying) return this;
        if (this.#player && (this.#type === "html5" || this.#type === "vimeo")) {
            this.#player.pause();
        } else if (this.#player && this.#type === "youtube") {
            this.#player.pauseVideo();
        } else if (this.#isPlayScheduled) {
            this.#isPlayScheduled = false;
            this.removeEventListener("on:video-player:ready", this.#boundPlay);
        }
        return this;
    }
    reset() {
        if (!this.#player) return this;
        if (this.#type === "youtube" || this.#type === "vimeo") this.#player.destroy();
        this.#player = null;
        this.#videoElementContainer.innerHTML = "";
        this.removeAttribute("loaded");
        return this;
    }
    on(type, handler, options) {
        this.addEventListener(type, handler, options);
        return this;
    }
    off(type, handler, options) {
        this.removeEventListener(type, handler, options);
        return this;
    }
    static loadVideoAPI(type) {
        if (type === "youtube" && VideoPlayer.YoutubeAPIStatus === "NOT_LOADED") {
            VideoPlayer.YoutubeAPIStatus = "LOADING";
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
            document.dispatchEvent(new CustomEvent("on:youtube-api:loading"));
            window.onYouTubeIframeAPIReady = () => {
                VideoPlayer.YoutubeAPIStatus = "LOADED";
                document.dispatchEvent(new CustomEvent("on:youtube-api:loaded"));
            };
        } else if (type === "vimeo" && VideoPlayer.VimeoAPIStatus === "NOT_LOADED") {
            VideoPlayer.VimeoAPIStatus = "LOADING";
            const tag = document.createElement("script");
            tag.src = "https://player.vimeo.com/api/player.js";
            document.head.appendChild(tag);
            const intervalId = setInterval((() => {
                if (window.Vimeo) {
                    VideoPlayer.VimeoAPIStatus = "LOADED";
                    document.dispatchEvent(new CustomEvent("on:vimeo-api:loaded"));
                    clearInterval(intervalId);
                }
            }), 100);
        }
    }
}

customElements.define("video-player", VideoPlayer);
//# sourceMappingURL=video-player.js.map
