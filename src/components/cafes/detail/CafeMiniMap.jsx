import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
