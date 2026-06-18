/*! Copyright (c) Safe As Milk. All rights reserved. */
class RecentSearches extends HTMLElement {
    constructor() {
        super();
        this.update();
    }
    update() {
        const recentSearchesStoredString = localStorage.getItem("recentSearches");
        if (recentSearchesStoredString) {
            const ul = this.querySelector("ul");
            const recentSearchesStored = JSON.parse(recentSearchesStoredString);
            if (recentSearchesStored.length > 0) {
                this.parentElement.classList.add("has-recent-searches");
                ul.innerHTML = recentSearchesStored.reverse().reduce(((innerHTML, item) => `\n            ${innerHTML}\n            <li class="search__nav-item">\n              <a href="${item.uri}" class="search__nav-link">${item.query}</a>\n            </li>\n          `), "");
                this.removeAttribute("hidden");
            }
        }
    }
}

customElements.define("recent-searches", RecentSearches);
//# sourceMappingURL=recent-searches.js.map
