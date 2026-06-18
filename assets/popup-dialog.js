/*! Copyright (c) Safe As Milk. All rights reserved. */
import A11yDialog from "a11y-dialog";

import Cookies from "js-cookie";

import { ResumableInterval } from "utils";

class PopupDialog extends HTMLElement {
    #dialog;
    #boundOnOpening;
    #boundOnClosing;
    #boundOnShow;
    #boundOnHide;
    #boundOnMouseEnter;
    #boundOnMouseLeave;
    constructor() {
        super();
        this.movedModalsElementId = "moved-modal-elements";
        const movedModalsElement = document.getElementById(this.movedModalsElementId);
        if (movedModalsElement && window.Shopify?.designMode) {
            const existingMovedPopup = movedModalsElement.querySelector(`#${this.id}`);
            if (existingMovedPopup) existingMovedPopup.remove();
        }
        if (Object.hasOwn(this.dataset, "moveToModalsElement") && movedModalsElement) {
            movedModalsElement.appendChild(this);
        }
        this.#boundOnOpening = this.#onOpening.bind(this);
        this.#boundOnClosing = this.#onClosing.bind(this);
        this.#boundOnShow = this.#onShow.bind(this);
        this.#boundOnHide = this.#onHide.bind(this);
        this.#boundOnMouseEnter = this.#onMouseEnter.bind(this);
        this.#boundOnMouseLeave = this.#onMouseLeave.bind(this);
    }
    connectedCallback() {
        this.#dialog = new A11yDialog(this);
        this.content = this.querySelector('[role="document"]');
        this.disableBodyScroll = this.hasAttribute("data-disable-body-scroll");
        this.openOnPageLoad = null;
        this.rememberState = null;
        if (this.hasAttribute("data-open-on-page-load")) {
            const value = this.getAttribute("data-open-on-page-load");
            const number = Number(value);
            this.openOnPageLoad = true;
            if (number) {
                this.openOnPageLoad = number;
            }
        }
        if (this.hasAttribute("data-remember-state")) {
            const value = this.getAttribute("data-remember-state");
            const number = Number(value);
            this.rememberState = true;
            if (number) {
                this.rememberState = number;
            }
        }
        this.dismissAfterInterval = Number(this.getAttribute("data-dismiss-after-interval") || 0);
        document.querySelectorAll(`[data-a11y-dialog-show="${this.#dialog.id}"]`).forEach((trigger => {
            trigger.addEventListener("click", PopupDialog.#onTriggerClick);
        }));
        this.#dialog.on("opening", this.#boundOnOpening).on("show", this.#boundOnShow).on("closing", this.#boundOnClosing).on("hide", this.#boundOnHide);
        if (this.rememberState && !Cookies.get(this.id) && this.openOnPageLoad || !this.rememberState && this.openOnPageLoad) {
            if (typeof this.openOnPageLoad === "number") {
                setTimeout((() => {
                    this.open();
                }), this.openOnPageLoad);
            } else {
                this.open();
            }
        }
        if (this.dismissAfterInterval) {
            this.interval = new ResumableInterval({
                interval: this.dismissAfterInterval,
                callback: () => {
                    this.close();
                }
            });
            this.content.addEventListener("mouseenter", this.#boundOnMouseEnter);
            this.content.addEventListener("mouseleave", this.#boundOnMouseLeave);
        }
    }
    disconnectedCallback() {
        if (this.#dialog) {
            document.querySelectorAll(`[data-a11y-dialog-show="${this.#dialog.id}"]`).forEach((trigger => {
                trigger.removeEventListener("click", PopupDialog.#onTriggerClick);
            }));
            this.#dialog.off("opening", this.#boundOnOpening).off("show", this.#boundOnShow).off("closing", this.#boundOnClosing).off("hide", this.#boundOnHide);
        }
        this.content?.removeEventListener("mouseenter", this.#boundOnMouseEnter);
        this.content?.removeEventListener("mouseleave", this.#boundOnMouseLeave);
        this.interval = null;
    }
    get shown() {
        return this.#dialog.shown;
    }
    async open() {
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
        if (this.interval) {
            this.interval.reset();
        }
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
        this.dispatchEvent(new CustomEvent("on:popup:opening"));
        if (this.disableBodyScroll) document.body.classList.add("u-scroll-disabled");
    }
    #onClosing() {
        this.dispatchEvent(new CustomEvent("on:popup:closing"));
    }
    #onShow() {
        this.dispatchEvent(new CustomEvent("on:popup:opened"));
        if (this.interval) {
            this.interval.start();
        }
    }
    #onHide() {
        this.dispatchEvent(new CustomEvent("on:popup:closed"));
        if (this.disableBodyScroll) document.body.classList.remove("u-scroll-disabled");
        if (this.rememberState) {
            Cookies.set(this.id, "1", {
                ...typeof this.rememberState === "number" ? {
                    expires: this.rememberState
                } : {},
                path: "/",
                secure: true,
                SameSite: "None"
            });
        }
    }
    #onMouseEnter() {
        if (this.interval) {
            this.interval.stop();
        }
    }
    #onMouseLeave() {
        if (this.interval) {
            this.interval.resume();
        }
    }
    static #onTriggerClick(event) {
        event.preventDefault();
    }
}

customElements.define("popup-dialog", PopupDialog);

export default PopupDialog;
//# sourceMappingURL=popup-dialog.js.map
