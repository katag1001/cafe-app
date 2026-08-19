const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

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

module.exports = {
  findAddress,
};
