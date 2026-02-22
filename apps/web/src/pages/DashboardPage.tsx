import { useEffect, useState } from "react";
import { API } from "../lib/config";

export function DashboardPage({ token }: { token: string }) {
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
