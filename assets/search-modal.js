/*! Copyright (c) Safe As Milk. All rights reserved. */
import ModalDialog from "modal-dialog";

class SearchModal extends ModalDialog {
    #boundCloseSearchModal;
    constructor() {
        super();
        this.#boundCloseSearchModal = this.#onCloseSearchModal.bind(this);
    }
    connectedCallback() {
        super.connectedCallback();
        this.predictiveSearch = this.querySelector("predictive-search");
        this.on("on:modal:closed", this.#boundCloseSearchModal);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.off("on:modal:closed", this.#boundCloseSearchModal);
    }
    #onCloseSearchModal() {
        if (this.predictiveSearch) {
            this.predictiveSearch.close();
            const input = this.predictiveSearch.querySelector(".js-search-input");
            if (input) input.value = "";
        }
    }
}

customElements.define("search-modal", SearchModal);
//# sourceMappingURL=search-modal.js.map
