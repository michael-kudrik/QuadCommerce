import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "./App.css";

type Role = "student" | "businessOwner";
type User = { id: string; name: string; email: string; role: Role; schoolVerified: boolean };
type Offer = { id: string; bidderName: string; amount: number; createdAt: string };
type Listing = {
  id: string;
  sellerName: string;
  title: string;
  description: string;
  category: "textbook" | "dorm" | "other";
  status: "OPEN" | "SOLD" | "CLOSED";
  offerWindowEndsAt: string;
  acceptedOfferId?: string;
  offers: Offer[];
};
type Service = { id: string; name: string; description: string; durationMinutes: number; priceUsd: number; isActive: boolean };
type Appointment = { id: string; serviceId: string; customerName: string; customerEmail: string; startAt: string; status: "scheduled"|"completed"|"cancelled" };
type ChatMessage = { id: string; senderName: string; senderEmail: string; text: string; createdAt: string };

const API = "http://localhost:4000/api";
const socket = io("http://localhost:4000", { transports: ["websocket"] });

export function App() {
  const [theme, setTheme] = useState<"light"|"dark">(() => (localStorage.getItem("qc-theme") === "dark" ? "dark" : "light"));
  const [token, setToken] = useState<string>(() => localStorage.getItem("qc-token") || "");
  const [me, setMe] = useState<User | null>(() => {
    const raw = localStorage.getItem("qc-me");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("qc-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("qc-token", token);
    if (me) localStorage.setItem("qc-me", JSON.stringify(me));
  }, [token, me]);

  function logout() {
    setToken("");
    setMe(null);
    localStorage.removeItem("qc-token");
    localStorage.removeItem("qc-me");
  }

  return (
    <div className="container">
      <TopNav me={me} logout={logout} theme={theme} setTheme={setTheme} />
      <Routes>
        <Route path="/login" element={<LoginPage setToken={setToken} setMe={setMe} />} />
        <Route path="/register" element={<RegisterPage setToken={setToken} setMe={setMe} />} />
        <Route path="/" element={token ? <DashboardPage token={token} /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={token ? <ProfilePage token={token} me={me} setMe={setMe} /> : <Navigate to="/login" replace />} />
        <Route path="/services" element={token ? <ServicesPage token={token} me={me} /> : <Navigate to="/login" replace />} />
        <Route path="/chats" element={token ? <ChatsPage token={token} /> : <Navigate to="/login" replace />} />
        <Route path="/sell" element={token ? <SellProductsPage /> : <Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function TopNav({ me, logout, theme, setTheme }: { me: User | null; logout: () => void; theme: "light"|"dark"; setTheme: (t: "light"|"dark") => void }) {
  const loc = useLocation();
  const links = me
    ? ([
        ["/", "Dashboard"],
        ["/profile", "Profile"],
        ["/services", "Services"],
        ["/chats", "Chats"],
        ["/sell", "Sell"]
      ] as const)
    : ([] as const);

  return (
    <header className="card" style={{ marginBottom: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <strong>QuadCommerce</strong>
        <div className="row">
          <button className="btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? "🌙" : "☀️"}</button>
          {me ? <button className="btn" onClick={logout}>Logout</button> : null}
        </div>
      </div>
      <nav className="row" style={{ marginTop: 8 }}>
        {links.map(([to, label]) => (
          <Link key={to} to={to} className={`pill ${loc.pathname === to ? "active" : ""}`}>{label}</Link>
        ))}
        {!me ? <><Link to="/login" className="pill">Login</Link><Link to="/register" className="pill">Register</Link></> : null}
      </nav>
    </header>
  );
}

function LoginPage({ setToken, setMe }: { setToken: (t: string) => void; setMe: (u: User) => void }) {
  const [err, setErr] = useState("");
  const nav = useNavigate();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(fd.get("email")), password: String(fd.get("password")) })
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error || "Login failed");
    setToken(data.token); setMe(data.user); nav("/");
  }
  return <AuthCard title="Login" onSubmit={submit} err={err} includeName={false} />;
}

function RegisterPage({ setToken, setMe }: { setToken: (t: string) => void; setMe: (u: User) => void }) {
  const [err, setErr] = useState("");
  const nav = useNavigate();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(fd.get("name")),
        email: String(fd.get("email")),
        password: String(fd.get("password")),
        role: String(fd.get("role"))
      })
    });
    const data = await res.json();
    if (!res.ok) return setErr(data?.error?.fieldErrors?.email?.[0] || data.error || "Register failed");
    setToken(data.token); setMe(data.user); nav("/");
  }
  return <AuthCard title="Register (.edu required)" onSubmit={submit} err={err} includeName />;
}

