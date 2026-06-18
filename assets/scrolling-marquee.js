/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce } from "utils";

class ScrollingMarquee extends HTMLElement {
    #debouncedSetMarqueeSpeed;
    constructor() {
        super();
        this.#debouncedSetMarqueeSpeed = debounce(this.#setMarqueeSpeed.bind(this), 50);
    }
    connectedCallback() {
        this.marqueeContainer = this.querySelector(".marquee");
        this.marqueeElements = Array.from(this.querySelectorAll(".marquee__content"));
        this.resizeObserver = new ResizeObserver(this.#debouncedSetMarqueeSpeed);
        this.resizeObserver.observe(this.marqueeContainer);
        this.#setMarqueeSpeed();
    }
    disconnectedCallback() {
        this.resizeObserver.unobserve(this.marqueeContainer);
    }
    #setMarqueeSpeed() {
        const marqueeComputedStyle = window.getComputedStyle(this.marqueeContainer);
        const gapValue = parseInt(marqueeComputedStyle.getPropertyValue("column-gap"), 10);
        const speed = (parseFloat(this.getAttribute("marquee-speed")) || 0) * 10;
        this.marqueeElements.forEach((element => {
            const elementWidth = element.offsetWidth + gapValue;
            const timeTaken = elementWidth / speed;
            element.style.animationDuration = `${timeTaken}s`;
        }));
    }
}

customElements.define("scrolling-marquee", ScrollingMarquee);
//# sourceMappingURL=scrolling-marquee.js.map
