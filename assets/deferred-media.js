/*! Copyright (c) Safe As Milk. All rights reserved. */
class DeferredMedia extends HTMLElement {
    constructor() {
        super();
        const poster = this.querySelector("media-poster");
        if (!poster) return;
        poster.addEventListener("click", this.loadContent.bind(this), {
            once: true
        });
    }
    loadContent(focus = true) {
        if (!this.getAttribute("loaded")) {
            const content = document.createElement("div");
            content.appendChild(this.querySelector("template").content.firstElementChild.cloneNode(true));
            this.setAttribute("loaded", true);
            const deferredElement = this.appendChild(content.querySelector("video, model-viewer, iframe"));
            if (focus) deferredElement.focus();
        }
    }
}

customElements.define("deferred-media", DeferredMedia);

export default DeferredMedia;
//# sourceMappingURL=deferred-media.js.map
