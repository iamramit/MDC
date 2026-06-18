/*! Copyright (c) Safe As Milk. All rights reserved. */
import { animate, glide, inView, stagger } from "motion";

import { ANIMATION_LOAD, ANIMATION_INTERVAL, ANIMATION_INTERVAL_STYLE } from "store-data";

import { debounce } from "utils";

const ALLOWED_SETTINGS_KEYS = [ "amount", "delay", "displacement", "duration", "interval", "scale", "selector" ];

class Animations {
    #boundUpdateScrollDelta;
    #displacement;
    #duration;
    #interval;
    #reducedMotionMediaQuery;
    #previousScrollPosition;
    #scrollDelta=0;
    static #instantiated=false;
    constructor(displacement = 10, duration = .5, interval = ANIMATION_INTERVAL) {
        if (Animations.#instantiated) throw new Error("Animations instance already exists");
        Animations.#instantiated = true;
        if (!ANIMATION_LOAD) return;
        this.#reducedMotionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        this.#displacement = ANIMATION_INTERVAL_STYLE !== "fade_in" ? displacement : 0;
        this.#duration = duration;
        this.#interval = interval;
        this.#previousScrollPosition = window.scrollY || document.documentElement.scrollTop;
        this.#boundUpdateScrollDelta = this.#updateScrollDelta.bind(this);
        this.setup();
        Animations.#revealOnPageLoad();
        window.addEventListener("scroll", debounce(this.#boundUpdateScrollDelta, 16));
        window.addEventListener("scrollend", this.#boundUpdateScrollDelta);
    }
    setupSingle(element) {
        if (!ANIMATION_LOAD) return;
        if (!element) throw new Error("Element must be provided for animation");
        let amount = element.dataset.animationAmount ? Number(element.dataset.animationAmount) : 0;
        if (amount < 0) {
            amount = 0;
        } else if (amount >= 1) {
            amount = .99;
        }
        const settings = {
            delay: element.dataset.animationDelay ? parseFloat(element.dataset.animationDelay) : 0,
            displacement: (element.dataset.animationDisplacement ? Number(element.dataset.animationDisplacement) : this.#displacement) * (ANIMATION_INTERVAL_STYLE === "fade_down" ? -1 : 1),
            duration: element.dataset.animationDuration ? parseFloat(element.dataset.animationDuration) : this.#duration,
            scale: element.dataset.animationScale ? parseFloat(element.dataset.animationScale) : 1
        };
        const transform = `matrix(${settings.scale}, 0, 0, ${settings.scale}, 0, ${settings.displacement})`;
        element.style.setProperty("opacity", 0);
        element.style.setProperty("transform", transform);
        inView(element, (info => {
            const {target: target} = info;
            const animation = animate(target, {
                opacity: 1,
                transform: `matrix(1, 0, 0, 1, 0, 0)`
            }, {
                autoplay: false,
                delay: settings.delay,
                duration: this.#reducedMotionMediaQuery.matches ? 0 : settings.duration,
                easing: glide()
            });
            animation.play();
            animation.finished.then((() => {
                target.classList.add("js-animation-done");
                target.style.removeProperty("opacity");
                target.style.removeProperty("transform");
            }));
            element.animations = [ {
                animation: animation,
                transformSettings: {
                    elements: [ target ],
                    transform: transform
                }
            } ];
            return () => {
                if (element.dataset.animationReplay) {
                    animation.cancel();
                    target.classList.remove("js-animation-done");
                    target.style.setProperty("opacity", 0);
                    target.style.setProperty("transform", transform);
                }
            };
        }), {
            amount: amount
        });
    }
    setupSequence(element) {
        if (!ANIMATION_LOAD) return;
        if (!element) throw new Error("Element must be provided for animation");
        let amount = element.dataset.animationAmount ? Number(element.dataset.animationAmount) : 0;
        if (amount < 0) {
            amount = 0;
        } else if (amount >= 1) {
            amount = .99;
        }
        const defaultSettings = {
            delay: element.dataset.animationDelay ? parseFloat(element.dataset.animationDelay) : 0,
            displacement: (element.dataset.animationDisplacement ? Number(element.dataset.animationDisplacement) : this.#displacement) * (ANIMATION_INTERVAL_STYLE === "fade_down" ? -1 : 1),
            duration: element.dataset.animationDuration ? parseFloat(element.dataset.animationDuration) : this.#duration,
            interval: element.dataset.animationInterval ? parseFloat(element.dataset.animationInterval) : this.#interval,
            selector: element.dataset.animationSelector,
            scale: element.dataset.animationScale ? parseFloat(element.dataset.animationScale) : 1
        };
        const settings = element.dataset.animation ? JSON.parse(element.dataset.animation).reduce(((finalSettings, settingsGroup) => {
            const filteredSettingsGroup = Object.keys(settingsGroup).filter((key => ALLOWED_SETTINGS_KEYS.includes(key))).reduce(((group, key) => {
                group[key] = settingsGroup[key];
                return group;
            }), {
                ...defaultSettings
            });
            return [ ...finalSettings, filteredSettingsGroup ];
        }), []) : [ defaultSettings ];
        const elementsTransformsSettings = [];
        settings.forEach((settingsGroup => {
            const elements = settingsGroup.selector ? Array.from(element.querySelectorAll(settingsGroup.selector)) : Array.from(element.children);
            const transform = `matrix(${settingsGroup.scale}, 0, 0, ${settingsGroup.scale}, 0, ${settingsGroup.displacement})`;
            elements.forEach((el => {
                el.style.setProperty("opacity", 0);
            }));
            elements.forEach((el => {
                el.style.setProperty("transform", transform);
            }));
            elementsTransformsSettings.push({
                elements: elements,
                transform: transform
            });
        }));
        inView(element, (info => {
            const {target: target} = info;
            const animations = [];
            settings.forEach(((settingsGroup, settingsIndex) => {
                const elements = settingsGroup.selector ? Array.from(target.querySelectorAll(settingsGroup.selector)) : Array.from(target.children);
                const elementsInViewportIndexes = elements.reduce(((finalElements, el, index) => [ ...finalElements, ...Animations.#isElementInViewport(el) ? [ index ] : [] ]), []);
                const elementToStaggerFrom = this.#scrollDelta < 0 ? elementsInViewportIndexes[elementsInViewportIndexes.length - 1] : elementsInViewportIndexes[0];
                const animation = animate(elements, {
                    opacity: 1,
                    transform: `matrix(1, 0, 0, 1, 0, 0)`
                }, {
                    delay: settingsGroup.interval ? stagger(settingsGroup.interval, {
                        easing: "linear",
                        from: elementToStaggerFrom,
                        start: settingsGroup.delay
                    }) : settingsGroup.delay,
                    duration: this.#reducedMotionMediaQuery.matches ? 0 : settingsGroup.duration,
                    easing: glide()
                });
                animation.finished.then((() => {
                    elements.forEach((el => {
                        el.classList.add("js-animation-done");
                        el.style.removeProperty("opacity");
                        el.style.removeProperty("transform");
                    }));
                }));
                animations.push({
                    animation: animation,
                    transformSettings: elementsTransformsSettings[settingsIndex]
                });
            }));
            element.animations = animations;
            return () => {
                if (element.dataset.animationReplay) {
                    element.classList.remove("js-animation-done");
                    animations.forEach((animation => {
                        animation.cancel();
                    }));
                    elementsTransformsSettings.forEach((({elements: elements, transform: transform}) => {
                        elements.forEach((el => {
                            el.classList.remove("js-animation-done");
                            el.style.setProperty("opacity", 0);
                            el.style.setProperty("transform", transform);
                        }));
                    }));
                }
            };
        }), {
            amount: amount
        });
    }
    setup(rootElement = document) {
        if (!ANIMATION_LOAD) return;
        if (!rootElement) throw new Error("Element must be provided for animation");
        rootElement.querySelectorAll(".js-animate-single").forEach((element => {
            this.setupSingle(element);
        }));
        rootElement.querySelectorAll(".js-animate-sequence").forEach((element => {
            this.setupSequence(element);
        }));
    }
    static #revealOnPageLoad() {
        document.body.classList.add("js-theme-loaded");
        document.body.classList.remove("js-theme-loading");
        setTimeout((() => {
            document.body.classList.remove("js-theme-loaded");
        }), 300);
    }
    #updateScrollDelta() {
        const st = window.scrollY || document.documentElement.scrollTop;
        if (st > this.#previousScrollPosition) {
            this.#scrollDelta = 1;
        } else if (st < this.#previousScrollPosition) {
            this.#scrollDelta = -1;
        } else {
            this.#scrollDelta = 0;
        }
        this.#previousScrollPosition = st <= 0 ? 0 : st;
    }
    static #isElementInViewport(element, strict = false, options = {}) {
        const rect = element.getBoundingClientRect();
        const height = window.innerHeight || document.documentElement.clientHeight;
        const width = window.innerWidth || document.documentElement.clientWidth;
        const offset = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            ...options
        };
        if (strict) {
            return rect.top >= -offset.top && rect.left >= -offset.left && rect.bottom <= height + offset.bottom && rect.right <= width + offset.right;
        }
        return rect.right >= -offset.left && rect.bottom >= -offset.top && rect.left <= width + offset.right && rect.top <= height + offset.bottom;
    }
    static resetAnimations(element) {
        if (!ANIMATION_LOAD) return;
        if (!element || !element.animations || element.dataset.animationReplay) return;
        const {animations: animations} = element;
        element.classList.remove("js-animation-done");
        animations.forEach((({animation: animation, transformSettings: {elements: elements, transform: transform}}) => {
            animation.cancel();
            elements.forEach((el => {
                el.classList.remove("js-animation-done");
                el.style.setProperty("opacity", 0);
                el.style.setProperty("transform", transform);
            }));
        }));
    }
    static setRevealedState(element) {
        if (!ANIMATION_LOAD) return;
        if (!element) return;
        if (element.classList.contains("js-animate-single")) {
            element.style.setProperty("opacity", 1);
            element.style.setProperty("transform", "matrix(1, 0, 0, 1, 0, 0)");
        } else if (element.classList.contains("js-animate-sequence")) {
            let selector = "";
            if (element.dataset.animationSelector) {
                selector = element.dataset.animationSelector;
            }
            if (element.dataset.animation) {
                const parsedSettings = JSON.parse(element.dataset.animation);
                if (parsedSettings.selector) {
                    selector = parsedSettings.selector;
                }
            }
            const elements = selector ? Array.from(element.querySelectorAll(selector)) : Array.from(element.children);
            elements.forEach((el => {
                el.style.setProperty("opacity", 1);
                el.style.setProperty("transform", "matrix(1, 0, 0, 1, 0, 0)");
            }));
        }
    }
}

const PageAnimations = new Animations;

export default PageAnimations;

export { Animations };
//# sourceMappingURL=animations.js.map
