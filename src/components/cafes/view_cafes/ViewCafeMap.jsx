import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

import CafeSidebar from "./CafeSidebar";
import CategoryFilterBar from "../filters/CategoryFilterBar";
import CafeSearchBox from "../filters/CafeSearchBox";
import "./cafeMap.css";

// maplibre-gl resolves its worker script relative to its own runtime module
// URL, which Vite can't statically detect/bundle — point it at the URL Vite
// actually emits for the worker chunk instead (see CLAUDE.md deploy notes).
maplibregl.setWorkerUrl(maplibreWorkerUrl);

// Below this zoom level, cafes simply aren't fetched/shown at all (PRD.md
// §10.3) — a floor, not full marker clustering (explicitly deferred).
const MIN_ZOOM_FOR_CAFES = 10;
const VIEWPORT_DEBOUNCE_MS = 350;

function ViewCafeMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const debounceRef = useRef(null);

  const [bounds, setBounds] = useState(null);
  const [zoomTooFarOut, setZoomTooFarOut] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [openNow, setOpenNow] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [cafes, setCafes] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleCategory = (categoryId) => {
    setPage(1);
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((c) => c !== categoryId) : [...prev, categoryId],
    );
  };

  const toggleOpenNow = () => {
    setPage(1);
    setOpenNow((prev) => !prev);
  };

  const handleSearchChange = (value) => {
    setPage(1);
    setSearch(value);
  };

  // Load cafes whenever the viewport or any filter changes.
  useEffect(() => {
    if (!bounds || zoomTooFarOut) {
      setCafes([]);
      setPagination(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    params.set("bounds", bounds.join(","));
    if (selectedCategories.length) params.set("categories", selectedCategories.join(","));
    if (search) params.set("search", search);
    if (openNow) params.set("openNow", "true");
    params.set("page", String(page));

    fetch(`/api/cafes?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setCafes(data.cafes);
          setPagination(data.pagination);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bounds, zoomTooFarOut, selectedCategories, search, openNow, page]);

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

    newMap.addControl(new maplibregl.NavigationControl(), "top-right");

    const updateViewport = () => {
      const mapBounds = newMap.getBounds();
      setZoomTooFarOut(newMap.getZoom() < MIN_ZOOM_FOR_CAFES);
      setBounds([mapBounds.getWest(), mapBounds.getSouth(), mapBounds.getEast(), mapBounds.getNorth()]);
    };

    newMap.on("load", () => {
      updateViewport();

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            newMap.setCenter([position.coords.longitude, position.coords.latitude]);
          },
          () => {
            // Permission denied or unavailable — keep the default center.
          },
        );
      }
    });

    newMap.on("error", (event) => {
      console.error("Map error:", event);
    });

    const debouncedUpdate = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(updateViewport, VIEWPORT_DEBOUNCE_MS);
    };

    newMap.on("moveend", debouncedUpdate);
    newMap.on("zoomend", debouncedUpdate);

    map.current = newMap;

    return () => {
      clearTimeout(debounceRef.current);
      newMap.remove();
      map.current = null;
    };
  }, []);

  // Add cafe markers
  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    cafes.forEach((cafe) => {
      if (!cafe.location) return;
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
            <br />
            Score: ${cafe.displayScore != null ? cafe.displayScore.toFixed(1) : "—"} / 5
          `)
        )
        .addTo(map.current);

      markers.current.push(marker);
    });
  }, [cafes]);

  return (
    <div className="cafe-map">
      <div className="cafe-sidebar-wrapper">
        <CategoryFilterBar
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          openNow={openNow}
          onToggleOpenNow={toggleOpenNow}
        />

        <CafeSearchBox value={search} onChange={handleSearchChange} />

        {zoomTooFarOut ? (
          <p className="zoom-prompt">Zoom in to see cafes.</p>
        ) : (
          <CafeSidebar
            cafes={cafes}
            loading={loading}
            pagination={pagination}
            page={page}
            onPageChange={setPage}
          />
        )}
      </div>

      <div ref={mapContainer} className="cafe-map-container" />
    </div>
  );
}

export default ViewCafeMap;
