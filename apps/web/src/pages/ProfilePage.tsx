import { FormEvent, useEffect, useState } from "react";
import { API } from "../lib/config";
import { Role, User } from "../types";

function Avatar({ name, imageUrl, size = 88 }: { name?: string; imageUrl?: string; size?: number }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name ? `${name} profile` : "Profile"} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />;
  }

  return (
    <span
      aria-label="Default profile icon"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--border)",
        background: "var(--chip)",
        fontSize: size * 0.5,
        lineHeight: 1
      }}
    >
      👤
    </span>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read selected image file."));
    reader.readAsDataURL(file);
  });
}

export function ProfilePage({ token, me, setMe }: { token: string; me: User | null; setMe: (u: User) => void }) {
  const [name, setName] = useState(me?.name ?? "");
  const [role, setRole] = useState<Role>(me?.role ?? "student");
  const [description, setDescription] = useState(me?.description ?? "");
  const [portfolioWebsite, setPortfolioWebsite] = useState(me?.portfolioWebsite ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState(me?.profileImageUrl ?? "");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((u) => {
        setName(u.name);
        setRole(u.role);
        setDescription(u.description ?? "");
        setPortfolioWebsite(u.portfolioWebsite ?? "");
        setProfileImageUrl(u.profileImageUrl ?? "");
        setMe(u);
      });
  }, [token, setMe]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    const res = await fetch(`${API}/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, role, description, portfolioWebsite, profileImageUrl })
    });
    const u = await res.json();

    if (!res.ok) {
      setMsg(u?.error ? "Could not save profile (check website/image URL format)." : "Could not save profile.");
      return;
    }

    setMe(u);
    setMsg("Saved");
  }

  async function onProfileImageFileChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Please select an image file.");
      return;
    }
    if (file.size > 1_500_000) {
      setMsg("Image too large. Please use an image under 1.5MB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setProfileImageUrl(dataUrl);
  }

  return (
    <section className="card" style={{ maxWidth: 560 }}>
      <h2>Profile</h2>
      <div className="row" style={{ alignItems: "center", marginBottom: 8 }}>
        <Avatar name={name || me?.name} imageUrl={profileImageUrl || me?.profileImageUrl} />
        <p className="meta" style={{ margin: 0 }}>{me?.email} {me?.schoolVerified ? "✅ verified" : ""}</p>
      </div>
      <form className="form" onSubmit={save}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="student">Student</option>
          <option value="businessOwner">Business Owner</option>
        </select>
        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          placeholder="Business/profile description"
        />
        <input
          className="input"
          type="url"
          value={portfolioWebsite}
          onChange={(e) => setPortfolioWebsite(e.target.value)}
          placeholder="Portfolio website (https://...)"
        />
        <input
          className="input"
          type="url"
          value={profileImageUrl}
          onChange={(e) => setProfileImageUrl(e.target.value)}
          placeholder="Profile image URL (https://...)"
        />
        <input
          className="input"
          type="file"
          accept="image/*"
          onChange={(e) => onProfileImageFileChange(e.target.files?.[0] ?? null)}
        />
        <span className="fileHint">Tip: choose either image URL or upload a profile photo (max 1.5MB).</span>
        <button className="btn primary" type="submit">Save profile</button>
      </form>
      {msg ? <p className="muted">{msg}</p> : null}
    </section>
  );
}
