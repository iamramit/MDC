/*! Copyright (c) Safe As Milk. All rights reserved. */
function tabClick(e) {
    if (e.keyCode === 9) {
        document.body.classList.add("js-using-tab");
        window.removeEventListener("keydown", tabClick);
    }
}

window.addEventListener("keydown", tabClick);

window.theme ??= {};

window.theme.wrapRteTables = (rootElement = document) => {
    const wrapTable = (el, wrapper) => {
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);
    };
    rootElement.querySelectorAll(".rte table").forEach((table => {
        if (table.closest(".js-theme-utility-rte-table-wrap")) return;
        const tableWrapper = document.createElement("div");
        tableWrapper.classList.add("js-theme-utility-rte-table-wrap");
        tableWrapper.setAttribute("style", "overflow:auto;-webkit-overflow-scrolling:touch");
        wrapTable(table, tableWrapper);
    }));
};

window.theme.wrapRteTables();

const scrollEndSupported = typeof window === "undefined" ? true : "onscrollend" in window;

if (!scrollEndSupported) {
    import("scrollyfills");
}
//# sourceMappingURL=global.js.map
