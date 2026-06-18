/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce, isHidden } from "utils";

class MapsWithDetails extends HTMLElement {
    #detailsElements;
    #mapMediaElements;
    #resizeObserver;
    connectedCallback() {
        this.#detailsElements = this.querySelectorAll("details");
        this.#mapMediaElements = this.querySelectorAll("map-media");
        this.#resizeObserver = new ResizeObserver(debounce(this.#onResize.bind(this), 50));
        this.#resizeObserver.observe(this);
        this.#detailsElements.forEach((details => {
            details.addEventListener("on:accordion:opening", (el => {
                const mapId = el.target.getAttribute("data-map-id-trigger");
                if (mapId) {
                    this.querySelectorAll(".is-active").forEach((activeMap => activeMap.classList.remove("is-active")));
                    this.querySelectorAll(`[data-map-id="${mapId}"]`).forEach((mapHolder => mapHolder.classList.add("is-active")));
                }
            }));
        }));
    }
    #onResize(entries) {
        entries.forEach((({target: target}) => {
            this.#mapMediaElements.forEach((mapMediaElement => {
                if (isHidden(mapMediaElement)) {
                    const mapId = mapMediaElement.getAttribute("id");
                    if (mapId) {
                        const visibleMapMediaContainer = Array.from(target.querySelectorAll(`[data-map-id="${mapId}"]:empty`)).find((el => !isHidden(el)));
                        if (visibleMapMediaContainer) {
                            visibleMapMediaContainer.appendChild(mapMediaElement);
                        }
                    }
                }
            }));
        }));
    }
}

customElements.define("maps-with-details", MapsWithDetails);
//# sourceMappingURL=maps-with-details.js.map
