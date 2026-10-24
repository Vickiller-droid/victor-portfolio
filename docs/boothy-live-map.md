# Boothy live-map increment

Includes a user-opened Leaflet 1.9.4 map, destination pin selection, explicit GPS watch/stop, accuracy display and stale-fix warnings. GPS coordinates remain in memory; selected destination pins are stored with the local trip. The map uses OpenStreetMap standard raster tiles with visible attribution, normal browser caching and no prefetch/offline downloads. Tile configuration lives in public/boothy/map-config.json so the host can change provider without changing app logic.

No geocoding service or public routing demo has been integrated. Users select their destination pin on the map. No claims are made about road distance, traffic-aware ETA, automatic arrival detection or reliable background/locked-screen GPS. The existing manual ETA still schedules reminders. Map distance is explicitly labelled straight-line distance.

## Provider requirements before wider release
OSM standard tiles are best-effort and can be withdrawn; review https://operations.osmfoundation.org/policies/tiles/ before scaling. Do not prefetch, strip Referer, force no-cache or hide attribution. Select an appropriate supported map/geocoding/routing provider and configure required credentials/billing before public release at scale. Public Nominatim and OSRM demo endpoints are not used as a production shortcut.

## Verification
Location tests cover valid coordinates, geodesic distance, stale/future fixes, accuracy, watcher ID zero, cleanup, denied permission, unsupported GPS, late callbacks after stop, and manual ETA preservation when choosing a destination pin. Physical Android movement and locked-screen behavior must still be checked on the owner's phone.
