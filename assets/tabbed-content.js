/*! Copyright (c) Safe As Milk. All rights reserved. */
import { Animations } from "animations";

import { debounce } from "utils";

class TabbedContent extends HTMLElement {
    connectedCallback() {
        this.tabs = this.querySelectorAll("tab-triggers button");
        this.tabPanels = this.querySelectorAll("tab-panel");
        this.tabList = this.querySelector("tab-triggers");
        this.currentTab = Array.from(this.tabs).find((el => el.getAttribute("aria-selected") === "true"));
        this.currentTabIndex = Array.from(this.tabs).findIndex((el => el.getAttribute("aria-selected") === "true"));
        this.tabs.forEach((tab => {
            tab.addEventListener("click", (e => this.openTab(e.target.id)));
        }));
        this.tabList.addEventListener("keydown", (e => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                this.tabs[this.currentTabIndex].setAttribute("tabindex", -1);
                if (e.key === "ArrowRight") {
                    this.currentTabIndex += 1;
                    if (this.currentTabIndex >= this.tabs.length) {
                        this.currentTabIndex = 0;
                    }
                } else if (e.key === "ArrowLeft") {
                    this.currentTabIndex -= 1;
                    if (this.currentTabIndex < 0) {
                        this.currentTabIndex = this.tabs.length - 1;
                    }
                }
                this.tabs[this.currentTabIndex].setAttribute("tabindex", 0);
                this.tabs[this.currentTabIndex].focus();
            }
        }));
    }
    openTab(id) {
        if (this.currentTab.id === id) return;
        this.currentTab = Array.from(this.tabs).find((t => t.id === id));
        this.tabList.querySelectorAll('[aria-selected="true"]').forEach((t => {
            t.setAttribute("aria-selected", false);
            t.setAttribute("tabindex", "-1");
        }));
        this.currentTab.setAttribute("aria-selected", true);
        this.currentTab.setAttribute("tabindex", "0");
        Array.from(this.tabPanels).forEach((p => {
            p.setAttribute("hidden", true);
            const animationElement = p.querySelector(".js-animate-sequence");
            Animations.resetAnimations(animationElement);
        }));
        const newSelectedPanel = this.querySelector(`#${this.currentTab.getAttribute("aria-controls")}`);
        newSelectedPanel.removeAttribute("hidden");
    }
}

customElements.define("tabbed-content", TabbedContent);

class TabTriggers extends HTMLElement {
    #triggersObserver;
    constructor() {
        super();
        this.#triggersObserver = null;
        this.alignItems = this.parentElement.getAttribute("align-items") || "left";
    }
    connectedCallback() {
        this.#initTriggersObserver();
        this.#initLinkUpdate();
        const resizeObserver = new ResizeObserver(debounce((() => {
            this.#updateControls();
        }), 50));
        resizeObserver.observe(this);
    }
    #initTriggersObserver() {
        const callback = mutationList => {
            mutationList.forEach((mutation => {
                if (mutation.type === "attributes" && mutation.attributeName === "aria-selected" && mutation.target.getAttribute("aria-selected", "true")) {
                    this.#moveToSelected();
                }
            }));
        };
        this.#triggersObserver = new MutationObserver(callback);
    }
    #initLinkUpdate() {
        const triggers = this.querySelectorAll("button");
        const anchor = this.closest(".section").querySelector(".js-update-link");
        if (anchor) {
            Array.from(triggers).forEach((trigger => {
                trigger.addEventListener("click", (() => {
                    const link = trigger.dataset.updateLink;
                    if (link) {
                        anchor.setAttribute("href", link);
                    }
                }));
            }));
        }
    }
    #moveToSelected() {
        if (![ "left", "center" ].includes(this.alignItems)) return;
        const selected = this.querySelector('[aria-selected="true"]');
        const paddingLeft = Number(window.getComputedStyle(this).paddingLeft.replace("px", ""));
        if (selected) {
            const newPosition = this.alignItems === "left" ? selected.offsetLeft - paddingLeft : selected.offsetLeft - (this.offsetWidth - selected.offsetWidth) / 2;
            this.scrollTo({
                left: newPosition,
                behavior: "smooth"
            });
        }
    }
    #updateControls() {
        if (this.scrollWidth > this.offsetWidth) {
            const triggers = this.querySelectorAll("button");
            Array.from(triggers).forEach((trigger => {
                this.#triggersObserver.observe(trigger, {
                    attributes: true,
                    childList: false,
                    subtree: false
                });
            }));
            this.#moveToSelected();
        } else {
            this.#triggersObserver.disconnect();
        }
    }
}

customElements.define("tab-triggers", TabTriggers);
//# sourceMappingURL=tabbed-content.js.map
