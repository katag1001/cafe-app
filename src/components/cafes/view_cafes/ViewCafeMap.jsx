import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";


function ViewCafeMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [cafes, setCafes] = useState([]);

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


  useEffect(() => {
    if (!map.current || cafes.length === 0) return;

    cafes.forEach((cafe) => {
      const { latitude, longitude } = cafe.location;

      new maplibregl.Marker()
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
    });
  }, [cafes]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "600px",
      }}
    />
  );
}

export default ViewCafeMap;
