import { useState } from "react";
import { getSessionToken } from "../../login/authCache";

import "./AddCafe.css";

const AddCafe = () => {
  const [formData, setFormData] = useState({
    name: "",
    street: "",
    houseNumber: "",
    city: "",
    postcode: "",
    country: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Check whether the user is logged in.
  const token = getSessionToken();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const cafeData = {
      name: formData.name,

      address: {
        street: formData.street,
        houseNumber: formData.houseNumber,
        city: formData.city,
        postcode: formData.postcode,
        country: formData.country,
      },
    };

    try {
      const token = getSessionToken();

      console.log("TOKEN FROM AUTH CACHE:", token);
      console.log("TOKEN LENGTH:", token?.length);

      const response = await fetch("/api/cafes", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(cafeData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create cafe");
      }

      console.log("Cafe created:", data);

      setMessage("Cafe successfully added!");

      setFormData({
        name: "",
        street: "",
        houseNumber: "",
        city: "",
        postcode: "",
        country: "",
      });
    } catch (error) {
      console.error("Error creating cafe:", error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // If the user is not logged in, don't display the form.
  if (!token) {
    return (
      <div className="add-cafe">
        <p className="message">
          Please{" "}
          <a href="/login">log in</a>{" "}
          to add a cafe
        </p>
      </div>
    );
  }

  return (
    <div className="add-cafe">
      <h1>Add a Cafe</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Cafe name</label>

          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="street">Street</label>

          <input
            id="street"
            name="street"
            type="text"
            value={formData.street}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="houseNumber">House number</label>

          <input
            id="houseNumber"
            name="houseNumber"
            type="text"
            value={formData.houseNumber}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="city">City</label>

          <input
            id="city"
            name="city"
            type="text"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="postcode">Postcode</label>

          <input
            id="postcode"
            name="postcode"
            type="text"
            value={formData.postcode}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="country">Country</label>

          <input
            id="country"
            name="country"
            type="text"
            value={formData.country}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Adding Cafe..." : "Add Cafe"}
        </button>
      </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AddCafe;
