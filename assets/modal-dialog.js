/*! Copyright (c) Safe As Milk. All rights reserved. */
import A11yDialog from "a11y-dialog";

class ModalDialog extends HTMLElement {
    #dialog;
    #boundOnOpening;
    #boundOnClosing;
    #boundOnShow;
    #boundOnHide;
    constructor() {
        super();
        this.movedModalsElementId = "moved-modal-elements";
        const movedModalsElement = document.getElementById(this.movedModalsElementId);
        if (Object.hasOwn(this.dataset, "moveToModalsElement") && movedModalsElement) {
            movedModalsElement.appendChild(this);
        }
        this.#boundOnOpening = this.#onOpening.bind(this);
        this.#boundOnClosing = this.#onClosing.bind(this);
        this.#boundOnShow = this.#onShow.bind(this);
        this.#boundOnHide = this.#onHide.bind(this);
    }
    connectedCallback() {
        this.init();
    }
    disconnectedCallback() {
        this.destroy();
    }
    get shown() {
        return this.#dialog.shown;
    }
    init() {
        this.#dialog = new A11yDialog(this);
        this.content = this.querySelector('[role="document"]');
        document.querySelectorAll(`[data-a11y-dialog-show="${this.#dialog.id}"]`).forEach((trigger => {
            trigger.addEventListener("click", ModalDialog.#onTriggerClick);
        }));
        this.#dialog.on("opening", this.#boundOnOpening).on("show", this.#boundOnShow).on("closing", this.#boundOnClosing).on("hide", this.#boundOnHide);
    }
    destroy() {
        document.querySelectorAll(`[data-a11y-dialog-show="${this.#dialog.id}"]`).forEach((trigger => {
            trigger.removeEventListener("click", ModalDialog.#onTriggerClick);
        }));
        this.#dialog.off("opening", this.#boundOnOpening).off("show", this.#boundOnShow).off("closing", this.#boundOnClosing).off("hide", this.#boundOnHide);
        this.removeAttribute("aria-modal");
        this.removeAttribute("tabindex");
        this.removeAttribute("role");
    }
    async open(openElementAfterClose = null) {
        if (openElementAfterClose && openElementAfterClose instanceof HTMLElement && openElementAfterClose.tagName === "MODAL-DIALOG") {
            this.#dialog.on("hide", (() => openElementAfterClose.open()), {
                once: true
            });
        }
        this.#dialog.show();
        return new Promise((resolve => {
            if (!this.#dialog.shown) {
                this.#dialog.on("show", (() => {
                    resolve();
                }), {
                    once: true
                });
            } else {
                resolve();
            }
        }));
    }
    openInstantly() {
        this.content.style.animation = "none";
        this.#dialog.show();
        this.content.style.animation = null;
    }
    async close() {
        this.#dialog.hide();
        return new Promise((resolve => {
            if (this.#dialog.shown) {
                this.#dialog.on("hide", (() => {
                    resolve();
                }), {
                    once: true
                });
            } else {
                resolve();
            }
        }));
    }
    closeInstantly() {
        this.content.style.animation = "none";
        this.#dialog.hide();
        this.content.style.animation = null;
    }
    on(type, handler, options) {
        this.addEventListener(type, handler, options);
        return this;
    }
    off(type, handler, options) {
        this.removeEventListener(type, handler, options);
        return this;
    }
    #onOpening() {
        this.dispatchEvent(new CustomEvent("on:modal:opening"));
        document.body.classList.add("u-scroll-disabled");
    }
    #onClosing() {
        this.dispatchEvent(new CustomEvent("on:modal:closing"));
    }
    #onShow() {
        this.dispatchEvent(new CustomEvent("on:modal:opened"));
    }
    #onHide() {
        this.dispatchEvent(new CustomEvent("on:modal:closed"));
        document.body.classList.remove("u-scroll-disabled");
    }
    static #onTriggerClick(event) {
        event.preventDefault();
    }
}

customElements.define("modal-dialog", ModalDialog);

export default ModalDialog;
//# sourceMappingURL=modal-dialog.js.map
