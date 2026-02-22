import { Link, useLocation } from "react-router-dom";

export function TopNav({
  isAuthed,
  logout,
  theme,
  setTheme
}: {
  isAuthed: boolean;
  logout: () => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
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
        <div className="row">
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
