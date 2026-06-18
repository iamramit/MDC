/*! Copyright (c) Safe As Milk. All rights reserved. */
class SearchForm extends HTMLElement {
    constructor() {
        super();
        this.form = this.querySelector("form");
    }
    connectedCallback() {
        if (this.hasAttribute("add-recent-search-on-load")) this.addFormStateToRecentSearches();
    }
    static addRecentSearch(query, uri) {
        if (!query || !uri) return;
        const getUniqueListBy = (arr, key) => [ ...new Map(arr.map((item => [ item[key], item ]))).values() ];
        let recentSearches = [ {
            query: query,
            uri: uri
        } ];
        const recentSearchesStoredString = localStorage.getItem("recentSearches");
        if (recentSearchesStoredString) {
            const recentSearchesStored = JSON.parse(recentSearchesStoredString);
            const combinedSearches = [ ...recentSearchesStored, ...recentSearches ];
            recentSearches = getUniqueListBy(combinedSearches.reverse(), "query").reverse();
            if (recentSearches.length > 5) {
                recentSearches = recentSearches.slice(-5);
            }
        }
        localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
        document.querySelectorAll("recent-searches").forEach((el => el.update()));
    }
    addFormStateToRecentSearches() {
        if (!this.form) return;
        const form = new FormData(this.form);
        const search = new URLSearchParams(form);
        const formAction = new URL(`${window.location.origin}${this.form.getAttribute("action")}`);
        const formActionOrigin = window.location.origin;
        const formActionPath = formAction.pathname;
        const formActionSearch = formAction.searchParams;
        const combinedSearch = new URLSearchParams({
            ...Object.fromEntries(formActionSearch),
            ...Object.fromEntries(search)
        });
        SearchForm.addRecentSearch(form.get("q"), `${formActionOrigin}${formActionPath}?${combinedSearch.toString()}`);
    }
}

customElements.define("search-form", SearchForm);
//# sourceMappingURL=search-form.js.map
