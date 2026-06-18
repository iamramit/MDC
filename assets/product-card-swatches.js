/*! Copyright (c) Safe As Milk. All rights reserved. */
class ProductCardSwatches extends HTMLElement {
    constructor() {
        super();
        this.product = this.closest(".js-product");
        this.productLink = this.product.querySelector(".js-product-link");
        this.image = this.product.querySelector(".js-img-grid");
        this.hoverImage = this.product.querySelector(".js-img-grid-hover");
        this.triggers = this.querySelectorAll(".js-product-swatch-item");
        this.triggers.forEach((el => el.addEventListener("click", (e => {
            this.updateCardImage(e.target);
            this.updateQuickShopVariant(e.target);
        }))));
    }
    updateCardImage(swatch) {
        const createSrcsetString = (srcSetWidths, url, originalWidth, originalHeight) => {
            if (!srcSetWidths || !url || !originalWidth || !originalHeight) return "";
            const aspectRatio = parseInt(originalHeight, 10) / parseInt(originalWidth, 10);
            return srcSetWidths.reduce(((srcSetString, srcSetWidth) => `${srcSetString}${url.replace("{width}", srcSetWidth)} ${srcSetWidth}w ${Math.floor(srcSetWidth * aspectRatio)}h,`), "");
        };
        const variantProductImage = swatch.dataset.variantImage;
        const variantProductImageWidth = swatch.dataset.variantImageWidth;
        const variantProductImageHeight = swatch.dataset.variantImageHeight;
        const {variantUrl: variantUrl} = swatch.dataset;
        const newSrc = variantProductImage.replace("{width}", "300");
        const newSrcset = createSrcsetString([ 180, 360, 540, 720, 900, 1080, 1296, 1512 ], variantProductImage, variantProductImageWidth, variantProductImageHeight);
        this.image.setAttribute("src", newSrc);
        this.image.setAttribute("width", "300");
        this.image.setAttribute("height", Math.floor(300 * (parseInt(variantProductImageHeight, 10) / parseInt(variantProductImageWidth, 10))));
        this.image.setAttribute("srcset", newSrcset);
        this.productLink.setAttribute("href", variantUrl);
        const activeSwatch = this.product.querySelector(".js-active");
        if (activeSwatch) activeSwatch.classList.remove("js-active");
        swatch.classList.add("js-active");
        if (this.hoverImage) {
            const imageSrc = this.image.src;
            const hoverSrc = this.hoverImage.src;
            const hoverEnabledClass = "hover-enabled";
            const hoverDisabledClass = "hover-disabled";
            if (imageSrc === hoverSrc) {
                this.image.classList.remove(hoverEnabledClass);
                this.hoverImage.classList.remove(hoverEnabledClass);
                this.image.classList.add(hoverDisabledClass);
                this.hoverImage.classList.add(hoverDisabledClass);
            } else {
                this.image.classList.remove(hoverDisabledClass);
                this.hoverImage.classList.remove(hoverDisabledClass);
                this.image.classList.add(hoverEnabledClass);
                this.hoverImage.classList.add(hoverEnabledClass);
            }
        }
        return false;
    }
    updateQuickShopVariant(swatch) {
        const {variantId: variantId} = swatch.dataset;
        const quickShop = this.product.querySelector("quick-shop");
        if (variantId && quickShop) {
            quickShop.variantId = variantId;
        }
    }
}

customElements.define("product-card-swatches", ProductCardSwatches);
//# sourceMappingURL=product-card-swatches.js.map
