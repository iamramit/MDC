/*! Copyright (c) Safe As Milk. All rights reserved. */
import DeferredMedia from "deferred-media";

class ProductModel extends DeferredMedia {
    loadContent() {
        super.loadContent();
        window.Shopify.loadFeatures([ {
            name: "model-viewer-ui",
            version: "1.0",
            onLoad: this.setupModelViewerUI.bind(this)
        } ]);
    }
    setupModelViewerUI(errors) {
        if (errors) return;
        try {
            this.modelViewerUI = new window.Shopify.ModelViewerUI(this.querySelector("model-viewer"));
            this.dispatchEvent(new CustomEvent("on:product-model:loaded"));
        } catch (e) {
            console.log("There were errors setting up Model Viewer UI", e);
        }
        this.classList.remove("is-loading");
    }
}

customElements.define("product-model", ProductModel);

window.ProductModel = {
    loadShopifyXR() {
        window.Shopify.loadFeatures([ {
            name: "shopify-xr",
            version: "1.0",
            onLoad: this.setupShopifyXR.bind(this)
        } ]);
    },
    setupShopifyXR(errors) {
        if (errors) return;
        if (!window.ShopifyXR) {
            document.addEventListener("shopify_xr_initialized", (() => this.setupShopifyXR()));
            return;
        }
        document.querySelectorAll('[id^="ModelJson-"]').forEach((modelJSON => {
            window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
            modelJSON.remove();
        }));
        window.ShopifyXR.setupXRElements();
    }
};

window.addEventListener("DOMContentLoaded", (() => {
    if (window.ProductModel) window.ProductModel.loadShopifyXR();
}));
//# sourceMappingURL=product-model.js.map
