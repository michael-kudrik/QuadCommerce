import { Navigate, Route, Routes } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { TopNav } from "./components/TopNav";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ServicesPage } from "./pages/ServicesPage";
import { ChatsPage } from "./pages/ChatsPage";
import { SellProductsPage } from "./pages/SellProductsPage";
import { User } from "./types";
import "./App.css";

function readStoredUser(): User | null {
  const raw = localStorage.getItem("qc-me");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem("qc-me");
    return null;
  }
}

function RequireAuth({ token, children }: { token: string; children: ReactNode }) {
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function RedirectIfAuthed({ token, children }: { token: string; children: ReactNode }) {
  return token ? <Navigate to="/" replace /> : <>{children}</>;
}

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem("qc-theme") === "dark" ? "dark" : "light"));
  const [token, setToken] = useState<string>(() => localStorage.getItem("qc-token") || "");
  const [me, setMe] = useState<User | null>(() => readStoredUser());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("qc-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (token) localStorage.setItem("qc-token", token);
    else localStorage.removeItem("qc-token");

    if (me) localStorage.setItem("qc-me", JSON.stringify(me));
    else localStorage.removeItem("qc-me");
  }, [token, me]);

  function logout() {
    setToken("");
    setMe(null);
  }

  return (
    <div className="container">
      <TopNav isAuthed={Boolean(token)} logout={logout} theme={theme} setTheme={setTheme} />
      <Routes>
        <Route path="/login" element={<RedirectIfAuthed token={token}><LoginPage setToken={setToken} setMe={setMe} /></RedirectIfAuthed>} />
        <Route path="/register" element={<RedirectIfAuthed token={token}><RegisterPage setToken={setToken} setMe={setMe} /></RedirectIfAuthed>} />
        <Route path="/" element={<RequireAuth token={token}><DashboardPage token={token} /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth token={token}><ProfilePage token={token} me={me} setMe={setMe} /></RequireAuth>} />
        <Route path="/services" element={<RequireAuth token={token}><ServicesPage token={token} me={me} /></RequireAuth>} />
        <Route path="/chats" element={<RequireAuth token={token}><ChatsPage token={token} /></RequireAuth>} />
        <Route path="/sell" element={<RequireAuth token={token}><SellProductsPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
      </Routes>
    </div>
  );
}
