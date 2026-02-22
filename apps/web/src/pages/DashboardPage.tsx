import { useEffect, useState } from "react";
import { API } from "../lib/config";

type DashboardStats = {
  listingsCount: number;
  soldCount: number;
  totalOffers: number;
  appointmentsCount: number;
  servicesCount: number;
  servicesSoldCount?: number;
  salesByType?: {
    productsSold: number;
    servicesSold: number;
  };
};

export function DashboardPage({ token }: { token: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch(`${API}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setStats(d.stats));
  }, [token]);

  const productsSold = stats?.salesByType?.productsSold ?? stats?.soldCount ?? 0;
  const servicesSold = stats?.salesByType?.servicesSold ?? stats?.servicesSoldCount ?? 0;
  const maxSold = Math.max(productsSold, servicesSold, 1);

  return (
    <section className="card">
      <h2>Dashboard</h2>
      {!stats ? <p className="muted">Loading dashboard…</p> : (
        <>
          <div className="row">
            <span className="pill">My Listings: {stats.listingsCount}</span>
            <span className="pill">Products Sold: {stats.soldCount}</span>
            <span className="pill">Offers on My Listings: {stats.totalOffers}</span>
            <span className="pill">Appointments: {stats.appointmentsCount}</span>
            <span className="pill">My Services: {stats.servicesCount}</span>
            <span className="pill">Services Sold: {servicesSold}</span>
          </div>

          <div className="salesChart" aria-label="Sales chart">
            <h3>Sales mix</h3>
            <div className="chartRow">
              <span className="chartLabel">Products sold</span>
              <div className="chartTrack">
                <div className="chartBar" style={{ width: `${(productsSold / maxSold) * 100}%` }} />
              </div>
              <strong>{productsSold}</strong>
            </div>
            <div className="chartRow">
              <span className="chartLabel">Services sold</span>
              <div className="chartTrack">
                <div className="chartBar chartBarSecondary" style={{ width: `${(servicesSold / maxSold) * 100}%` }} />
              </div>
              <strong>{servicesSold}</strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
