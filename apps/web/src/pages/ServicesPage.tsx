import { FormEvent, useEffect, useState } from "react";
import { API } from "../lib/config";
import { Appointment, Service, User } from "../types";

export function ServicesPage({ token, me }: { token: string; me: User | null }) {
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

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
    const fd = new FormData(e.currentTarget);
    await fetch(`${API}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: String(fd.get("name")),
        description: String(fd.get("description")),
        durationMinutes: Number(fd.get("durationMinutes")),
        priceUsd: Number(fd.get("priceUsd"))
      })
    });
    e.currentTarget.reset();
    load();
  }

  async function book(serviceId: string) {
    await fetch(`${API}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ serviceId, startAt: new Date(Date.now() + 86400000).toISOString() })
    });
    load();
  }

  return (
    <section className="card">
      <h2>Services</h2>
      {me?.role === "businessOwner" ? (
        <form className="form" onSubmit={createService}>
          <input className="input" name="name" placeholder="Service name" required />
          <textarea className="textarea" name="description" placeholder="Description" required />
          <input className="input" name="durationMinutes" type="number" defaultValue={60} />
          <input className="input" name="priceUsd" type="number" step="0.01" defaultValue={20} />
          <button className="btn primary" type="submit">Add service</button>
        </form>
      ) : <p className="muted">As a student, you can book services.</p>}

      <div style={{ marginTop: 12 }}>
        {services.map((s) => (
          <div className="offerRow" key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <div className="meta">{s.durationMinutes} min · ${s.priceUsd.toFixed(2)}</div>
            </div>
            {me?.role === "student" ? <button className="btn" onClick={() => book(s.id)}>Book</button> : null}
          </div>
        ))}
      </div>

      <h3>Your appointments</h3>
      {appointments.map((a) => <div key={a.id} className="meta">{new Date(a.startAt).toLocaleString()} · {a.status}</div>)}
    </section>
  );
}