function AuthCard({ title, onSubmit, err, includeName }: { title: string; onSubmit: (e: FormEvent<HTMLFormElement>) => void; err: string; includeName: boolean }) {
  const isRegister = includeName;
  return (
    <section className="card" style={{ maxWidth: 440, margin: "30px auto" }}>
      <h2>{title}</h2>
      <form className="form" onSubmit={onSubmit}>
        {includeName ? <input className="input" name="name" placeholder="Name" required /> : null}
        <input className="input" name="email" placeholder="you@school.edu" required />
        <input className="input" name="password" type="password" placeholder="Password" required />
        {includeName ? (
          <select className="select" name="role" defaultValue="student">
            <option value="student">Student</option>
            <option value="businessOwner">Business Owner</option>
          </select>
        ) : null}
        <button className="btn primary" type="submit">Continue</button>
      </form>
      {err ? <p className="muted" style={{ color: "#ef4444" }}>{err}</p> : null}
      <p className="meta" style={{ marginTop: 10 }}>
        {isRegister ? <>Already have an account? <Link to="/login">Login</Link></> : <>Need an account? <Link to="/register">Register</Link></>}
      </p>
    </section>
  );
}

function DashboardPage({ token }: { token: string }) {
  const [stats, setStats] = useState<{ listingsCount: number; soldCount: number; totalOffers: number; appointmentsCount: number; servicesCount: number } | null>(null);

  useEffect(() => {
    fetch(`${API}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setStats(d.stats));
  }, [token]);

  return (
    <section className="card">
      <h2>Dashboard</h2>
      {!stats ? <p className="muted">Loading dashboard…</p> : (
        <div className="row">
          <span className="pill">Listings: {stats.listingsCount}</span>
          <span className="pill">Sold: {stats.soldCount}</span>
          <span className="pill">Offers: {stats.totalOffers}</span>
          <span className="pill">Appointments: {stats.appointmentsCount}</span>
          <span className="pill">Services: {stats.servicesCount}</span>
        </div>
      )}
    </section>
  );
}

function ProfilePage({ token, me, setMe }: { token: string; me: User | null; setMe: (u: User) => void }) {
  const [name, setName] = useState(me?.name ?? "");
  const [role, setRole] = useState<Role>(me?.role ?? "student");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((u) => { setName(u.name); setRole(u.role); setMe(u); });
  }, [token]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, role })
    });
    const u = await res.json();
    setMe(u); setMsg("Saved");
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

function ServicesPage({ token, me }: { token: string; me: User | null }) {
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  async function load() {
    const [s, a] = await Promise.all([
      fetch(`${API}/services`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/appointments`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ]);
    setServices(s); setAppointments(a);
  }
  useEffect(() => { load(); }, [token]);

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

function ChatsPage({ token }: { token: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<string>("all");
  const [text, setText] = useState("");

  useEffect(() => {
    fetch(`${API}/chats`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setMessages);
    const onNew = (m: ChatMessage) => setMessages((prev) => [...prev, m]);
    socket.on("chat:new", onNew);
    return () => { socket.off("chat:new", onNew); };
  }, [token]);

  const conversations = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    for (const m of messages) {
      const key = m.senderEmail;
      const existing = map.get(key) || [];
      existing.push(m);
      map.set(key, existing);
    }
    return [{ id: "all", label: "All messages", preview: `${messages.length} total`, messages },
      ...[...map.entries()].map(([email, msgs]) => ({ id: email, label: msgs[msgs.length - 1]?.senderName || email, preview: msgs[msgs.length - 1]?.text || "", messages: msgs }))
    ];
  }, [messages]);

  const active = conversations.find((c) => c.id === activeConversation) || conversations[0];

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await fetch(`${API}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text })
    });
    setText("");
  }

  return (
    <section className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: 520 }}>
        <aside style={{ borderRight: "1px solid var(--border)", padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Conversations</h3>
          <input className="input" placeholder="Search (coming soon)" style={{ marginBottom: 10 }} readOnly />
          <div style={{ display: "grid", gap: 6 }}>
            {conversations.map((c) => (
              <button key={c.id} className="btn" style={{ textAlign: "left", background: c.id === active?.id ? "var(--chip)" : "var(--bg-elev)" }} onClick={() => setActiveConversation(c.id)}>
                <div><strong>{c.label}</strong></div>
                <div className="meta" style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.preview}</div>
              </button>
            ))}
          </div>
        </aside>

        <div style={{ display: "grid", gridTemplateRows: "56px 1fr auto" }}>
          <header style={{ borderBottom: "1px solid var(--border)", padding: "12px 14px", display: "flex", alignItems: "center" }}>
            <strong>{active?.label || "Conversation"}</strong>
          </header>

          <div style={{ overflow: "auto", padding: 14 }}>
            {(active?.messages || []).map((m) => (
              <p key={m.id} style={{ margin: "0 0 10px" }}>
                <strong>{m.senderName}</strong>: {m.text}
              </p>
            ))}
            {(active?.messages || []).length === 0 ? <p className="muted">No messages yet.</p> : null}
          </div>

          <form onSubmit={send} className="row" style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" />
            <button className="btn primary" type="submit">Send</button>
          </form>
        </div>
      </div>
    </section>
  );
}

function SellProductsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  useEffect(() => {
    fetch(`${API}/listings`).then(r => r.json()).then(setListings);
    socket.on("listings:updated", setListings);
    return () => { socket.off("listings:updated", setListings); };
  }, []);

  async function createListing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`${API}/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerName: String(fd.get("sellerName")),
        title: String(fd.get("title")),
        description: String(fd.get("description")),
        category: String(fd.get("category")),
        offerWindowHours: Number(fd.get("offerWindowHours"))
      })
    });
    e.currentTarget.reset();
  }

  async function offer(listingId: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`${API}/listings/${listingId}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidderName: String(fd.get("bidderName")), amount: Number(fd.get("amount")) })
    });
    e.currentTarget.reset();
  }

  async function accept(listingId: string, offerId: string) {
    await fetch(`${API}/listings/${listingId}/accept-offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId })
    });
  }

  return (
    <section className="grid">
      <div className="card">
        <h2>Sell product</h2>
        <form className="form" onSubmit={createListing}>
          <input className="input" name="sellerName" placeholder="Seller name" required />
          <input className="input" name="title" placeholder="Title" required />
          <textarea className="textarea" name="description" placeholder="Description" required />
          <select className="select" name="category" defaultValue="textbook">
            <option value="textbook">Textbook</option>
            <option value="dorm">Dorm</option>
            <option value="other">Other</option>
          </select>
          <input className="input" type="number" name="offerWindowHours" defaultValue={48} />
          <button className="btn primary" type="submit">Create listing</button>
        </form>
      </div>

      <div>
        {listings.map((l) => (
          <article key={l.id} className="card" style={{ marginBottom: 10 }}>
            <h3>{l.title} <span className="pill">{l.status}</span></h3>
            <p>{l.description}</p>
            {l.offers.map((o) => (
              <div className="offerRow" key={o.id}>
                <span>{o.bidderName} · ${o.amount.toFixed(2)}</span>
                {l.status === "OPEN" ? <button className="btn" onClick={() => accept(l.id, o.id)}>Accept</button> : null}
              </div>
            ))}
            {l.status === "OPEN" && (
              <form className="row" onSubmit={(e) => offer(l.id, e)}>
                <input className="input" name="bidderName" placeholder="Bidder" required />
                <input className="input" name="amount" type="number" step="0.01" required />
                <button className="btn" type="submit">Offer</button>
              </form>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
