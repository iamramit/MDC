/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce, removeTrapFocus, trapFocus } from "utils";

class DrawerMenu extends HTMLElement {
    #boundCloseAllOpenPanels;
    constructor() {
        super();
        this.#boundCloseAllOpenPanels = this.closeAllOpenPanels.bind(this);
    }
    connectedCallback() {
        this.modal = this.closest("modal-dialog");
        this.bannerHeightObserver = null;
        this.setCurrentPanelId();
        this.bindEvents();
        this.modal.addEventListener("on:modal:closed", this.#boundCloseAllOpenPanels);
    }
    disconnectedCallback() {
        this.modal.removeEventListener("on:modal:closed", this.#boundCloseAllOpenPanels);
    }
    setCurrentPanelId() {
        const currentPanel = Array.from(this.querySelectorAll("details[open]")).pop();
        this.currentPanelId = currentPanel ? currentPanel.id : null;
    }
    bindEvents() {
        this.querySelectorAll("summary").forEach((summary => summary.addEventListener("click", this.onSummaryClick.bind(this))));
        this.querySelectorAll("button").forEach((button => button.addEventListener("click", this.onCloseButtonClick.bind(this))));
    }
    enableBannerHeightControl(banner) {
        if (!banner) return;
        this.bannerHeightObserver = new ResizeObserver(debounce((entries => {
            entries.forEach((entry => {
                entry.target.style.setProperty("--banner-height", `${Math.round(entry.contentRect.height)}px`);
            }));
        }), 10));
        this.bannerHeightObserver.observe(banner);
    }
    disableBannerHeightControl() {
        if (!this.bannerHeightObserver) return;
        this.bannerHeightObserver.disconnect();
        this.bannerHeightObserver = null;
    }
    onSummaryClick(event) {
        const summaryElement = event.currentTarget;
        const detailsElement = summaryElement.parentNode;
        const isOpen = detailsElement.hasAttribute("open");
        if (detailsElement === this.mainDetailsToggle) {
            if (isOpen) event.preventDefault();
            if (isOpen) {
                this.closeMenuDrawer(event, summaryElement);
            } else {
                this.openMenuDrawer(summaryElement);
            }
        } else {
            setTimeout((() => {
                this.currentPanelId = this.openPanel(detailsElement);
            }), 100);
        }
    }
    onCloseButtonClick(event) {
        const detailsElement = event.currentTarget.closest("details");
        this.closeSubmenu(detailsElement);
    }
    closeSubmenu(detailsElement, animate = true) {
        detailsElement.classList.remove("is-opening");
        detailsElement.querySelector("summary").setAttribute("aria-expanded", false);
        const openParent = detailsElement.parentElement.closest("details[open]");
        const parentBanner = openParent ? document.getElementById(`${openParent.id}-banner`) : null;
        this.disableBannerHeightControl();
        if (!parentBanner) {
            detailsElement.closest(".modal").classList.remove("has-banner");
        } else {
            detailsElement.closest(".modal").classList.add("has-banner");
            this.enableBannerHeightControl(parentBanner);
        }
        removeTrapFocus(detailsElement.querySelector("summary"));
        if (animate) {
            DrawerMenu.closeAnimation(detailsElement);
        } else {
            detailsElement.removeAttribute("open");
            if (detailsElement.closest("details[open]")) {
                trapFocus(detailsElement.closest("details[open]"), detailsElement.querySelector("summary"));
            }
        }
        this.currentPanelId = openParent ? openParent.id : null;
    }
    static closeAnimation(detailsElement) {
        let animationStart;
        const handleAnimation = time => {
            if (animationStart === undefined) {
                animationStart = time;
            }
            const elapsedTime = time - animationStart;
            if (elapsedTime < 400) {
                window.requestAnimationFrame(handleAnimation);
            } else {
                detailsElement.removeAttribute("open");
                if (detailsElement.closest("details[open]")) {
                    trapFocus(detailsElement.closest("details[open]"), detailsElement.querySelector("summary"));
                }
            }
        };
        window.requestAnimationFrame(handleAnimation);
    }
    openMenuPanelById(id, animate = true, focus = true) {
        const detailsElement = document.getElementById(id);
        if (!detailsElement) return;
        this.closeAllOpenPanels();
        const parentPanel = detailsElement.parentElement.closest("details");
        if (parentPanel) {
            parentPanel.setAttribute("open", "");
            if (animate) {
                setTimeout((() => {
                    this.openPanel(parentPanel, false);
                }), 100);
            } else {
                this.openPanel(parentPanel, false);
            }
        }
        detailsElement.setAttribute("open", "");
        if (animate) {
            setTimeout((() => {
                this.currentPanelId = this.openPanel(detailsElement, focus);
            }), 100);
        } else {
            this.currentPanelId = this.openPanel(detailsElement, focus);
        }
    }
    openPanel(detailsElement, focus = true) {
        const summaryElement = detailsElement.querySelector("summary");
        const banner = document.getElementById(`${detailsElement.id}-banner`);
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        function addTrapFocus() {
            trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector("button"));
            summaryElement.nextElementSibling.removeEventListener("transitionend", addTrapFocus);
        }
        this.disableBannerHeightControl();
        if (banner) {
            this.enableBannerHeightControl(banner);
            detailsElement.closest(".modal").classList.add("has-banner");
        } else {
            detailsElement.closest(".modal").classList.remove("has-banner");
        }
        detailsElement.classList.add("is-opening");
        summaryElement.setAttribute("aria-expanded", true);
        if (focus) {
            if (!reducedMotion || reducedMotion.matches) {
                addTrapFocus();
            } else {
                summaryElement.nextElementSibling.addEventListener("transitionend", addTrapFocus);
            }
        }
        return detailsElement.id;
    }
    closeAllOpenPanels() {
        const currentlyOpenPanels = this.querySelectorAll("details[open]");
        currentlyOpenPanels.forEach((panel => {
            this.closeSubmenu(panel, false);
        }));
    }
}

customElements.define("drawer-menu", DrawerMenu);
//# sourceMappingURL=drawer-menu.js.map
