import { Link, useLocation } from "react-router-dom";
import { LogOut, Moon, Sun, ShoppingBag, MessageSquare, LayoutDashboard, User as UserIcon, Calendar } from "lucide-react";

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
    ? [
        { to: "/", label: "Dashboard", icon: LayoutDashboard },
        { to: "/sell", label: "Marketplace", icon: ShoppingBag },
        { to: "/services", label: "Services", icon: Calendar },
        { to: "/chats", label: "Messages", icon: MessageSquare },
        { to: "/profile", label: "Profile", icon: UserIcon },
      ]
    : [];

  return (
    <header className="sticky top-4 z-50 mb-8">
      <div className="card-premium px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-[var(--accent)] shrink-0">
            QuadCommerce
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  loc.pathname === to 
                    ? "bg-[var(--chip)] text-[var(--accent)]" 
                    : "text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--text)]"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2 text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--chip)] rounded-xl transition-all"
            title="Toggle theme"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          
          {isAuthed ? (
            <button 
              onClick={logout}
              className="p-2 text-[var(--muted)] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]">Login</Link>
              <Link to="/register" className="btn-primary py-1.5 px-4 text-sm">Join</Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Nav */}
      <nav className="md:hidden flex items-center justify-center gap-1 mt-3 card-premium py-2 px-2 overflow-x-auto scrollbar-hide">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-medium transition-colors shrink-0 ${
              loc.pathname === to 
                ? "bg-[var(--chip)] text-[var(--accent)]" 
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
