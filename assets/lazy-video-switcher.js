/*! Copyright (c) Safe As Milk. All rights reserved. */
import { StateSwitch } from "utils";

class LazyVideoSwitcher extends HTMLElement {
    #stateSwitch=null;
    constructor() {
        super();
        this.#stateSwitch = new StateSwitch({
            min: "tab"
        });
        this.isScreenDesktop = this.#stateSwitch.active();
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }
    connectedCallback() {
        this.videos = Array.from(this.children).filter((child => child.tagName === "LAZY-VIDEO" && child.dataset.screenSize));
        if (!this.videos.length) return;
        this.#updateVisibility();
        this.#stateSwitch.on(this.handleVisibilityChange);
    }
    disconnectedCallback() {
        this.#stateSwitch.off(this.handleVisibilityChange);
    }
    handleVisibilityChange() {
        const newIsDesktop = this.#stateSwitch.active();
        if (newIsDesktop !== this.isScreenDesktop) {
            this.isScreenDesktop = newIsDesktop;
            this.#updateVisibility();
        }
    }
    #updateVisibility() {
        this.videos.forEach((video => {
            const isVisible = video.dataset.screenSize === (this.isScreenDesktop ? "desktop" : "mobile");
            video.toggleAttribute("hidden", !isVisible);
        }));
    }
}

customElements.define("lazy-video-switcher", LazyVideoSwitcher);
//# sourceMappingURL=lazy-video-switcher.js.map
