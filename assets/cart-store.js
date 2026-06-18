/*! Copyright (c) Safe As Milk. All rights reserved. */
import { produce } from "immer";

import { createStore } from "zustand";

import plugins from "cart-plugins";

const ALLOWED_STORE_KEYS = [ "cart", "giftWrapping", "latestAddedProduct", "lineItemsBeingUpdated", "noteBeingUpdated", "productVariantsBeingAdded", "recommendations" ];

class CartStore {
    #additionalFields={};
    #rootRoute;
    #store;
    static #instantiated=false;
    constructor(fields = {}) {
        if (CartStore.#instantiated) throw new Error("Cart store instance already exists");
        CartStore.#instantiated = true;
        this.#rootRoute = window.Shopify?.routes?.root ?? "/";
        this.#store = null;
        this.#additionalFields = Object.entries(fields).reduce(((acc, [key, value]) => ({
            ...acc,
            ...typeof value !== "function" ? {
                [key]: value
            } : {}
        })), {});
        this.#init();
        if (this.#store.getState().cart.total_price === 0) localStorage.removeItem("freeShippingAnimationShown");
    }
    static async getCart() {
        try {
            const data = await fetch(`${window.Shopify?.routes?.root ?? "/"}cart.js`);
            const cart = await data.json();
            return cart;
        } catch (e) {
            throw new Error(`Could not get cart data: "${e}"`);
        }
    }
    static async clearCart() {
        try {
            const data = await fetch(`${window.Shopify?.routes?.root ?? "/"}cart/clear.js`, {
                method: "POST"
            });
            const cart = await data.json();
            return cart;
        } catch (e) {
            throw new Error(`Could not clear cart: "${e}"`);
        }
    }
    static async addVariantsToCart(variants) {
        if (!variants) throw new Error("Variant(s) must be specified");
        const items = (Array.isArray(variants) ? variants : [ variants ]).map((item => {
            if (Object.keys(item).find((key => key.includes("properties")))) {
                return Object.entries(item).reduce(((newItem, [key, value]) => key.includes("properties") && value !== "" ? {
                    ...newItem,
                    properties: {
                        ...newItem.properties || {},
                        [key.replace("properties[", "").replace("]", "")]: value
                    }
                } : {
                    ...newItem,
                    [key]: value
                }), {});
            }
            return item;
        }));
        const responseData = await fetch(`${window.Shopify?.routes?.root ?? "/"}cart/add.js`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: items
            })
        });
        const response = await responseData.json();
        if (response.status) throw new Error(this.#prepareErrorMessageDescription(response.description));
        return response.items;
    }
    static async changeCartLineItem(requestBody = {}, signal = null) {
        const {id: id, quantity: quantity, properties: properties} = requestBody;
        if (!id) throw new Error("Line item id must be present in request body");
        const responseData = await fetch(`${window.Shopify?.routes?.root ?? "/"}cart/change.js`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: id,
                quantity: quantity,
                properties: properties
            }),
            signal: signal
        });
        const response = await responseData.json();
        if (response.status) throw new Error(response.description);
        return response;
    }
    static async updateCart(requestBody = {}, signal = null) {
        if (!requestBody.hasOwnProperty("attributes") && !requestBody.hasOwnProperty("updates") && !requestBody.hasOwnProperty("note")) throw new Error(`Cart 'attributes' or 'updates' must be specified`);
        const responseData = await fetch(`${window.Shopify?.routes?.root ?? "/"}cart/update.js`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody),
            signal: signal
        });
        const response = await responseData.json();
        if (response.status) throw new Error(response.description);
        return response;
    }
    getState() {
        return Object.fromEntries(Object.entries(this.#store.getState()).filter((([key]) => [ ...ALLOWED_STORE_KEYS, ...Object.keys(this.#additionalFields) ].includes(key))));
    }
    setState(field, value) {
        if (field === "cart") throw new Error("Cannot set cart field directly");
        this.#store.getState().setFieldState(field, value);
    }
    subscribe(callback) {
        if (!callback) throw new Error("Callback function must be provided");
        const filteredCallback = (state, prevState) => {
            const filteredState = Object.fromEntries(Object.entries(state).filter((([key]) => [ ...ALLOWED_STORE_KEYS, ...Object.keys(this.#additionalFields) ].includes(key))));
            const filteredPrevState = Object.fromEntries(Object.entries(prevState).filter((([key]) => [ ...ALLOWED_STORE_KEYS, ...Object.keys(this.#additionalFields) ].includes(key))));
            return callback.call(this, filteredState, filteredPrevState);
        };
        return this.#store.subscribe(filteredCallback);
    }
    async clear() {
        document.dispatchEvent(new CustomEvent("on:cart:loading", {
            detail: {
                type: "CLEAR"
            }
        }));
        try {
            const cart = await this.#store.getState().clear();
            document.dispatchEvent(new CustomEvent("on:cart:loaded", {
                detail: {
                    cart: cart,
                    type: "CLEAR"
                }
            }));
            return cart;
        } catch (error) {
            document.dispatchEvent(new CustomEvent("on:cart:failed", {
                detail: {
                    error: error,
                    type: "CLEAR"
                }
            }));
            throw error;
        }
    }
    async add(variants) {
        document.dispatchEvent(new CustomEvent("on:cart:loading", {
            detail: {
                type: "ADD"
            }
        }));
        try {
            const cart = await this.#store.getState().add(variants);
            const items = (Array.isArray(variants) ? variants : [ variants ]).map((v => ({
                id: v.id,
                quantity: Number(v.quantity)
            })));
            document.dispatchEvent(new CustomEvent("on:cart:loaded", {
                detail: {
                    items: items,
                    cart: cart,
                    type: "ADD"
                }
            }));
            return cart;
        } catch (error) {
            document.dispatchEvent(new CustomEvent("on:cart:failed", {
                detail: {
                    error: error,
                    type: "ADD"
                }
            }));
            throw error;
        }
    }
    async change(requestBody) {
        const {id: id, quantity: quantity, properties: properties} = requestBody;
        document.dispatchEvent(new CustomEvent("on:cart:loading", {
            detail: {
                type: "CHANGE"
            }
        }));
        try {
            const cart = await this.#store.getState().change(id, quantity, properties);
            document.dispatchEvent(new CustomEvent("on:cart:loaded", {
                detail: {
                    cart: cart,
                    type: "CHANGE"
                }
            }));
            return cart;
        } catch (error) {
            document.dispatchEvent(new CustomEvent("on:cart:failed", {
                detail: {
                    error: error,
                    type: "CHANGE"
                }
            }));
            throw error;
        }
    }
    async update(cartUpdates, operationId = "cartUpdate") {
        const {attributes: attributes, updates: updates, note: note} = cartUpdates;
        document.dispatchEvent(new CustomEvent("on:cart:loading", {
            detail: {
                type: "UPDATE"
            }
        }));
        try {
            const cart = await this.#store.getState().update({
                attributes: attributes,
                updates: updates,
                note: note
            }, operationId);
            document.dispatchEvent(new CustomEvent("on:cart:loaded", {
                detail: {
                    cart: cart,
                    type: "UPDATE"
                }
            }));
            return cart;
        } catch (error) {
            document.dispatchEvent(new CustomEvent("on:cart:failed", {
                detail: {
                    error: error,
                    type: "UPDATE"
                }
            }));
            throw error;
        }
    }
    async refresh() {
        document.dispatchEvent(new CustomEvent("on:cart:loading", {
            detail: {
                type: "REFRESH"
            }
        }));
        try {
            const cart = await this.#store.getState().refresh();
            document.dispatchEvent(new CustomEvent("on:cart:loaded", {
                detail: {
                    cart: cart,
                    type: "REFRESH"
                }
            }));
            return cart;
        } catch (error) {
            document.dispatchEvent(new CustomEvent("on:cart:failed", {
                detail: {
                    error: error,
                    type: "REFRESH"
                }
            }));
            throw error;
        }
    }
    async enableCartRecommendations(intent = "related") {
        if (intent !== "related" && intent !== "complementary") throw new Error('Recommendations intent must be set to either "related" or "complementary"');
        this.cartRecommendationsIntent = intent;
        await this.#store.getState().enableRecommendations(intent);
    }
    async disableCartRecommendations() {
        this.cartRecommendationsIntent = null;
        await this.#store.getState().disableRecommendations();
    }
    async resetLatestAddedProduct() {
        await this.#store.getState().resetLatestAddedProduct();
    }
    async resetVariantsBeingAdded(id = "") {
        await this.#store.getState().resetVariantsBeingAdded(id);
    }
    async setGiftWrapping(enable = true) {
        const cart = await this.#store.getState().setGiftWrapping(enable);
        return cart;
    }
    async syncGiftWrapping() {
        await this.#store.getState().syncGiftWrapping();
    }
    async updateGiftWrappingMessage(message = "") {
        const cart = this.#store.getState().updateGiftWrappingMessage(message);
        return cart;
    }
    async updateCartNote(note = "") {
        const cart = this.#store.getState().updateNote(note);
        return cart;
    }
    #init() {
        const initialCartDataJson = document.getElementById("cart-data");
        const initialCartData = initialCartDataJson ? JSON.parse(initialCartDataJson.textContent) : {};
        const giftWrappingDataJson = document.getElementById("cart-gift-wrapping-data");
        const giftWrappingData = {
            giftWrapping: {
                ...giftWrappingDataJson ? {
                    ...JSON.parse(giftWrappingDataJson.textContent)
                } : {
                    productId: null,
                    wrapIndividually: false
                },
                statusBeingUpdated: false,
                messageBeingUpdated: false
            }
        };
        this.#store = createStore(((set, get) => ({
            ...this.#additionalFields,
            ...giftWrappingData,
            lineItemsBeingUpdated: [],
            latestAddedProduct: null,
            noteBeingUpdated: false,
            ongoingUpdates: {
                items: {},
                note: null,
                giftWrappingMessage: null
            },
            cart: initialCartData,
            recommendations: {
                enabled: false,
                intent: "related",
                items: {}
            },
            productVariantsBeingAdded: [],
            setFieldState: async (field, value) => {
                set(produce((draft => {
                    draft[field] = value;
                })));
            },
            clear: async () => {
                const cart = await CartStore.clearCart();
                set(produce((draft => {
                    draft.lineItemsBeingUpdated = [];
                    draft.latestAddedProduct = null;
                    draft.cart = {};
                    draft.recommendations = {};
                    draft.productVariantsBeingAdded = [];
                })));
                return cart;
            },
            add: async variants => {
                if (!variants) throw new Error("Variant(s) must be specified");
                set(produce((draft => {
                    draft.productVariantsBeingAdded = (Array.isArray(variants) ? variants : [ variants ]).map((v => v.id));
                })));
                let error = null;
                try {
                    const addedItems = await CartStore.addVariantsToCart(variants);
                    set(produce((draft => {
                        draft.latestAddedProduct = addedItems ? addedItems[0] : null;
                    })));
                } catch (e) {
                    error = e;
                }
                const prevItemsCount = get().cart.item_count;
                const cart = await CartStore.getCart();
                set(produce((draft => {
                    draft.cart = cart;
                })));
                if (prevItemsCount !== cart.item_count) {
                    await get().updateGiftWrapping();
                }
                await get().updateRecommendations();
                if (error) throw error;
                return get().cart;
            },
            change: async (key, quantity, properties) => {
                if (!key) throw new Error("Line item key must be specified");
                if (get().ongoingUpdates.items[key]) {
                    get().ongoingUpdates.items[key].abort();
                    set(produce((draft => {
                        draft.ongoingUpdates.items[key] = null;
                    })));
                }
                const controller = new AbortController;
                const {signal: signal} = controller;
                set(produce((draft => {
                    if (!get().lineItemsBeingUpdated.includes(key)) {
                        draft.lineItemsBeingUpdated.push(key);
                    }
                    draft.ongoingUpdates.items[key] = controller;
                })));
                let cart;
                let error = null;
                try {
                    await CartStore.changeCartLineItem({
                        quantity: quantity,
                        properties: properties,
                        id: key
                    }, signal);
                } catch (e) {
                    error = e;
                }
                cart = await CartStore.getCart();
                const prevItemsCount = get().cart.item_count;
                cart = {
                    ...cart,
                    items: cart.items.filter((item => item.quantity > 0))
                };
                set(produce((draft => {
                    draft.lineItemsBeingUpdated = draft.lineItemsBeingUpdated.filter((k => k !== key));
                    draft.cart = cart;
                    draft.ongoingUpdates.items[key] = null;
                })));
                if (prevItemsCount !== cart.item_count) {
                    await get().updateGiftWrapping();
                }
                await get().updateRecommendations();
                if (error) throw error;
                return cart;
            },
            update: async ({attributes: attributes, updates: updates, note: note}, operationId) => {
                if (!attributes && !updates && !note) throw new Error(`At least one of 'attributes', 'updates' or 'note must be specified`);
                if (operationId === "items") throw new Error(`'items' operation id is reserved`);
                if (get().ongoingUpdates[operationId]) {
                    get().ongoingUpdates[operationId].abort();
                    set(produce((draft => {
                        draft.ongoingUpdates[operationId] = null;
                    })));
                }
                const controller = new AbortController;
                const {signal: signal} = controller;
                set(produce((draft => {
                    draft.ongoingUpdates[operationId] = controller;
                })));
                await CartStore.updateCart({
                    attributes: attributes,
                    updates: updates,
                    note: note
                }, signal);
                const cart = await CartStore.getCart();
                set(produce((draft => {
                    draft.cart = cart;
                    draft.ongoingUpdates[operationId] = null;
                })));
                return cart;
            },
            refresh: async () => {
                const cart = await CartStore.getCart();
                const prevItemsCount = get().cart.item_count;
                set(produce((draft => {
                    draft.cart = cart;
                })));
                if (prevItemsCount !== cart.item_count) {
                    await get().updateGiftWrapping();
                }
                await get().updateRecommendations();
                return cart;
            },
            enableRecommendations: async (intent = "related") => {
                if (get().recommendations.enabled) return;
                set(produce((draft => {
                    draft.recommendations.enabled = true;
                    draft.recommendations.intent = intent;
                })));
                await get().updateRecommendations();
            },
            disableRecommendations: async () => {
                if (!get().recommendations.enabled) return;
                set(produce((draft => {
                    draft.recommendations.enabled = false;
                })));
                await get().updateRecommendations();
            },
            resetLatestAddedProduct: () => {
                set(produce((draft => {
                    draft.latestAddedProduct = null;
                })));
            },
            resetVariantsBeingAdded: (variantId = "") => {
                set(produce((draft => {
                    draft.productVariantsBeingAdded = variantId ? draft.productVariantsBeingAdded.filter((id => id !== variantId)) : [];
                })));
            },
            setGiftWrapping: async (enable = true) => {
                const giftWrappingProductId = get().giftWrapping.productId;
                if (!giftWrappingProductId) return null;
                let cart;
                const oldCart = get().cart;
                const giftWrappingIndividual = get().giftWrapping.wrapIndividually;
                if (enable) {
                    set(produce((draft => {
                        draft.giftWrapping.statusBeingUpdated = true;
                    })));
                    const savedGiftWrappingProductId = get().cart.attributes["_gift-wrapping-product-id"];
                    await CartStore.updateCart({
                        attributes: {
                            ...savedGiftWrappingProductId !== giftWrappingProductId ? {
                                "_gift-wrapping-product-id": giftWrappingProductId
                            } : {},
                            "gift-wrapping": enable,
                            "gift-wrapping-message": ""
                        },
                        updates: {
                            [giftWrappingProductId]: giftWrappingIndividual ? oldCart.items.reduce(((nonGiftWrappingQuantity, item) => item.variant_id !== giftWrappingProductId ? nonGiftWrappingQuantity + item.quantity : nonGiftWrappingQuantity), 0) : 1
                        }
                    });
                    cart = await CartStore.getCart();
                    set(produce((draft => {
                        draft.giftWrapping.statusBeingUpdated = false;
                        draft.cart = cart;
                    })));
                } else {
                    let signal = null;
                    let key = null;
                    const giftWrappingItem = get().cart.items.find((item => item.variant_id === giftWrappingProductId));
                    set(produce((draft => {
                        draft.giftWrapping.statusBeingUpdated = true;
                    })));
                    if (giftWrappingItem) {
                        key = giftWrappingItem.key;
                        if (get().ongoingUpdates.items[key]) {
                            get().ongoingUpdates.items[key].abort();
                            set(produce((draft => {
                                draft.ongoingUpdates.items[key] = null;
                            })));
                        }
                        const controller = new AbortController;
                        signal = controller.signal;
                        set(produce((draft => {
                            if (!get().lineItemsBeingUpdated.includes(key)) {
                                draft.lineItemsBeingUpdated.push(key);
                            }
                            draft.ongoingUpdates.items[key] = controller;
                        })));
                    }
                    await CartStore.updateCart({
                        attributes: {
                            "_gift-wrapping-product-id": null,
                            "gift-wrapping": enable,
                            "gift-wrapping-message": ""
                        },
                        updates: {
                            [giftWrappingProductId]: 0
                        }
                    }, signal);
                    cart = await CartStore.getCart();
                    set(produce((draft => {
                        if (key) {
                            draft.lineItemsBeingUpdated = draft.lineItemsBeingUpdated.filter((k => k !== key));
                        }
                        draft.giftWrapping.statusBeingUpdated = false;
                        draft.cart = cart;
                    })));
                }
                return cart;
            },
            syncGiftWrapping: async () => {
                const giftWrappingProductId = get().giftWrapping.productId;
                const savedGiftWrappingProductId = get().cart.attributes["_gift-wrapping-product-id"];
                if (savedGiftWrappingProductId && savedGiftWrappingProductId !== giftWrappingProductId) {
                    const savedGiftWrappingProduct = get().cart.items.find((item => item.id === savedGiftWrappingProductId));
                    if (savedGiftWrappingProduct) {
                        if (get().ongoingUpdates.items[savedGiftWrappingProduct.key]) {
                            get().ongoingUpdates.items[savedGiftWrappingProduct.key].abort();
                            set(produce((draft => {
                                draft.ongoingUpdates.items[savedGiftWrappingProduct.key] = null;
                            })));
                        }
                        const controller = new AbortController;
                        const {signal: signal} = controller;
                        set(produce((draft => {
                            if (!get().lineItemsBeingUpdated.includes(savedGiftWrappingProduct.key)) {
                                draft.lineItemsBeingUpdated.push(savedGiftWrappingProduct.key);
                            }
                            draft.ongoingUpdates.items[savedGiftWrappingProduct.key] = controller;
                        })));
                        await CartStore.updateCart({
                            attributes: {
                                "_gift-wrapping-product-id": null
                            },
                            updates: {
                                [savedGiftWrappingProductId]: 0
                            }
                        }, signal);
                        const cart = await CartStore.getCart();
                        set(produce((draft => {
                            draft.lineItemsBeingUpdated = draft.lineItemsBeingUpdated.filter((k => k !== savedGiftWrappingProduct.key));
                            draft.giftWrapping.statusBeingUpdated = false;
                            draft.cart = cart;
                        })));
                    }
                }
                if (!giftWrappingProductId) return;
                const giftWrappingEnabled = Boolean(get().cart.attributes["gift-wrapping"] === "false" ? false : get().cart.attributes["gift-wrapping"]);
                const giftWrappingIndividual = get().giftWrapping.wrapIndividually;
                const giftWrappingItem = get().cart.items.find((item => item.variant_id === giftWrappingProductId));
                if (!giftWrappingEnabled && giftWrappingItem) {
                    await get().setGiftWrapping(false);
                }
                if (giftWrappingEnabled && !giftWrappingItem) {
                    await get().setGiftWrapping(true);
                }
                if (giftWrappingEnabled && giftWrappingItem && giftWrappingIndividual && giftWrappingItem.quantity === 1) {
                    await get().updateGiftWrapping();
                }
                if (giftWrappingEnabled && giftWrappingItem && !giftWrappingIndividual && giftWrappingItem.quantity > 1) {
                    await get().updateGiftWrapping();
                }
            },
            updateGiftWrapping: async () => {
                const giftWrappingProductId = get().giftWrapping.productId;
                if (!giftWrappingProductId) return;
                const giftWrappingIndividual = get().giftWrapping.wrapIndividually;
                const giftWrappingItem = get().cart.items.find((item => item.variant_id === giftWrappingProductId));
                if (!giftWrappingItem || get().cart.items_count > 1 && !giftWrappingIndividual && giftWrappingItem) return;
                const {key: key} = giftWrappingItem;
                if (get().ongoingUpdates.items[key]) {
                    get().ongoingUpdates.items[key].abort();
                    set(produce((draft => {
                        draft.ongoingUpdates.items[key] = null;
                    })));
                }
                const controller = new AbortController;
                const {signal: signal} = controller;
                set(produce((draft => {
                    if (!get().lineItemsBeingUpdated.includes(key)) {
                        draft.lineItemsBeingUpdated.push(key);
                    }
                    draft.ongoingUpdates.items[key] = controller;
                })));
                let giftWrappingQuantity = giftWrappingIndividual ? get().cart.items.reduce(((nonGiftWrappingQuantity, item) => item.variant_id !== giftWrappingProductId ? nonGiftWrappingQuantity + item.quantity : nonGiftWrappingQuantity), 0) : 1;
                if (giftWrappingItem && get().cart.items.filter((i => i.id !== giftWrappingProductId)).length === 0) {
                    giftWrappingQuantity = 0;
                }
                const giftWrappingAttributeUpdate = giftWrappingQuantity === 0 ? {
                    attributes: {
                        "gift-wrapping": false,
                        "gift-wrapping-message": ""
                    }
                } : {};
                await CartStore.updateCart({
                    ...giftWrappingAttributeUpdate,
                    updates: {
                        [giftWrappingProductId]: giftWrappingQuantity
                    }
                }, signal);
                const cart = await CartStore.getCart();
                set(produce((draft => {
                    draft.lineItemsBeingUpdated = draft.lineItemsBeingUpdated.filter((k => k !== key));
                    draft.cart = cart;
                })));
            },
            updateGiftWrappingMessage: async message => {
                if (get().giftWrapping.messageBeingUpdated && get().ongoingUpdates.giftWrappingMessage) {
                    get().ongoingUpdates.giftWrappingMessage.abort();
                    set(produce((draft => {
                        draft.ongoingUpdates.giftWrappingMessage = null;
                        draft.giftWrapping.messageBeingUpdated = false;
                    })));
                }
                const controller = new AbortController;
                const {signal: signal} = controller;
                set(produce((draft => {
                    draft.ongoingUpdates.giftWrappingMessage = controller;
                    draft.giftWrapping.messageBeingUpdated = true;
                })));
                await CartStore.updateCart({
                    attributes: {
                        "gift-wrapping-message": message
                    }
                }, signal);
                const cart = await CartStore.getCart();
                set(produce((draft => {
                    draft.ongoingUpdates.giftWrappingMessage = null;
                    draft.giftWrapping.messageBeingUpdated = false;
                    draft.cart = cart;
                })));
                return cart;
            },
            updateNote: async note => {
                if (get().noteBeingUpdated && get().ongoingUpdates.note) {
                    get().ongoingUpdates.note.abort();
                    set(produce((draft => {
                        draft.ongoingUpdates.note = null;
                        draft.noteBeingUpdated = false;
                    })));
                }
                const controller = new AbortController;
                const {signal: signal} = controller;
                set(produce((draft => {
                    draft.ongoingUpdates.note = controller;
                    draft.noteBeingUpdated = true;
                })));
                await CartStore.updateCart({
                    note: note
                }, signal);
                const cart = await CartStore.getCart();
                set(produce((draft => {
                    draft.ongoingUpdates.note = null;
                    draft.noteBeingUpdated = false;
                    draft.cart = cart;
                })));
                return cart;
            },
            updateRecommendations: async () => {
                if (!get().recommendations.enabled) return;
                const weightDistribution = "equal";
                const {intent: intent, items: existingRecommendations} = get().recommendations;
                const newRecommendations = {};
                const existingRecommendationsIds = Object.keys(existingRecommendations);
                const productIds = get().cart.items.reduce(((ids, item) => {
                    if (!item.gift_card && !ids.includes(item.product_id.toString())) ids.push(item.product_id.toString());
                    return ids;
                }), []);
                const remainingProductIds = existingRecommendationsIds.filter((productId => productIds.includes(productId)));
                const remainingRecommendations = remainingProductIds.reduce(((recommendations, productId) => ({
                    ...recommendations,
                    [productId]: existingRecommendations[productId]
                })), {});
                const newProductIds = productIds.filter((productId => !existingRecommendationsIds.includes(productId)));
                await Promise.all([ ...remainingProductIds.length < existingRecommendationsIds.length ? remainingProductIds : [], ...newProductIds ].map((async productId => {
                    const data = await fetch(`${this.#rootRoute}recommendations/products.json?product_id=${productId}&intent=${intent}`);
                    const recommendations = await data.json();
                    if (remainingProductIds.includes(productId)) {
                        remainingRecommendations[productId] = recommendations;
                    } else {
                        newRecommendations[productId] = recommendations;
                    }
                })));
                const finalRecommendations = {
                    ...remainingRecommendations,
                    ...newRecommendations
                };
                const calculateWeight = productId => {
                    const totalPrice = get().cart.items.filter((item => item.product_id.toString() === productId)).reduce(((total, item) => total + item.line_price), 0);
                    return totalPrice / get().cart.total_price;
                };
                set(produce((draft => {
                    draft.recommendations.items = Object.keys(finalRecommendations).reduce(((recommendations, productId) => ({
                        ...recommendations,
                        [productId]: {
                            weight: weightDistribution === "proportional" ? calculateWeight(productId) : 1 / get().cart.items.reduce(((items, item) => {
                                if (!items.includes(item.id)) items.push(item.id);
                                return items;
                            }), []).length,
                            products: finalRecommendations[productId].products
                        }
                    })), {});
                })));
            }
        })));
    }
    static #prepareErrorMessageDescription(description = "") {
        const errorMessage = typeof description === "object" ? Object.values(description).reduce(((message, value) => {
            const newMessage = Array.isArray(value) ? value.join("; ") : value;
            return `${message}${newMessage}\n`;
        }), "") : description;
        return errorMessage;
    }
}

const Cart = new CartStore(plugins.reduce(((allFields, plugin) => ({
    ...allFields,
    ...plugin.fields ? plugin.fields : {}
})), {}));

Cart.syncGiftWrapping();

export { CartStore };

export default Cart;
//# sourceMappingURL=cart-store.js.map
