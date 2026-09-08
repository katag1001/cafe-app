const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

const findAddress = async ({
  street,
  houseNumber,
  city,
  postcode,
  country,
}) => {
  const addressParts = [
    houseNumber,
    street,
    city,
    postcode,
    country,
  ];

  const filteredParts = addressParts.filter(Boolean);
  const address = filteredParts.join(", ");

  const url = new URL(NOMINATIM_URL);

  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  let response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "Testapp/1.0 (katarinag1001@gmail.com)",
      },
    });
  } catch (error) {
    throw error;
  }

  if (!response.ok) {
    throw new Error(
      `Nominatim request failed: ${response.status} ${response.statusText}`
    );
  }

  let results;

  try {
    results = await response.json();
  } catch (error) {
    throw error;
  }

  if (!results.length) {
    return null;
  }

  const result = results[0];

  const location = {
    latitude: Number(result.lat),
    longitude: Number(result.lon),

    osm: {
      type: result.osm_type,
      id: result.osm_id,
    },

    displayName: result.display_name,
  };

  return location;
};

// Coordinates -> city/country, used to resolve "where am I" from the
// browser's Geolocation API (which only ever returns lat/lng) into the same
// city/country strings stored on Cafe.address and User.contributorStats.cities.
const reverseGeocode = async ({ latitude, longitude }) => {
  const url = new URL(NOMINATIM_REVERSE_URL);

  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "10");
  // Without this, Nominatim returns city/country names in the place's local
  // language (e.g. "España" for Spain), which never matches the English
  // strings stored in Cafe.address / User.contributorStats.cities.
  url.searchParams.set("accept-language", "en");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Testapp/1.0 (katarinag1001@gmail.com)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Nominatim reverse request failed: ${response.status} ${response.statusText}`
    );
  }

  const result = await response.json();
  const address = result?.address;

  if (!address) {
    return null;
  }

  const city = address.city || address.town || address.village || address.municipality;

  if (!city || !address.country) {
    return null;
  }

  return { city, country: address.country };
};

// Coordinates -> street-level address fields, used to prefill the "Add a
// Cafe" form from the browser's Geolocation API. Distinct from
// reverseGeocode() above (which only needs city/country at zoom=10 for
// badge matching) — this asks for building-level detail and returns the
// same field shape the add-cafe form/Cafe.address use.
const reverseGeocodeAddress = async ({ latitude, longitude }) => {
  const url = new URL(NOMINATIM_REVERSE_URL);

  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  // Keep this in English too, since it feeds Cafe.address.country — the same
  // field reverseGeocode() above matches against for the "Local" badge.
  url.searchParams.set("accept-language", "en");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Testapp/1.0 (katarinag1001@gmail.com)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Nominatim reverse request failed: ${response.status} ${response.statusText}`
    );
  }

  const result = await response.json();
  const address = result?.address;

  if (!address) {
    return null;
  }

  const city = address.city || address.town || address.village || address.municipality;

  return {
    street: address.road || "",
    houseNumber: address.house_number || "",
    city: city || "",
    postcode: address.postcode || "",
    country: address.country || "",
  };
};

module.exports = {
  findAddress,
  reverseGeocode,
  reverseGeocodeAddress,
};
