import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import CafeSidebar from "./CafeSidebar";
import "./cafeMap.css";

function ViewCafeMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  const [cafes, setCafes] = useState([]);

  // Load cafes from the API
  useEffect(() => {
    const loadCafes = async () => {
      try {
        const response = await fetch("/api/cafes");
        const data = await response.json();

        if (data.success) {
          setCafes(data.cafes);
        }
      } catch (error) {
        console.error("Failed to load cafes:", error);
      }
    };

    loadCafes();
  }, []);

  // Initialise the map
  useEffect(() => {
    if (map.current) return;

    const protomapsKey = import.meta.env.VITE_PROTOMAPS_KEY;

    const newMap = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.protomaps.com/styles/v5/light/en.json?key=${protomapsKey}`,
      center: [2.1686, 41.3874],
      zoom: 12,
    });

    newMap.on("load", () => {
      console.log("🗺️ MAP LOADED");
    });

    newMap.on("error", (event) => {
      console.error("🗺️ MAP ERROR:", event);
    });

    newMap.addControl(
      new maplibregl.NavigationControl(),
      "top-right"
    );

    map.current = newMap;

    return () => {
      newMap.remove();
      map.current = null;
    };
  }, []);

  // Add cafe markers
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    cafes.forEach((cafe) => {
      const { latitude, longitude } = cafe.location;

      const marker = new maplibregl.Marker()
        .setLngLat([longitude, latitude])
        .setPopup(
          new maplibregl.Popup().setHTML(`
            <strong>${cafe.name}</strong>
            <br />
            ${cafe.address.street} ${cafe.address.houseNumber}
            <br />
            ${cafe.address.city}
          `)
        )
        .addTo(map.current);

      markers.current.push(marker);
    });
  }, [cafes]);

  return (
    <div className="cafe-map">
      <CafeSidebar cafes={cafes} />

      <div
        ref={mapContainer}
        className="cafe-map-container"
      />
    </div>
  );
}

export default ViewCafeMap;
