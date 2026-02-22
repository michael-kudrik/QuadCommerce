import { Link, useLocation } from "react-router-dom";

function Avatar({ name, imageUrl, size = 30 }: { name?: string; imageUrl?: string; size?: number }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name ? `${name} profile` : "Profile"} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />;
  }

  return (
    <span
      aria-label="Default profile icon"
      title={name || "Profile"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--border)",
        background: "var(--chip)",
        fontSize: size * 0.55,
        lineHeight: 1
      }}
    >
      👤
    </span>
  );
}

export function TopNav({
  isAuthed,
  logout,
  theme,
  setTheme,
  currentUserName,
  currentUserImageUrl
}: {
  isAuthed: boolean;
  logout: () => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  currentUserName?: string;
  currentUserImageUrl?: string;
}) {
  const loc = useLocation();
  const links = isAuthed
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
        <div className="row" style={{ alignItems: "center" }}>
          {isAuthed && currentUserName ? (
            <>
              <Avatar name={currentUserName} imageUrl={currentUserImageUrl} />
              <span className="meta">Logged in as {currentUserName}</span>
            </>
          ) : null}
          <button className="btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? "🌙" : "☀️"}</button>
          {isAuthed ? <button className="btn" onClick={logout}>Logout</button> : null}
        </div>
      </div>
      <nav className="row" style={{ marginTop: 8 }}>
        {links.map(([to, label]) => (
          <Link key={to} to={to} className={`pill ${loc.pathname === to ? "active" : ""}`}>{label}</Link>
        ))}
        {!isAuthed ? <><Link to="/login" className="pill">Login</Link><Link to="/register" className="pill">Register</Link></> : null}
      </nav>
    </header>
  );
}
