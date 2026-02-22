import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../lib/config";
import { 
  TrendingUp, 
  ShoppingBag, 
  Calendar, 
  MessageSquare, 
  ShieldCheck, 
  Activity,
  PlusCircle,
  BadgeDollarSign
} from "lucide-react";

export function DashboardPage({ token }: { token: string }) {
  const [stats, setStats] = useState<{ 
    listingsCount: number; 
    soldCount: number; 
    totalOffers: number; 
    appointmentsCount: number; 
    servicesCount: number 
  } | null>(null);

  useEffect(() => {
    fetch(`${API}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setStats(d.stats));
  }, [token]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text)]">Your Dashboard</h1>
          <p className="text-[var(--muted)] font-medium">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/sell" className="btn-primary flex items-center gap-2">
            <PlusCircle size={20} />
            Post Item
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Listings" 
          value={stats?.listingsCount} 
          icon={ShoppingBag} 
          color="bg-[var(--chip)] text-[var(--accent)]" 
        />
        <StatCard 
          label="Items Sold" 
          value={stats?.soldCount} 
          icon={TrendingUp} 
          color="bg-emerald-500/10 text-emerald-500" 
        />
        <StatCard 
          label="Total Offers" 
          value={stats?.totalOffers} 
          icon={BadgeDollarSign} 
          color="bg-amber-500/10 text-amber-500" 
        />
        <StatCard 
          label="Appointments" 
          value={stats?.appointmentsCount} 
          icon={Calendar} 
          color="bg-indigo-500/10 text-indigo-500" 
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-premium p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text)]">
              <Activity size={20} className="text-[var(--accent)]" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuickActionLink 
                to="/sell" 
                title="Marketplace" 
                desc="Browse or sell textbooks and dorm items" 
                icon={ShoppingBag}
              />
              <QuickActionLink 
                to="/services" 
                title="Services" 
                desc="Manage your tutoring or business bookings" 
                icon={Calendar}
              />
              <QuickActionLink 
                to="/chats" 
                title="Messages" 
                desc="Chat with buyers and sellers" 
                icon={MessageSquare}
              />
              <QuickActionLink 
                to="/profile" 
                title="Profile" 
                desc="Update your settings and verification" 
                icon={ShieldCheck}
              />
            </div>
          </div>
        </div>

        {/* System Status Sidebar */}
        <aside className="space-y-6">
          <div className="card-premium p-6">
            <h3 className="text-lg font-bold mb-4 text-[var(--text)]">System Status</h3>
            <ul className="space-y-4">
              <StatusItem label="Database" status="Connected" color="text-emerald-500" />
              <StatusItem label="Real-time Node" status="Active" color="text-emerald-500" />
              <StatusItem label="Verification" status="Verified (.edu)" color="text-[var(--accent)]" />
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="card-premium p-6 hover:translate-y-[-2px]">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${color}`}>
          <Icon size={24} />
        </div>
        <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Growth</div>
      </div>
      <div className="text-3xl font-black text-[var(--text)] mb-1">
        {value !== undefined ? value : "..."}
      </div>
      <div className="text-sm font-semibold text-[var(--muted)]">{label}</div>
    </div>
  );
}

function QuickActionLink({ to, title, desc, icon: Icon }: any) {
  return (
    <Link to={to} className="group p-4 bg-[var(--bg)] hover:bg-[var(--bg-elev)] border border-transparent hover:border-[var(--accent)] hover:shadow-lg rounded-2xl transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-[var(--bg-elev)] rounded-xl text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:bg-[var(--chip)] transition-colors shadow-sm">
          <Icon size={24} />
        </div>
        <div>
          <h4 className="font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{title}</h4>
          <p className="text-xs text-[var(--muted)] leading-normal">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

function StatusItem({ label, status, color }: any) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-[var(--muted)] font-medium">{label}</span>
      <span className={`font-bold ${color} flex items-center gap-1.5`}>
        <div className={`w-1.5 h-1.5 rounded-full ${color.replace('text', 'bg')} animate-pulse`} />
        {status}
      </span>
    </li>
  );
}
