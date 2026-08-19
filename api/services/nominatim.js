const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const findAddress = async ({
  street,
  houseNumber,
  city,
  postcode,
  country,
}) => {
  const address = [
    houseNumber,
    street,
    city,
    postcode,
    country,
  ]
    .filter(Boolean)
    .join(", ");

  const url = new URL(NOMINATIM_URL);

  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Testapp/1.0 (katarinag1001@gmail.com)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Nominatim request failed: ${response.status} ${response.statusText}`
    );
  }

  const results = await response.json();

  if (!results.length) {
    return null;
  }

  const result = results[0];

  return {
    latitude: Number(result.lat),
    longitude: Number(result.lon),

    osm: {
      type: result.osm_type,
      id: result.osm_id,
    },

    displayName: result.display_name,
  };
};

module.exports = {
  findAddress,
};
