import { FormEvent, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API } from "../lib/config";
import { Listing } from "../types";

const socket = io("/", { transports: ["websocket"] });

export function SellProductsPage() {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    fetch(`${API}/listings`).then((r) => r.json()).then(setListings);
    socket.on("listings:updated", setListings);
    return () => {
      socket.off("listings:updated", setListings);
    };
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
