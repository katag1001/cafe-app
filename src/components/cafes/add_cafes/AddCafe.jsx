import { useState } from "react";

import "./AddCafe.css";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const emptyFormData = {
  name: "",
  street: "",
  houseNumber: "",
  city: "",
  postcode: "",
  country: "",
};

const emptyHoursDraft = () =>
  DAYS.reduce((acc, day) => ({ ...acc, [day]: { open: "", close: "" } }), {});

const AddCafe = ({ currentUser }) => {
  // step: "form" (initial address entry) -> "confirm" (review/edit before saving)
  const [step, setStep] = useState("form");
  const [formData, setFormData] = useState(emptyFormData);

  const [checkResult, setCheckResult] = useState(null);
  const [hoursDraft, setHoursDraft] = useState(emptyHoursDraft());
  const [phoneDraft, setPhoneDraft] = useState("");
  const [websiteDraft, setWebsiteDraft] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleHoursChange = (day, field, value) => {
    setHoursDraft((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const address = {
    street: formData.street,
    houseNumber: formData.houseNumber,
    city: formData.city,
    postcode: formData.postcode,
    country: formData.country,
  };

  // Step 1 -> runs the two-stage verification and shows the result for
  // review, without saving anything yet.
  const handleCheck = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/cafes/check", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to check this address");
      }

      setCheckResult(data);

      const draft = emptyHoursDraft();
      (data.openingHours || []).forEach(({ day, open, close }) => {
        if (draft[day]) draft[day] = { open, close };
      });
      setHoursDraft(draft);
      setPhoneDraft(data.phone || "");
      setWebsiteDraft(data.website || "");

      setStep("confirm");
    } catch (checkError) {
      setError(checkError.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> actually saves the cafe with whatever the user confirmed/edited.
  const handleConfirm = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    const openingHours = DAYS.filter(
      (day) => hoursDraft[day].open && hoursDraft[day].close,
    ).map((day) => ({ day, open: hoursDraft[day].open, close: hoursDraft[day].close }));

    try {
      const response = await fetch("/api/cafes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          address,
          openingHours,
          phone: phoneDraft,
          website: websiteDraft,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create cafe");
      }

      setMessage(
        data.cafe.addressVerification.status === "verified"
          ? "Cafe successfully added and is now live!"
          : "Cafe submitted — we couldn't automatically confirm it, so it'll appear once an admin reviews it.",
      );

      setFormData(emptyFormData);
      setCheckResult(null);
      setHoursDraft(emptyHoursDraft());
      setPhoneDraft("");
      setWebsiteDraft("");
      setStep("form");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("form");
    setError("");
  };

  if (step === "confirm") {
    return (
      <div className="add-cafe">
        <h1>Confirm details</h1>

        {checkResult.verified ? (
          <p className="message">
            We matched this to a known business — it'll be listed immediately once you confirm.
          </p>
        ) : (
          <p className="message">
            We couldn't automatically confirm this address is a real business — it'll be
            submitted for admin review instead of appearing right away.
          </p>
        )}

        <p>
          {checkResult.location?.displayName ||
            `${address.street} ${address.houseNumber}, ${address.postcode} ${address.city}, ${address.country}`}
        </p>

        <form onSubmit={handleConfirm}>
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="text"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              value={websiteDraft}
              onChange={(e) => setWebsiteDraft(e.target.value)}
            />
          </div>

          <fieldset>
            <legend>Opening hours (optional)</legend>

            {DAYS.map((day) => (
              <div className="form-group hours-row" key={day}>
                <label>{day}</label>
                <input
                  type="time"
                  value={hoursDraft[day].open}
                  onChange={(e) => handleHoursChange(day, "open", e.target.value)}
                />
                <span>to</span>
                <input
                  type="time"
                  value={hoursDraft[day].close}
                  onChange={(e) => handleHoursChange(day, "close", e.target.value)}
                />
              </div>
            ))}
          </fieldset>

          <button type="button" onClick={handleBack} disabled={loading}>
            Back
          </button>

          <button type="submit" disabled={loading}>
            {loading ? "Adding Cafe..." : "Add Cafe"}
          </button>
        </form>

        {error && <p className="message">{error}</p>}
      </div>
    );
  }

  return (
    <div className="add-cafe">
      <h1>Add a Cafe</h1>

      <form onSubmit={handleCheck}>
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
          {loading ? "Checking address..." : "Continue"}
        </button>
      </form>

      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AddCafe;
