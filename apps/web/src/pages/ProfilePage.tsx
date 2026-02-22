import { FormEvent, useEffect, useState } from "react";
import { API } from "../lib/config";
import { Role, User } from "../types";
import { 
  User as UserIcon, 
  ShieldCheck, 
  Mail, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  GraduationCap,
  Store
} from "lucide-react";

export function ProfilePage({ token, me, setMe }: { token: string; me: User | null; setMe: (u: User) => void }) {
  const [name, setName] = useState(me?.name ?? "");
  const [role, setRole] = useState<Role>(me?.role ?? "student");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((u) => {
        setName(u.name || "");
        setRole(u.role || "student");
        setMe(u);
      });
  }, [token, setMe]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`${API}/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, role })
      });
      const u = await res.json();
      setMe(u);
      setMsg("Profile updated successfully!");
    } catch {
      setMsg("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 text-center">
        <div className="inline-flex p-4 bg-[var(--chip)] text-[var(--accent)] rounded-3xl mb-4">
          <UserIcon size={48} />
        </div>
        <h1 className="text-3xl font-black text-[var(--text)]">Your Profile</h1>
        <p className="text-[var(--muted)] font-medium">Manage your account settings and campus identity</p>
      </header>

      <div className="card-premium p-8">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--chip)] text-[var(--muted)] rounded-2xl">
              <Mail size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Email Address</div>
              <div className="text-lg font-bold text-[var(--text)]">{me?.email}</div>
            </div>
          </div>
          {me?.schoolVerified && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
              <ShieldCheck size={18} />
              <span className="text-sm font-bold uppercase tracking-tighter">Verified .edu</span>
            </div>
          )}
        </div>

        <form className="space-y-6" onSubmit={save}>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--muted)] ml-1 uppercase tracking-wider">Display Name</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
              <input 
                className="input-premium pl-12" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Full Name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--muted)] ml-1 uppercase tracking-wider">Campus Role</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  role === "student" 
                    ? "border-[var(--accent)] bg-[var(--chip)] text-[var(--accent)]" 
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]"
                }`}
              >
                <GraduationCap size={32} />
                <span className="font-bold">Student</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("businessOwner")}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  role === "businessOwner" 
                    ? "border-[var(--accent)] bg-[var(--chip)] text-[var(--accent)]" 
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]"
                }`}
              >
                <Store size={32} />
                <span className="font-bold">Business Owner</span>
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button 
              className="btn-primary w-full flex items-center justify-center gap-2" 
              type="submit"
              disabled={loading}
            >
              <Save size={20} />
              {loading ? "Saving Changes..." : "Save Profile Settings"}
            </button>
          </div>
        </form>

        {msg && (
          <div className={`mt-6 p-4 rounded-xl text-sm flex items-center gap-3 border animate-in slide-in-from-top-2 duration-300 ${
            msg.includes("Failed") 
              ? "bg-red-500/10 border-red-500/20 text-red-500" 
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
          }`}>
            {msg.includes("Failed") ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-medium">{msg}</span>
          </div>
        )}
      </div>
      
      <div className="mt-8 card-premium p-6 bg-amber-500/5 border-amber-500/20">
        <h4 className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
          <ShieldCheck size={16} /> Privacy Note
        </h4>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Your campus role determines how you interact with QuadCommerce. Students can book services and browse the marketplace, while Business Owners can offer services and manage client bookings.
        </p>
      </div>
    </div>
  );
}
