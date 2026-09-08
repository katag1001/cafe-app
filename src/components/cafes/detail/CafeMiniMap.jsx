import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// maplibre-gl resolves its worker script relative to its own runtime module
// URL, which Vite can't statically detect/bundle. The worker script also has
// its own relative import of maplibre-gl-shared.mjs, which a Vite `?url`
// asset import wouldn't follow — so both files are copied unhashed into
// public/maplibre-worker (see scripts/sync-maplibre-worker.js) and referenced
// by that stable path instead.
maplibregl.setWorkerUrl("/maplibre-worker/maplibre-gl-worker.mjs");

// A single fixed marker, no interactivity — just shows where the cafe is.
function CafeMiniMap({ latitude, longitude }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const protomapsKey = import.meta.env.VITE_PROTOMAPS_KEY;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.protomaps.com/styles/v5/light/en.json?key=${protomapsKey}`,
      center: [longitude, latitude],
      zoom: 15,
      interactive: false,
    });

    new maplibregl.Marker().setLngLat([longitude, latitude]).addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [latitude, longitude]);

  return <div ref={mapContainer} className="cafe-mini-map" />;
}

export default CafeMiniMap;
