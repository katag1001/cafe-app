const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Deliberately broad, per PRD.md §7.1: this confirms "a business is here",
// not specifically a cafe, since OSM's tagging of small independent cafes is
// inconsistent. `shop`/`office`/`craft` cover most commercial/service POIs;
// the `amenity` list is curated to commercial/service values only, excluding
// infrastructure like `bench`, `waste_basket`, `parking`, `bicycle_parking`.
const AMENITY_VALUES = [
  "cafe",
  "restaurant",
  "fast_food",
  "bar",
  "pub",
  "bakery",
  "ice_cream",
  "pharmacy",
  "bank",
  "marketplace",
  "fuel",
  "car_wash",
  "veterinary",
  "dentist",
  "clinic",
  "cinema",
  "theatre",
  "nightclub",
  "casino",
  "coworking_space",
  "post_office",
  "car_rental",
  "driving_school",
];

const TOURISM_VALUES = ["hotel", "guest_house", "hostel"];

const RADIUS_METERS = 50;

function buildQuery(lat, lon) {
  const around = `around:${RADIUS_METERS},${lat},${lon}`;
  const amenityRegex = AMENITY_VALUES.join("|");
  const tourismRegex = TOURISM_VALUES.join("|");

  return `
    [out:json][timeout:10];
    (
      node(${around})[shop];
      node(${around})[amenity~"^(${amenityRegex})$"];
      node(${around})[office];
      node(${around})[craft];
      node(${around})[tourism~"^(${tourismRegex})$"];
    );
    out body 10;
  `;
}

// Haversine distance in meters — used only to pick the closest of several
// candidate POIs Overpass might return within the radius.
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Returns { openingHours, phone, website } (each possibly null) from the
// closest matching business, or null if nothing was found nearby.
const findNearbyBusiness = async (lat, lon) => {
  const query = buildQuery(lat, lon);

  let response;

  try {
    response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Testapp/1.0 (katarinag1001@gmail.com)",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
  } catch (error) {
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const elements = data.elements || [];

  if (!elements.length) {
    return null;
  }

  let closest = elements[0];
  let closestDistance = distanceMeters(lat, lon, closest.lat, closest.lon);

  for (const element of elements.slice(1)) {
    const distance = distanceMeters(lat, lon, element.lat, element.lon);
    if (distance < closestDistance) {
      closest = element;
      closestDistance = distance;
    }
  }

  const tags = closest.tags || {};

  return {
    openingHours: tags.opening_hours || null,
    phone: tags.phone || tags["contact:phone"] || null,
    website: tags.website || tags["contact:website"] || null,
  };
};

module.exports = { findNearbyBusiness };
