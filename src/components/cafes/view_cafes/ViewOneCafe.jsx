import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function ViewOneCafe() {
  const { id } = useParams();

  const [cafe, setCafe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCafe = async () => {
      try {
        const response = await fetch(`/api/cafes/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch cafe");
        }

        setCafe(data.cafe);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCafe();
  }, [id]);

  if (loading) {
    return <p>Loading cafe...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!cafe) {
    return <p>Cafe not found.</p>;
  }

  return (
    <div>
      <h1>{cafe.name}</h1>

      <h2>Address</h2>
      <p>
        {cafe.address.street} {cafe.address.houseNumber}
        <br />
        {cafe.address.postcode} {cafe.address.city}
        <br />
        {cafe.address.country}
      </p>

      <h2>Location</h2>
      <p>
        Latitude: {cafe.location.latitude}
        <br />
        Longitude: {cafe.location.longitude}
      </p>

      <h2>Added by</h2>
      <p>
        {cafe.createdBy?.name}
        <br />
        {cafe.createdBy?.email}
      </p>

      <h2>Ratings</h2>

      <p>
        Computer: {cafe.ratingSummary.computer.average} / 5
        {" "}({cafe.ratingSummary.computer.count} ratings)
      </p>

      <p>
        Accessible: {cafe.ratingSummary.accessible.average} / 5
        {" "}({cafe.ratingSummary.accessible.count} ratings)
      </p>

      <p>
        Vegetarian: {cafe.ratingSummary.veggie.average} / 5
        {" "}({cafe.ratingSummary.veggie.count} ratings)
      </p>

      <p>
        Cosy: {cafe.ratingSummary.cosy.average} / 5
        {" "}({cafe.ratingSummary.cosy.count} ratings)
      </p>

      <p>
        Date spot: {cafe.ratingSummary.datespot.average} / 5
        {" "}({cafe.ratingSummary.datespot.count} ratings)
      </p>
    </div>
  );
}

export default ViewOneCafe;
