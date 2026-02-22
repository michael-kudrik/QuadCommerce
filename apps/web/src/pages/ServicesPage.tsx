import { FormEvent, useEffect, useState } from "react";
import { API } from "../lib/config";
import { Appointment, Service, User } from "../types";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read selected image file."));
    reader.readAsDataURL(file);
  });
}

function ServiceCardImage({ imageUrl, name }: { imageUrl?: string; name: string }) {
  return imageUrl
    ? <img src={imageUrl} alt={name} className="listingImage" />
    : <div className="listingImage serviceImageFallback" aria-label="No service image">🧰</div>;
}

export function ServicesPage({ token, me }: { token: string; me: User | null }) {
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDates, setSelectedDates] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function load() {
    const [s, a] = await Promise.all([
      fetch(`${API}/services`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API}/appointments`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
    ]);
    setServices(s);
    setAppointments(a);
  }

  useEffect(() => {
    load();
  }, [token]);

  async function createService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);

    let imageUrl = String(fd.get("imageUrl") || "").trim();
    const file = fd.get("imageFile") as File | null;

    if (file && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
      }
      if (file.size > 1_500_000) {
        setError("Image too large. Please use an image under 1.5MB.");
        return;
      }
      imageUrl = await readFileAsDataUrl(file);
    }

    await fetch(`${API}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: String(fd.get("name")),
        description: String(fd.get("description")),
        durationMinutes: Number(fd.get("durationMinutes")),
        priceUsd: Number(fd.get("priceUsd")),
        imageUrl
      })
    });
    e.currentTarget.reset();
    load();
  }

  async function book(serviceId: string) {
    const date = selectedDates[serviceId];
    if (!date) return;

    const startAt = new Date(`${date}T09:00:00`).toISOString();
    await fetch(`${API}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ serviceId, startAt })
    });
    load();
  }

  async function approveAppointment(appointmentId: string) {
    setError("");
    const res = await fetch(`${API}/appointments/${appointmentId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({})
    });
    if (!res.ok) setError("Failed to approve appointment.");
    await load();
  }

  async function denyAppointment(appointmentId: string) {
    setError("");
    const res = await fetch(`${API}/appointments/${appointmentId}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({})
    });
    if (!res.ok) setError("Failed to deny appointment.");
    await load();
  }

  return (
    <section className="card">
      <h2>Services</h2>
      {me?.role === "businessOwner" ? (
        <form className="form" onSubmit={createService}>
          <input className="input" name="name" placeholder="Service name" required />
          <textarea className="textarea" name="description" placeholder="Description" required />
          <input className="input" name="durationMinutes" type="number" defaultValue={60} />
          <span className="fileHint">Duration helper: enter total time in minutes (15 - 480).</span>
          <input className="input" name="priceUsd" type="number" step="0.01" defaultValue={20} />
          <span className="fileHint">Cost helper: enter USD amount (e.g. 25 or 25.50).</span>
          <input className="input" name="imageUrl" placeholder="Service image URL (optional)" />
          <input className="input" name="imageFile" type="file" accept="image/*" />
          <span className="fileHint">Tip: choose either image URL or upload a file (max 1.5MB).</span>
          <button className="btn primary" type="submit">Add service</button>
        </form>
      ) : <p className="muted">As a student, you can book services.</p>}

      <div className="listingsGrid" style={{ marginTop: 12 }}>
        {services.map((s) => (
          <article className="card" key={s.id} style={{ marginBottom: 0 }}>
            <ServiceCardImage imageUrl={s.imageUrl} name={s.name} />
            <strong>{s.name}</strong>
            <div className="meta">{s.durationMinutes} min · ${s.priceUsd.toFixed(2)}</div>
            <p className="meta">{s.description}</p>
            {me?.role === "student" ? (
              <div className="row" style={{ alignItems: "center", gap: 8 }}>
                <input
                  className="input"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDates[s.id] ?? ""}
                  onChange={(e) => setSelectedDates((prev) => ({ ...prev, [s.id]: e.target.value }))}
                />
                <button className="btn" onClick={() => book(s.id)} disabled={!selectedDates[s.id]}>Book</button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <h3>Your appointments</h3>
      {appointments.map((a) => {
        const canReview = me?.role === "businessOwner" && (a.status === "pending" || a.status === "scheduled");
        return (
          <div key={a.id} className="offerRow">
            <span>
              {new Date(a.startAt).toLocaleString()} · {a.customerName} · {a.status}
            </span>
            {canReview ? (
              <div className="row">
                <button className="btn" onClick={() => approveAppointment(a.id)}>Approve</button>
                <button className="btn" onClick={() => denyAppointment(a.id)}>Deny</button>
              </div>
            ) : null}
          </div>
        );
      })}
      {error ? <p className="meta" style={{ color: "#ef4444" }}>{error}</p> : null}
    </section>
  );
}
