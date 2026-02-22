import { FormEvent, useEffect, useState } from "react";
import { API } from "../lib/config";
import { Role, User } from "../types";

export function ProfilePage({ token, me, setMe }: { token: string; me: User | null; setMe: (u: User) => void }) {
  const [name, setName] = useState(me?.name ?? "");
  const [role, setRole] = useState<Role>(me?.role ?? "student");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((u) => {
        setName(u.name);
        setRole(u.role);
        setMe(u);
      });
  }, [token, setMe]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, role })
    });
    const u = await res.json();
    setMe(u);
    setMsg("Saved");
  }

  return (
    <section className="card" style={{ maxWidth: 560 }}>
      <h2>Profile</h2>
      <p className="meta">{me?.email} {me?.schoolVerified ? "✅ verified" : ""}</p>
      <form className="form" onSubmit={save}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="student">Student</option>
          <option value="businessOwner">Business Owner</option>
        </select>
        <button className="btn primary" type="submit">Save profile</button>
      </form>
      {msg ? <p className="muted">{msg}</p> : null}
    </section>
  );
}
