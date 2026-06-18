/*! Copyright (c) Safe As Milk. All rights reserved. */
class ImageCompare extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        [ "input", "change" ].forEach((eventName => {
            this.querySelector("input").addEventListener(eventName, (({target: target}) => {
                if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
                this.animationFrame = requestAnimationFrame((() => {
                    this.style.setProperty("--exposure", `${target.value}%`);
                }));
            }));
        }));
        function easeInOutBack(x) {
            const c1 = 1.70158;
            const c2 = c1 * 1.525;
            return x < .5 ? (2 * x) ** 2 * ((c2 + 1) * 2 * x - c2) / 2 : ((2 * x - 2) ** 2 * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
        }
        function animate(options) {
            const start = performance.now();
            requestAnimationFrame((function animate(time) {
                let timeFraction = (time - start) / options.duration;
                if (timeFraction > 1) timeFraction = 1;
                const progress = options.timing(timeFraction);
                options.draw(progress, options.element, options.start);
                if (timeFraction < 1) {
                    requestAnimationFrame(animate);
                }
            }));
        }
        const imageCompareObserver = new IntersectionObserver(((entries, observer) => {
            entries.forEach((slider => {
                if (slider.isIntersecting) {
                    animate({
                        duration: 1e3,
                        timing: easeInOutBack,
                        element: slider.target,
                        start: slider.target.dataset.startPoint,
                        draw(progress, element, start) {
                            const fraction = 15;
                            const formula = start - fraction + progress * fraction;
                            element.style.setProperty("--exposure", `${formula}%`);
                            element.querySelector("input").value = formula;
                            element.setAttribute("animated", "");
                        }
                    });
                    imageCompareObserver.unobserve(slider.target);
                }
            }));
        }), {
            threshold: .6
        });
        this.style.setProperty("--exposure", `${this.dataset.startPoint - 15}%`);
        this.querySelector("input").value = this.dataset.startPoint - 15;
        imageCompareObserver.observe(this);
    }
}

customElements.define("image-compare", ImageCompare);
//# sourceMappingURL=image-compare.js.map
