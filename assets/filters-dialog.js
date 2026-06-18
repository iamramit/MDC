/*! Copyright (c) Safe As Milk. All rights reserved. */
import ModalDialog from "modal-dialog";

import { StateSwitch } from "utils";

class FiltersDialog extends ModalDialog {
    #boundHandleMediaQueryChange;
    #initiated;
    #stateSwitch=null;
    constructor() {
        super();
        this.#boundHandleMediaQueryChange = this.#handleMediaQueryChange.bind(this);
    }
    connectedCallback() {
        this.disableOnDesktop = this.hasAttribute("data-disable-modal-on-desktop");
        if (this.disableOnDesktop) {
            this.#stateSwitch = new StateSwitch({
                max: "desk"
            });
            this.#initiated = false;
            if (this.#stateSwitch.active()) this.init();
            this.#stateSwitch.on(this.#boundHandleMediaQueryChange);
        } else {
            this.init();
        }
    }
    disconnectedCallback() {
        if (this.#initiated) {
            this.destroy();
        }
        if (this.#stateSwitch) this.#stateSwitch.off(this.#boundHandleMediaQueryChange);
    }
    init() {
        this.querySelector("aside").setAttribute("role", "document");
        this.setAttribute("aria-hidden", "true");
        this.classList.add("modal", "modal--filters");
        this.#initiated = true;
        super.init();
    }
    destroy() {
        this.querySelector("aside").removeAttribute("role");
        this.removeAttribute("aria-hidden");
        this.classList.remove("modal", "modal--filters");
        this.#initiated = false;
        super.destroy();
    }
    async #handleMediaQueryChange(e) {
        if (e.matches && !this.#initiated) {
            this.init();
        } else if (this.#initiated) {
            await this.close();
            this.destroy();
        }
    }
}

customElements.define("filters-dialog", FiltersDialog);
//# sourceMappingURL=filters-dialog.js.map
