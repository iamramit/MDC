/*! Copyright (c) Safe As Milk. All rights reserved. */
import PageAnimations from "animations";

window.theme.editor = {
    eventQueue: []
};

window.addEventListener("DOMContentLoaded", (() => {
    if (window.Shopify.designMode) {
        let mainMenuModalIsOpen = false;
        let mainMenuModal;
        const setUpMainMenuModalListeners = () => {
            mainMenuModal = document.getElementById("modal-main-menu");
            if (mainMenuModal) {
                mainMenuModal.on("on:modal:opened", (() => {
                    mainMenuModalIsOpen = true;
                })).on("on:modal:closed", (() => {
                    mainMenuModalIsOpen = false;
                }));
            }
        };
        const removeMainMenuModalListeners = () => {
            if (mainMenuModal) {
                mainMenuModal.off("on:modal:opened", (() => {
                    mainMenuModalIsOpen = true;
                })).off("on:modal:closed", (() => {
                    mainMenuModalIsOpen = false;
                }));
            }
        };
        setUpMainMenuModalListeners();
        const updateEventQueue = eventName => {
            if (!eventName) return;
            window.theme.editor.eventQueue.unshift(eventName);
            if (window.theme.editor.eventQueue.length > 4) {
                window.theme.editor.eventQueue.length = 4;
            }
        };
        const updatedAfterBlockDeselect = () => window.theme.editor.eventQueue.toString() === "block:select,section:select,section:load,block:deselect";
        const openNavigationDrawerPanel = blockId => {
            if (!mainMenuModalIsOpen) return;
            const drawerMenu = mainMenuModal.querySelector("drawer-menu");
            const currentPanelId = drawerMenu ? drawerMenu.currentPanelId : null;
            const megaMenuPanel = drawerMenu.querySelector(`[mega-menu-block-id="${blockId}"]`);
            if (!megaMenuPanel || megaMenuPanel.id === currentPanelId) return;
            const megaMenuPanelId = megaMenuPanel.id;
            drawerMenu.openMenuPanelById(megaMenuPanelId, true, false);
        };
        const closeNavigationDrawerPanel = blockId => {
            if (!mainMenuModalIsOpen) return;
            const drawerMenu = mainMenuModal.querySelector("drawer-menu");
            const megaMenuPanel = drawerMenu.querySelector(`details[open][mega-menu-block-id="${blockId}"]`);
            if (!megaMenuPanel) return;
            drawerMenu.closeSubmenu(megaMenuPanel);
        };
        document.addEventListener("shopify:section:load", (event => {
            updateEventQueue("section:load");
            const section = event.target;
            const shopifySectionClassNameRegex = /shopify-section[^ ]*[ ]?/g;
            const type = section.getAttribute("class").replace(shopifySectionClassNameRegex, "").trim();
            const id = event.detail.sectionId;
            const sectionId = `.section--${id}`;
            PageAnimations.setup(section);
            window.theme.wrapRteTables(section);
            switch (type) {
              case "js-section__featured-collections":
                if (window.SPR) {
                    window.SPR.initDomEls();
                    window.SPR.loadBadges();
                }
                break;

              case "js-section__home-video":
                document.querySelector(`${sectionId} .is-active vide-player`)?.loadContent();
                break;

              case "js-section__home-product":
                if (window.SPR) {
                    window.SPR.initDomEls();
                    window.SPR.loadBadges();
                }
                break;

              case "js-section__product-single":
                if (window.Shopify.PaymentButton) {
                    window.Shopify.PaymentButton.init();
                }
                if (window.SPR) {
                    window.SPR.initDomEls();
                    window.SPR.loadProducts();
                    window.SPR.loadBadges();
                }
                if (document.getElementById("complementary-products")) {
                    if (document.cookie.split("; ").find((row => row === "creative__complementary-products-absent=true"))) {
                        window.theme.complementary_products_fetch_delay = "1000";
                    }
                    document.cookie = "creative__complementary-products-absent=false; SameSite=None; Secure";
                } else {
                    document.cookie = "creative__complementary-products-absent=true; SameSite=None; Secure";
                }
                break;

              case "js-section__announcement":
                window.theme.setHeaderHeightVars();
                break;

              case "js-section__utility-bar":
                window.theme.setHeaderHeightVars();
                break;

              case "js-section__header":
                setUpMainMenuModalListeners();
                document.body.classList.remove("header-down");
                document.body.classList.remove("header-up");
                document.documentElement.style.setProperty("--header-height", `${document.getElementsByClassName("js-header")[0].offsetHeight}px`);
                setTimeout((() => {
                    document.body.classList.remove("header-stuck");
                }), 10);
                if (document.querySelector(".js-collection-banner")) {
                    if (document.querySelector(".js-collection-banner").dataset.collectionHasImage === "true" && document.querySelector(".js-header").classList.contains("header--transparent")) {
                        document.querySelector(".js-header").setAttribute("data-transparent-header", true);
                    } else {
                        document.querySelector(".js-header").setAttribute("data-transparent-header", false);
                    }
                }
                window.theme.setUpHeaderResizeObservers();
                if (mainMenuModal && mainMenuModalIsOpen) {
                    mainMenuModal.openInstantly();
                }
                break;

              case "js-section__collection-banner":
                if (document.querySelector(".js-collection-banner").dataset.collectionHasImage === "true" && document.querySelector(".js-header").classList.contains("header--transparent")) {
                    document.querySelector(".js-header").setAttribute("data-transparent-header", true);
                } else {
                    document.querySelector(".js-header").setAttribute("data-transparent-header", false);
                }
                break;

              case "js-section__collection":
                if (window.SPR) {
                    window.SPR.initDomEls();
                    window.SPR.loadBadges();
                }
                break;

              case "js-section__search":
                if (window.SPR) {
                    window.SPR.initDomEls();
                    window.SPR.loadBadges();
                }
                break;

              default:
                break;
            }
        }));
        document.addEventListener("shopify:section:select", (event => {
            updateEventQueue("section:select");
            const section = event.target;
            const shopifySectionClassNameRegex = /shopify-section[^ ]*[ ]?/g;
            const type = section.getAttribute("class").replace(shopifySectionClassNameRegex, "").trim();
            switch (type) {
              case "js-section__age-checker":
                if (document.getElementById("age-checker")) {
                    document.getElementById("age-checker").open();
                }
                window.theme.currentOffset = window.scrollY;
                break;

              case "js-section__promo-pop":
                if (document.getElementById("promo-popup")) {
                    document.getElementById("promo-popup").open();
                }
                window.theme.currentOffset = window.scrollY;
                break;

              case "js-section__home-slider":
              case "js-section__testimonials":
                setTimeout((() => {
                    section.querySelector(`media-carousel`)?.stop();
                }), 50);
                break;

              case "js-section__header":
                break;

              default:
                break;
            }
        }));
        document.addEventListener("shopify:section:deselect", (event => {
            updateEventQueue("section:deselect");
            const section = event.target;
            const shopifySectionClassNameRegex = /shopify-section[^ ]*[ ]?/g;
            const type = section.getAttribute("class").replace(shopifySectionClassNameRegex, "").trim();
            switch (type) {
              case "js-section__age-checker":
                document.getElementById("age-checker")?.close();
                window.scrollTo({
                    top: window.theme.currentOffset
                });
                break;

              case "js-section__promo-pop":
                document.getElementById("promo-pop")?.close();
                window.scrollTo({
                    top: window.theme.currentOffset
                });
                break;

              case "js-section__home-slider":
              case "js-section__testimonials":
                setTimeout((() => {
                    section.querySelector(`media-carousel`)?.start();
                }), 50);
                break;

              default:
                break;
            }
        }));
        document.addEventListener("shopify:section:unload", (event => {
            const section = event.target;
            const shopifySectionClassNameRegex = /shopify-section[^ ]*[ ]?/g;
            const type = section.getAttribute("class").replace(shopifySectionClassNameRegex, "").trim();
            switch (type) {
              case "js-section__announcement":
                window.setTimeout(window.theme.setHeaderHeightVars, 50);
                break;

              case "js-section__utility-bar":
                window.setTimeout(window.theme.setHeaderHeightVars, 50);
                break;

              case "js-section__header":
                removeMainMenuModalListeners();
                break;

              case "js-section__age-checker":
                document.getElementById("age-checker")?.close();
                break;

              case "js-section__promo-pop":
                document.getElementById("age-checker")?.close();
                break;

              default:
                break;
            }
        }));
        document.addEventListener("shopify:block:select", (event => {
            updateEventQueue("block:select");
            const id = event.detail.sectionId;
            const block = event.target;
            const shopifySectionClassNameRegex = /shopify-section[^ ]*[ ]?/g;
            const type = block.closest(".shopify-section").getAttribute("class").replace(shopifySectionClassNameRegex, "").trim();
            switch (type) {
              case "js-section__header":
                if (!updatedAfterBlockDeselect()) {
                    if (mainMenuModalIsOpen) {
                        openNavigationDrawerPanel(event.detail.blockId);
                    } else {
                        block.open();
                        document.querySelector("body").setAttribute("header-details-disclosure-edit", "");
                    }
                }
                break;

              case "js-section__home-slider":
                {
                    const currSlideshowSlide = Number(block.querySelector(".home-carousel__item").dataset.slideId);
                    const mediaCarouselSlider = document.querySelector(`[data-section-id="${id}"] media-carousel`);
                    setTimeout((() => {
                        mediaCarouselSlider.slideTo(currSlideshowSlide);
                    }), 50);
                    break;
                }

              case "js-section__testimonials":
                {
                    const currTestimonialsSlide = Number(block.querySelector(".home-carousel__item").dataset.slideId);
                    const mediaCarouselTestimonials = document.querySelector(`[data-section-id="${id}"] media-carousel`);
                    setTimeout((() => mediaCarouselTestimonials.slideTo(currTestimonialsSlide)), 50);
                    break;
                }

              case "js-section__featured-collections":
                {
                    if (block.tagName !== "BUTTON") break;
                    const tabId = block.id;
                    const tabbedContent = block.closest("tabbed-content");
                    if (!tabbedContent) break;
                    tabbedContent.openTab(tabId);
                    break;
                }

              case "js-section__announcement":
                {
                    const slideId = event.target.id;
                    const parentAnnouncementComponent = block.closest("announcement-bar");
                    parentAnnouncementComponent.removeAttribute("hidden");
                    if (parentAnnouncementComponent.autoplay) parentAnnouncementComponent.stopAutoplay();
                    parentAnnouncementComponent.moveToSlideById(slideId, "instant");
                    parentAnnouncementComponent.stopInteractions();
                    break;
                }

              case "js-section__collection":
                {
                    const filtersPopup = document.getElementById("filters");
                    if (filtersPopup) {
                        filtersPopup.openInstantly();
                    }
                    break;
                }

              case "js-section__map":
                {
                    const accordionGroup = block.closest("accordion-group");
                    if (accordionGroup) {
                        accordionGroup.open(block.id);
                    }
                    break;
                }

              default:
                break;
            }
        }));
        document.addEventListener("shopify:block:deselect", (event => {
            updateEventQueue("block:deselect");
            const block = event.target;
            const shopifySectionClassNameRegex = /shopify-section[^ ]*[ ]?/g;
            const type = block.closest(".shopify-section").getAttribute("class").replace(shopifySectionClassNameRegex, "").trim();
            switch (type) {
              case "js-section__collection":
                {
                    const filtersPopup = document.getElementById("filters");
                    if (filtersPopup) {
                        filtersPopup.close();
                    }
                    break;
                }

              case "js-section__header":
                {
                    block.close();
                    document.querySelector("body").removeAttribute("header-details-disclosure-edit");
                    closeNavigationDrawerPanel(event.detail.blockId);
                    break;
                }

              case "js-section__announcement":
                {
                    const parentAnnouncementComponent = event.target.closest("announcement-bar");
                    parentAnnouncementComponent.resumeInteractions();
                    if (parentAnnouncementComponent.autoplay) parentAnnouncementComponent.startAutoplay();
                    break;
                }

              default:
                break;
            }
        }));
    }
}));
//# sourceMappingURL=editor.js.map
