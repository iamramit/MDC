/*! Copyright (c) Safe As Milk. All rights reserved. */
class CountdownTimer extends HTMLElement {
    static get observedAttributes() {
        return [ "data-year", "data-month", "data-day", "data-hour", "data-minute", "data-completion", "data-completion-hide-class", "data-is-default" ];
    }
    constructor() {
        super();
        this.intervalId = null;
        this.updateCountdown = this.updateCountdown.bind(this);
    }
    connectedCallback() {
        this.#initializeElements();
        this.startCountdown();
        this.setAttribute("loaded", "");
    }
    disconnectedCallback() {
        this.stopCountdown();
    }
    attributeChangedCallback(_, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.#initializeElements();
            this.startCountdown();
        }
    }
    #initializeElements() {
        this.isDefault = this.getAttribute("data-is-default") === "true";
        if (!this.isDefault) {
            this.targetDate = new Date(this.#parseAttributeToInt("data-year", 0), this.#parseAttributeToInt("data-month", 1) - 1, this.#parseAttributeToInt("data-day", 0), this.#parseAttributeToInt("data-hour", 0), this.#parseAttributeToInt("data-minute", 0));
        } else {
            this.targetDate = new Date;
            this.targetDate.setHours(24, 0, 0, 0);
        }
        this.completion = this.getAttribute("data-completion");
        this.completionHideClass = this.getAttribute("data-completion-hide-class");
        this.daysElement = this.querySelector('.countdown__unit[data-unit="days"] .countdown__value');
        this.daysDivider = this.querySelector('.countdown__unit[data-unit="days"] + .countdown__divider');
        this.hoursElement = this.querySelector('.countdown__unit[data-unit="hours"] .countdown__value');
        this.minutesElement = this.querySelector('.countdown__unit[data-unit="minutes"] .countdown__value');
        this.secondsElement = this.querySelector('.countdown__unit[data-unit="seconds"] .countdown__value');
        this.countdownGrid = this.querySelector(".countdown");
        this.completionMessage = this.querySelector(".countdown__completion-message");
        this.#setAriaLabel();
    }
    startCountdown() {
        this.stopCountdown();
        this.intervalId = setInterval(this.updateCountdown, 1e3);
        this.updateCountdown();
        this.#dispatchEvent("on:countdown:start");
    }
    stopCountdown() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.#dispatchEvent("on:countdown:stop");
        }
    }
    updateCountdown() {
        const distance = this.targetDate - Date.now();
        if (distance < 0) {
            this.#handleCompletion();
            this.stopCountdown();
            this.#dispatchEvent("on:countdown:completed");
            return;
        }
        const {days: days, hours: hours, minutes: minutes, seconds: seconds} = CountdownTimer.#calculateCountdown(distance);
        this.#displayCountdown(days, hours, minutes, seconds);
    }
    #handleCompletion() {
        this.#displayCountdown(0, 0, 0, 0);
        this.#hideSectionTextBlocks();
        if (this.completion === "hide" && this.completionHideClass) {
            const parentElement = this.closest(this.completionHideClass);
            if (parentElement) parentElement.setAttribute("hidden", true);
        } else if (this.completion === "zero-with-message" && this.completionMessage) {
            this.completionMessage.removeAttribute("hidden");
            this.completionMessage.setAttribute("role", "alert");
            this.completionMessage.setAttribute("aria-live", "assertive");
            if (this.completionHideClass !== ".product-single__countdown") return;
            const pdpCountdown = this.closest(".product-single__countdown__content");
            if (pdpCountdown) {
                const countdownText = pdpCountdown.querySelector(".product-single__countdown__text");
                if (countdownText) {
                    countdownText.setAttribute("hidden", true);
                }
            }
        }
    }
    #hideSectionTextBlocks() {
        const container = this.parentElement.parentElement;
        const selector = ".image-banner__content__block[data-hide-block]";
        const elementsToHide = container.querySelectorAll(selector);
        elementsToHide.forEach((el => {
            el.setAttribute("hidden", true);
        }));
    }
    #displayCountdown(days, hours, minutes, seconds) {
        const formatCount = count => count.toString().padStart(2, "0");
        if (this.daysElement) {
            const formattedDays = formatCount(days);
            this.daysElement.textContent = formattedDays;
            if (days > 99) {
                this.daysElement.style.width = `${formattedDays.length}.5ch`;
            }
            if (days === 0) {
                this.daysElement.parentElement.setAttribute("hidden", true);
                if (this.daysDivider) this.daysDivider.setAttribute("hidden", true);
                if (this.countdownGrid) this.countdownGrid.style.gridTemplateColumns = "1fr 0fr 1fr 0fr 1fr";
            }
        }
        if (this.hoursElement) {
            this.hoursElement.textContent = formatCount(hours);
        }
        if (this.minutesElement) {
            this.minutesElement.textContent = formatCount(minutes);
        }
        if (this.secondsElement) {
            this.secondsElement.textContent = formatCount(seconds);
        }
    }
    #dispatchEvent(name, detail = {}) {
        this.dispatchEvent(new CustomEvent(name, {
            detail: detail
        }));
    }
    #parseAttributeToInt(attrName, defaultValue) {
        const attrValue = this.getAttribute(attrName);
        const parsedValue = parseInt(attrValue, 10);
        return Number.isNaN(parsedValue) ? defaultValue : parsedValue;
    }
    #setAriaLabel() {
        const options = {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "numeric"
        };
        const targetDateStr = this.targetDate.toLocaleDateString(undefined, options);
        this.setAttribute("aria-label", `Countdown to ${targetDateStr}`);
    }
    static #calculateCountdown(distance) {
        const days = Math.floor(distance / (1e3 * 60 * 60 * 24));
        const hours = Math.floor(distance % (1e3 * 60 * 60 * 24) / (1e3 * 60 * 60));
        const minutes = Math.floor(distance % (1e3 * 60 * 60) / (1e3 * 60));
        const seconds = Math.floor(distance % (1e3 * 60) / 1e3);
        return {
            days: days,
            hours: hours,
            minutes: minutes,
            seconds: seconds
        };
    }
}

customElements.define("countdown-timer", CountdownTimer);
//# sourceMappingURL=countdown-timer.js.map
