/*! Copyright (c) Safe As Milk. All rights reserved. */
class NestedMenu extends HTMLElement {
    #activeRow;
    #boundClickRow;
    #boundMouseEnterRow;
    #boundMouseLeaveMenu;
    #boundMouseMoveDocument;
    #lastDelayLoc;
    #mouseLocs;
    #timeoutId;
    static #MOUSE_LOCS_TRACKED=3;
    static #DELAY=300;
    constructor() {
        super();
        this.menu = this.querySelector("ul");
        this.rows = Array.from(this.menu.querySelectorAll(":scope > li"));
        this.submenus = Array.from(this.menu.querySelectorAll(":scope > li > header-details-disclosure"));
        this.tolerance = this.getAttribute("tolerance") || 0;
        this.submenuDirection = this.getAttribute("submenu-direction") || "right";
        this.#activeRow = null;
        this.#mouseLocs = [];
        this.#lastDelayLoc = null;
        this.#timeoutId = null;
        this.#boundMouseLeaveMenu = this.#mouseleaveMenu.bind(this);
        this.#boundMouseEnterRow = this.#mouseenterRow.bind(this);
        this.#boundClickRow = this.#clickRow.bind(this);
        this.#boundMouseMoveDocument = this.#mousemoveDocument.bind(this);
    }
    connectedCallback() {
        if (window.matchMedia && !window.matchMedia("(any-hover: hover)").matches) return;
        setTimeout((() => {
            this.submenus.forEach((submenu => {
                submenu.disableListeners();
            }));
        }));
        this.menu.addEventListener("mouseleave", this.#boundMouseLeaveMenu);
        this.rows.forEach((row => {
            row.addEventListener("mouseenter", this.#boundMouseEnterRow);
            row.addEventListener("click", this.#boundClickRow);
        }));
        document.addEventListener("mousemove", this.#boundMouseMoveDocument);
    }
    disconnectedCallback() {
        if (window.matchMedia && !window.matchMedia("(any-hover: hover)").matches) return;
        this.menu.removeEventListener("mouseleave", this.#boundMouseLeaveMenu);
        this.rows.forEach((row => {
            row.removeEventListener("mouseenter", this.#boundMouseEnterRow);
            row.removeEventListener("click", this.#boundClickRow);
        }));
        document.removeEventListener("mousemove", this.#boundMouseMoveDocument);
    }
    #mousemoveDocument(e) {
        this.#mouseLocs.push({
            x: e.pageX,
            y: e.pageY
        });
        if (this.#mouseLocs.length > NestedMenu.#MOUSE_LOCS_TRACKED) {
            this.#mouseLocs.shift();
        }
    }
    #mouseleaveMenu() {
        if (this.#timeoutId) {
            clearTimeout(this.#timeoutId);
        }
        this.#possiblyDeactivate(this.#activeRow, NestedMenu.#DELAY);
    }
    #mouseenterRow(e) {
        if (this.#timeoutId) {
            clearTimeout(this.#timeoutId);
        }
        this.#possiblyActivate(e.target);
    }
    #clickRow(e) {
        this.activate(e.target);
    }
    static openSubmenu(row) {
        if (!row) return;
        const submenu = row.querySelector("header-details-disclosure");
        if (submenu) {
            submenu.mouseEnterListener();
        }
    }
    static closeSubmenu(row) {
        if (!row) return;
        const submenu = row.querySelector("header-details-disclosure");
        if (submenu) {
            submenu.mouseLeaveListener();
        }
    }
    activate(row) {
        if (row === this.#activeRow) {
            return;
        }
        if (this.#activeRow) {
            NestedMenu.closeSubmenu(this.#activeRow);
        }
        NestedMenu.openSubmenu(row);
        this.#activeRow = row;
    }
    #possiblyActivate(row) {
        const delay = this.#activationDelay();
        if (delay) {
            this.#timeoutId = setTimeout((() => {
                this.#possiblyActivate(row);
            }), delay);
        } else {
            this.activate(row);
        }
    }
    #possiblyDeactivate(row, initialDelay) {
        const delay = initialDelay ?? this.#activationDelay();
        if (delay) {
            this.#timeoutId = setTimeout((() => {
                this.#possiblyDeactivate(row);
            }), delay);
        } else {
            NestedMenu.closeSubmenu(row);
            this.#activeRow = null;
        }
    }
    #activationDelay() {
        if (!this.#activeRow || !this.rows.includes(this.#activeRow)) {
            return 0;
        }
        const offset = {
            top: this.menu.getBoundingClientRect().top + window.scrollY,
            left: this.menu.getBoundingClientRect().left + window.scrollX
        };
        const upperLeft = {
            x: offset.left,
            y: offset.top - this.tolerance
        };
        const upperRight = {
            x: offset.left + this.menu.offsetWidth,
            y: upperLeft.y
        };
        const lowerLeft = {
            x: offset.left,
            y: offset.top + this.menu.offsetHeight + this.tolerance
        };
        const lowerRight = {
            x: offset.left + this.menu.offsetWidth,
            y: lowerLeft.y
        };
        const loc = this.#mouseLocs[this.#mouseLocs.length - 1];
        let prevLoc = this.#mouseLocs[0];
        if (!loc) {
            return 0;
        }
        if (!prevLoc) {
            prevLoc = loc;
        }
        if (prevLoc.x < offset.left || prevLoc.x > lowerRight.x || prevLoc.y < offset.top || prevLoc.y > lowerRight.y) {
            return 0;
        }
        if (this.#lastDelayLoc && loc.x === this.#lastDelayLoc.x && loc.y === this.#lastDelayLoc.y) {
            return 0;
        }
        function slope(a, b) {
            return (b.y - a.y) / (b.x - a.x);
        }
        let decreasingCorner = upperRight;
        let increasingCorner = lowerRight;
        if (this.submenuDirection === "left") {
            decreasingCorner = lowerLeft;
            increasingCorner = upperLeft;
        } else if (this.submenuDirection === "below") {
            decreasingCorner = lowerRight;
            increasingCorner = lowerLeft;
        }
        const decreasingSlope = slope(loc, decreasingCorner);
        const increasingSlope = slope(loc, increasingCorner);
        const prevDecreasingSlope = slope(prevLoc, decreasingCorner);
        const prevIncreasingSlope = slope(prevLoc, increasingCorner);
        if (decreasingSlope < prevDecreasingSlope && increasingSlope > prevIncreasingSlope) {
            this.#lastDelayLoc = loc;
            return NestedMenu.#DELAY;
        }
        this.#lastDelayLoc = null;
        return 0;
    }
}

customElements.define("nested-menu", NestedMenu);
//# sourceMappingURL=nested-menu.js.map
