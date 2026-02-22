import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { API } from "../lib/config";
import { User } from "../types";

async function parseResponse(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function LoginPage({ setToken, setMe }: { setToken: (t: string) => void; setMe: (u: User) => void }) {
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });

      const data = await parseResponse(res);
      if (!res.ok) {
        setErr(data?.error || "Login failed");
        return;
      }

      if (!data?.token || !data?.user) {
        setErr("Invalid login response. Please try again.");
        return;
      }

      setToken(data.token);
      setMe(data.user);
      nav("/", { replace: true });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        setErr("Login timed out. Please try again.");
      } else {
        setErr("Network error while logging in. Please retry.");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  return <AuthCard title="Login" onSubmit={submit} err={err} includeName={false} loading={loading} />;
}
