/*! Copyright (c) Safe As Milk. All rights reserved. */
import { debounce } from "utils";

class PredictiveSearch extends HTMLElement {
    #boundOnChange;
    #boundOnFocus;
    #boundOnFocusOut;
    #boundOnKeyUp;
    #boundOnResultsClick;
    #boundSetDrawerContentMaxHeight;
    constructor() {
        super();
        this.type = this.getAttribute("type");
        this.isDropdown = this.hasAttribute("dropdown");
        this.#boundOnChange = debounce(this.#onChange.bind(this), 250);
        this.#boundOnKeyUp = this.#onKeyup.bind(this);
        this.#boundOnFocus = this.#onFocus.bind(this);
        this.#boundOnFocusOut = this.#onFocusOut.bind(this);
        this.#boundOnResultsClick = this.#onResultsClick.bind(this);
        this.#boundSetDrawerContentMaxHeight = debounce(this.#setDrawerContentMaxHeight.bind(this), 50);
    }
    connectedCallback() {
        this.#addSpinner();
        this.input = this.querySelector('input[type="search"]');
        this.results = this.querySelector("predictive-search-results");
        this.additionalContent = this.parentElement.querySelector(".js-search-content");
        this.searchTerm = "";
        this.abortController = null;
        this.#updateLoading();
        this.input.addEventListener("input", this.#boundOnChange);
        this.addEventListener("keyup", this.#boundOnKeyUp);
        this.addEventListener("keydown", PredictiveSearch.#onKeydown);
        if (this.isDropdown) {
            this.input.addEventListener("focus", this.#boundOnFocus);
            this.addEventListener("focusout", this.#boundOnFocusOut);
        }
        this.results.addEventListener("click", this.#boundOnResultsClick);
        if (this.type === "sidebar") {
            window.visualViewport.addEventListener("resize", this.#boundSetDrawerContentMaxHeight);
        }
    }
    disconnectedCallback() {
        this.input.removeEventListener("input", this.#boundOnChange);
        this.removeEventListener("keyup", this.#boundOnKeyUp);
        this.removeEventListener("keydown", PredictiveSearch.#onKeydown);
        if (this.isDropdown) {
            this.input.removeEventListener("focus", this.#boundOnFocus);
            this.removeEventListener("focusout", this.#boundOnFocusOut);
        }
        this.results.removeEventListener("click", this.#boundOnResultsClick);
        if (this.type === "sidebar") {
            window.visualViewport.removeEventListener("resize", this.#boundSetDrawerContentMaxHeight);
        }
    }
    getQuery() {
        return this.input.value.trim();
    }
    #onKeyup(event) {
        if (!this.getQuery().length) this.close(true);
        event.preventDefault();
        switch (event.code) {
          case "ArrowUp":
            this.switchOption("up");
            break;

          case "ArrowDown":
            this.switchOption("down");
            break;

          case "Enter":
            this.selectOption();
            break;

          default:
            break;
        }
    }
    static #onKeydown(event) {
        if (event.code === "ArrowUp" || event.code === "ArrowDown") {
            event.preventDefault();
        }
    }
    #onChange() {
        if (this.abortController) this.abortController.abort();
        const searchTerm = this.getQuery();
        this.searchTerm = searchTerm;
        if (!searchTerm.length) {
            this.close();
            this.#updateLoading();
            return;
        }
        this.getSearchResults(searchTerm);
    }
    #onFocus() {
        const currentSearchTerm = this.getQuery();
        if (!currentSearchTerm.length) return;
        if (this.searchTerm !== currentSearchTerm) {
            this.#onChange();
        } else if (this.getAttribute("results") === "true") {
            this.open();
        } else {
            this.getSearchResults(this.searchTerm);
        }
    }
    #onFocusOut() {
        if (this.abortController) this.abortController.abort();
        this.#updateLoading();
        setTimeout((() => {
            if (!this.contains(document.activeElement)) this.close();
        }));
    }
    #onResultsClick(e) {
        const link = e.target.closest("a");
        if (!link) return;
        const searchUrl = this.getAttribute("search-url");
        const [linkPath] = link.getAttribute("href").split("?");
        if (searchUrl && searchUrl === linkPath) return;
        const searchForm = link.closest("search-form");
        if (searchForm) {
            searchForm.addFormStateToRecentSearches();
        }
    }
    getSearchResults(searchTerm) {
        const searchUrl = this.getAttribute("search-url") || "/search";
        this.abortController = new AbortController;
        this.#updateLoading(true);
        fetch(`${searchUrl}/suggest?q=${searchTerm}&section_id=predictive-search`, {
            signal: this.abortController.signal
        }).then((response => {
            if (!response.ok) {
                const error = new Error(response.status);
                this.close();
                throw error;
            }
            return response.text();
        })).then((text => {
            const resultsMarkup = (new DOMParser).parseFromString(text.replaceAll('id="predictive-search', `id="${this.type}-predictive-search`).replaceAll('aria-labelledby="predictive-search', `aria-labelledby="${this.type}-predictive-search`), "text/html").querySelector("#shopify-section-predictive-search").innerHTML;
            this.results.innerHTML = resultsMarkup;
            if (this.isDropdown && this.results.querySelector(".predictive-search__empty-heading")) {
                this.results.querySelector(".predictive-search__empty-heading").remove();
            }
            this.open();
            this.#updateLoading();
            this.input.setAttribute("aria-activedescendant", "");
        })).catch((error => {
            if (error.name && error.name === "AbortError") return;
            this.#updateLoading();
            this.close();
            throw error;
        })).finally((() => {
            this.abortController = null;
        }));
    }
    open() {
        this.setAttribute("open", true);
        this.input.setAttribute("aria-expanded", "true");
        this.spinner.setAttribute("hidden", "true");
        this.results.removeAttribute("hidden");
        if (this.additionalContent) this.additionalContent.setAttribute("hidden", true);
    }
    close() {
        this.removeAttribute("open");
        this.input.setAttribute("aria-expanded", "false");
        this.spinner.setAttribute("hidden", "true");
        this.results.setAttribute("hidden", "true");
        if (this.additionalContent) this.additionalContent.removeAttribute("hidden");
    }
    switchOption(direction) {
        if (!this.getAttribute("open")) return;
        const moveUp = direction === "up";
        const selectedElement = this.querySelector('[aria-selected="true"]');
        const allVisibleElements = Array.from(this.querySelectorAll("predictive-search-results li, button.predictive-search__btn"));
        let activeElementIndex = 0;
        if (moveUp && !selectedElement) return;
        let selectedElementIndex = -1;
        let i = 0;
        while (selectedElementIndex === -1 && i <= allVisibleElements.length) {
            if (allVisibleElements[i] === selectedElement) {
                selectedElementIndex = i;
            }
            i += 1;
        }
        if (!moveUp && selectedElement) {
            activeElementIndex = selectedElementIndex === allVisibleElements.length - 1 ? 0 : selectedElementIndex + 1;
        } else if (moveUp) {
            activeElementIndex = selectedElementIndex === 0 ? allVisibleElements.length - 1 : selectedElementIndex - 1;
        }
        if (activeElementIndex === selectedElementIndex) return;
        const activeElement = allVisibleElements[activeElementIndex];
        activeElement.setAttribute("aria-selected", true);
        if (selectedElement) selectedElement.setAttribute("aria-selected", false);
        this.input.setAttribute("aria-activedescendant", activeElement.id);
        const resultsContainer = this.querySelector(".predictive-search__panels");
        if (resultsContainer.offsetHeight < resultsContainer.scrollHeight && !activeElement.classList.contains("predictive-search__btn")) {
            if (activeElement.getBoundingClientRect().top < resultsContainer.getBoundingClientRect().top) {
                resultsContainer.scrollTo({
                    top: activeElement.offsetTop,
                    behavior: "instant"
                });
            }
            if (activeElement.getBoundingClientRect().bottom > resultsContainer.getBoundingClientRect().bottom - 72) {
                resultsContainer.scrollTo({
                    top: activeElement.offsetTop - (resultsContainer.offsetHeight - activeElement.offsetHeight - 72),
                    behavior: "instant"
                });
            }
        }
    }
    selectOption() {
        const selectedOption = this.querySelector('[aria-selected="true"] a, button[aria-selected="true"]');
        if (selectedOption) selectedOption.click();
    }
    #addSpinner() {
        const spinner = document.createElement("div");
        spinner.classList.add("search-form__loader");
        spinner.setAttribute("hidden", true);
        spinner.innerHTML = `\n      <div class="theme-spinner theme-spinner--small">\n        <div class="theme-spinner__border"></div>\n        <div class="theme-spinner__border"></div>\n        <div class="theme-spinner__border"></div>\n        <div class="theme-spinner__border"></div>\n      </div>\n    `;
        this.spinner = spinner;
        this.querySelector(".search__form-input-wrapper").append(spinner);
    }
    #updateLoading(isLoading = false) {
        if (isLoading) {
            this.classList.add("is-loading");
            if (this.spinner) this.spinner.removeAttribute("hidden");
        } else {
            this.classList.remove("is-loading");
            if (this.spinner) this.spinner.setAttribute("hidden", true);
        }
    }
    #setDrawerContentMaxHeight() {
        const searchDraw = this;
        if (searchDraw && searchDraw.closest(".modal__content")) {
            const sidebarSearchForm = searchDraw.querySelector(".search__form-input-wrapper");
            if (window.visualViewport.height < window.innerHeight) {
                searchDraw.style.setProperty("--max-content-height", `${window.visualViewport.height - (sidebarSearchForm ? sidebarSearchForm.offsetHeight : 0)}px`);
            } else {
                searchDraw.style.removeProperty("--max-content-height");
            }
        }
    }
}

customElements.define("predictive-search", PredictiveSearch);
//# sourceMappingURL=predictive-search.js.map
