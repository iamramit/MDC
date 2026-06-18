/*! Copyright (c) Safe As Milk. All rights reserved. */
class DynamicProductSearchInfinite {
    constructor(root) {
        this.root = root;
        this.isLoadMoreLoading = false;
        this.previousResultsHTML = "";
        this.loadMoreButton = null;
        this.scrollObserver = null;
        this.onLoadMoreClick = this.onLoadMoreClick.bind(this);
        this.onLoaded = this.onLoaded.bind(this);
        this.root.addEventListener("on:dynamic-product-search:loaded", this.onLoaded);
        this.setupLoadMoreButton();
    }
    onLoaded() {
        const results = this.root.querySelector(".js-results");
        if (this.isLoadMoreLoading && results && this.previousResultsHTML) {
            results.innerHTML = this.previousResultsHTML + results.innerHTML;
            this.isLoadMoreLoading = false;
            this.previousResultsHTML = "";
        }
        this.updateCount();
        this.setupLoadMoreButton();
    }
    updateCount() {
        const countEl = this.root.querySelector(".js-infinite-counter");
        if (!countEl) return;
        const showingCount = this.root.querySelectorAll(".js-results product-card, .js-results .search-grid-item").length;
        const totalCount = this.root.querySelector(".js-infinite-products-count").dataset.productsCount;
        countEl.querySelector(".js-infinite-showing-count").textContent = `${showingCount}`;
        countEl.querySelector(".js-infinite-total-count").textContent = `${totalCount}`;
    }
    setButtonIdleState() {
        if (!this.loadMoreButton) return;
        this.loadMoreButton.classList.remove("js-loading");
        this.loadMoreButton.disabled = false;
        this.loadMoreButton.hidden = false;
    }
    setButtonLoadingState() {
        if (!this.loadMoreButton) return;
        this.loadMoreButton.classList.add("js-loading");
        this.loadMoreButton.disabled = true;
    }
    setupLoadMoreButton() {
        if (this.loadMoreButton) {
            this.loadMoreButton.removeEventListener("click", this.onLoadMoreClick);
            this.loadMoreButton = null;
        }
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
            this.scrollObserver = null;
        }
        const btn = this.root.querySelector(".js-infinite-load-button");
        if (!btn) return;
        this.loadMoreButton = btn;
        const nextUrl = this.getNextPageUrl();
        if (!nextUrl) {
            this.loadMoreButton.disabled = true;
            this.loadMoreButton.hidden = true;
            this.loadMoreButton.classList.remove("js-loading");
            return;
        }
        this.setButtonIdleState();
        this.loadMoreButton.addEventListener("click", this.onLoadMoreClick);
        if (this.root.dataset.infiniteScroll === "true") {
            this.setupScrollObserver();
        }
    }
    setupScrollObserver() {
        if (!this.loadMoreButton) return;
        this.scrollObserver = new IntersectionObserver((entries => {
            entries.forEach((entry => {
                if (entry.isIntersecting) {
                    this.onLoadMore();
                }
            }));
        }), {
            root: null,
            rootMargin: "0px 0px",
            threshold: 0
        });
        this.scrollObserver.observe(this.loadMoreButton);
    }
    getNextPageUrl() {
        const link = this.root.querySelector('.js-infinite-pagination a[rel="next"]');
        if (!link) return null;
        return link.getAttribute("href");
    }
    onLoadMoreClick(e) {
        e.preventDefault();
        this.onLoadMore();
    }
    onLoadMore() {
        if (this.root.loading || this.isLoadMoreLoading) return;
        const activeEl = document.activeElement;
        if (activeEl && this.root.contains(activeEl) && typeof activeEl.blur === "function") {
            activeEl.blur();
        }
        const url = this.getNextPageUrl();
        if (!url) {
            this.setupLoadMoreButton();
            return;
        }
        const query = url.split("?")[1] || "";
        const results = this.root.querySelector(".js-results");
        this.isLoadMoreLoading = true;
        if (results) {
            const clone = results.cloneNode(true);
            clone.querySelectorAll(".js-infinite-pagination, .js-infinite-products-count").forEach((el => el.remove()));
            this.previousResultsHTML = clone.innerHTML;
        }
        if (this.loadMoreButton) {
            this.setButtonLoadingState();
        }
        this.root.renderCollection({
            query: query,
            updateURL: false,
            scrollUp: false
        });
    }
}

function resetToFirstPageInEditor(root) {
    if (!window.Shopify || !window.Shopify.designMode) return;
    const {search: search} = window.location;
    if (!search) return;
    const params = new URLSearchParams(search);
    const pageParam = params.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 0;
    if (!page || Number.isNaN(page) || page <= 1) return;
    params.delete("page");
    const query = params.toString();
    root.renderCollection({
        query: query,
        updateURL: false,
        scrollUp: false
    });
}

function initInfiniteSearch() {
    const root = document.querySelector('dynamic-product-search[data-infinite="true"]');
    if (!root) return;
    root.infiniteController = new DynamicProductSearchInfinite(root);
    resetToFirstPageInEditor(root);
}

document.addEventListener("DOMContentLoaded", initInfiniteSearch);

document.addEventListener("shopify:section:load", (event => {
    const root = event.target.querySelector('dynamic-product-search[data-infinite="true"]');
    if (!root) return;
    root.infiniteController = new DynamicProductSearchInfinite(root);
    resetToFirstPageInEditor(root);
}));

export default DynamicProductSearchInfinite;
//# sourceMappingURL=dynamic-product-search-infinite.js.map
