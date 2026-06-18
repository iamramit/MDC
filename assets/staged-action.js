/*! Copyright (c) Safe As Milk. All rights reserved. */
const STATES = [ "IDLE", "DOING", "DONE" ];

class StagedAction extends HTMLElement {
    #tick;
    #duration=1500;
    constructor() {
        super();
        this.#tick = this.querySelector("staged-action-tick");
    }
    setState(state = STATES[0]) {
        return new Promise(((resolve, reject) => {
            if (!STATES.includes(state)) reject(new Error("Invalid state"));
            if (state === STATES[0]) {
                this.classList.remove("is-done");
                this.classList.remove("is-doing");
                resolve("Idle");
            }
            if (state === STATES[1]) {
                this.classList.remove("is-done");
                this.classList.add("is-doing");
                resolve("Doing");
            }
            if (state === STATES[2]) {
                this.classList.remove("is-doing");
                this.classList.add("is-done");
                const tickAnimations = this.#tick.getAnimations();
                if (tickAnimations.length > 0) {
                    this.#tick.addEventListener("animationend", (() => {
                        this.classList.remove("is-done");
                        resolve("Done");
                    }));
                } else {
                    setTimeout((() => {
                        this.classList.remove("is-done");
                        resolve("Done");
                    }), this.#duration);
                }
            }
        }));
    }
}

customElements.define("staged-action", StagedAction);
//# sourceMappingURL=staged-action.js.map
