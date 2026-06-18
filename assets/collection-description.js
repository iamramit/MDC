/*! Copyright (c) Safe As Milk. All rights reserved. */
class CollectionDescription extends HTMLElement {
    connectedCallback() {
        this.text = this.querySelector(".collection-description__text");
        this.btn = this.querySelector(".collection-description__toggle");
        if (!this.text || !this.btn) return;
        this.expanded = this.getAttribute("expanded") === "true";
        this.isAnimating = false;
        this.handleClick = () => {
            if (this.isAnimating) return;
            this.expanded = !this.expanded;
            this.update(true);
        };
        this.handleResize = () => {
            if (this.isAnimating) return;
            this.update(false);
        };
        this.btn.addEventListener("click", this.handleClick);
        this.ro = new ResizeObserver(this.handleResize);
        this.ro.observe(this);
        this.update(false);
    }
    disconnectedCallback() {
        this.ro?.disconnect();
        if (this.btn && this.handleClick) {
            this.btn.removeEventListener("click", this.handleClick);
        }
    }
    measure() {
        const prevExpanded = this.getAttribute("expanded");
        const prevMaxHeight = this.text.style.maxHeight;
        this.setAttribute("expanded", "false");
        this.text.style.maxHeight = "";
        const collapsed = this.text.clientHeight;
        this.setAttribute("expanded", "true");
        this.text.style.maxHeight = "none";
        const expanded = this.text.scrollHeight;
        if (prevExpanded === null) {
            this.removeAttribute("expanded");
        } else {
            this.setAttribute("expanded", prevExpanded);
        }
        this.text.style.maxHeight = prevMaxHeight;
        return {
            collapsed: collapsed,
            expanded: expanded
        };
    }
    update(animate) {
        const {collapsed: collapsed, expanded: expanded} = this.measure();
        const overflows = expanded > collapsed + 1;
        this.btn.hidden = !overflows;
        if (!overflows) {
            this.expanded = true;
            this.setAttribute("expanded", "true");
            this.text.style.maxHeight = "none";
            this.btn.setAttribute("aria-expanded", "false");
            return;
        }
        this.setExpanded(this.expanded, collapsed, expanded, animate);
    }
    setExpanded(expand, collapsed, expanded, animate) {
        this.expanded = expand;
        this.btn.textContent = expand ? window.theme.localize("COLLECTION_LESS") : window.theme.localize("COLLECTION_MORE");
        this.btn.setAttribute("aria-expanded", String(expand));
        if (!animate) {
            this.setAttribute("expanded", expand ? "true" : "false");
            this.text.style.maxHeight = expand ? "none" : `${collapsed}px`;
            return;
        }
        this.isAnimating = true;
        const from = expand ? collapsed : expanded;
        const to = expand ? expanded : collapsed;
        this.setAttribute("expanded", "true");
        this.text.style.maxHeight = `${from}px`;
        this.text.getBoundingClientRect();
        requestAnimationFrame((() => {
            this.text.style.maxHeight = `${to}px`;
            const onEnd = event => {
                if (event.propertyName !== "max-height") return;
                this.setAttribute("expanded", expand ? "true" : "false");
                this.text.style.maxHeight = expand ? "none" : `${collapsed}px`;
                this.isAnimating = false;
                this.text.removeEventListener("transitionend", onEnd);
            };
            this.text.addEventListener("transitionend", onEnd);
        }));
    }
}

customElements.define("collection-description", CollectionDescription);
//# sourceMappingURL=collection-description.js.map
