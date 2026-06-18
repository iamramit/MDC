/*! Copyright (c) Safe As Milk. All rights reserved. */
class PickupAvailability extends HTMLElement {
    connectedCallback() {
        if (!this.hasAttribute("available")) return;
        this.errorHtml = this.querySelector("template").content.firstElementChild.cloneNode(true);
        this.onClickRefreshList = this.onClickRefreshList.bind(this);
        this.fetchAvailability(this.dataset.variantId);
    }
    fetchAvailability(variantId) {
        let {rootUrl: rootUrl} = this.dataset;
        if (!rootUrl.endsWith("/")) {
            rootUrl += "/";
        }
        const variantSectionUrl = `${rootUrl}variants/${variantId}/?section_id=store-availability`;
        fetch(variantSectionUrl).then((response => response.text())).then((text => {
            const sectionInnerHTML = (new DOMParser).parseFromString(text, "text/html").querySelector(".store-availability-container");
            this.renderPreview(sectionInnerHTML);
        })).catch((() => {
            const button = this.querySelector("button");
            if (button) button.removeEventListener("click", this.onClickRefreshList);
            this.renderError();
        }));
    }
    onClickRefreshList() {
        this.fetchAvailability(this.dataset.variantId);
    }
    renderError() {
        this.innerHTML = "";
        this.appendChild(this.errorHtml);
        this.querySelector("button").addEventListener("click", this.onClickRefreshList);
    }
    renderPreview(sectionInnerHTML) {
        const drawer = document.getElementById("modal-store-availability");
        if (drawer) drawer.remove();
        if (!sectionInnerHTML.querySelector("pickup-availability-preview")) {
            this.innerHTML = "";
            this.removeAttribute("available");
            return;
        }
        this.innerHTML = sectionInnerHTML.querySelector("pickup-availability-preview").outerHTML;
        this.setAttribute("available", "");
        document.body.appendChild(sectionInnerHTML.querySelector(".modal--store-availability"));
    }
}

customElements.define("pickup-availability", PickupAvailability);
//# sourceMappingURL=pickup-availability.js.map
