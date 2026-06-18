/*! Copyright (c) Safe As Milk. All rights reserved. */
import { Loader } from "googlemaps-js-api-loader";

import { getPinStyle, getMapStyle } from "map-settings";

class InteractiveMap extends HTMLElement {
    #apiKey;
    async connectedCallback() {
        this.#apiKey = this.getAttribute("api-key");
        if (!this.#apiKey) return;
        this.map = null;
        this.address = this.getAttribute("map-address");
        this.mapStyle = this.getAttribute("map-style");
        this.mapPinStyle = this.getAttribute("map-pin-style");
        try {
            if (!window?.google?.maps) {
                const loader = new Loader({
                    apiKey: this.#apiKey,
                    version: "weekly",
                    libraries: [ "core", "geocoding", "maps", "marker" ]
                });
                await loader.importLibrary("core");
            }
            const {Map: Map} = await window.google.maps.importLibrary("maps");
            const options = {
                zoom: 14,
                zoomControl: true,
                center: {
                    lat: 0,
                    lng: 0
                },
                disableDefaultUI: true,
                scrollwheel: false,
                keyboardShortcuts: false,
                styles: getMapStyle(this.mapStyle)
            };
            this.map = new Map(this, options);
            const {Geocoder: Geocoder} = await window.google.maps.importLibrary("geocoding");
            const geocoder = new Geocoder;
            geocoder.geocode({
                address: this.address
            }, ((results, status) => {
                if (status === window.google.maps.GeocoderStatus.OK) {
                    if (status !== window.google.maps.GeocoderStatus.ZERO_RESULTS) {
                        this.map.setCenter(results[0].geometry.location);
                        new window.google.maps.Marker({
                            map: this.map,
                            position: results[0].geometry.location,
                            icon: getPinStyle(this.mapPinStyle)
                        });
                    }
                } else {
                    console.log(`Geocode was not successful for the following reason: ${status}`);
                }
            }));
        } catch (error) {
            console.log(error);
        }
    }
}

customElements.define("interactive-map", InteractiveMap);
//# sourceMappingURL=interactive-map.js.map
