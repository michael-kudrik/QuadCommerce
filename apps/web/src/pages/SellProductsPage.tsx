import { FormEvent, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API } from "../lib/config";
import { Listing, Offer } from "../types";

const socket = io("/", { transports: ["websocket"] });

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read selected image file."));
    reader.readAsDataURL(file);
  });
}

async function readJsonSafe(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeOffer(raw: any): Offer | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string") return null;
  if (typeof raw.bidderName !== "string") return null;
  if (typeof raw.amount !== "number" || Number.isNaN(raw.amount)) return null;
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString();
  return { id: raw.id, bidderName: raw.bidderName, amount: raw.amount, createdAt };
}

function normalizeListing(raw: any): Listing | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string") return null;
  if (typeof raw.title !== "string") return null;
  if (typeof raw.description !== "string") return null;
  if (typeof raw.sellerName !== "string") return null;

  const status = raw.status;
  if (status !== "OPEN" && status !== "SOLD" && status !== "CLOSED") return null;

  const category = raw.category;
  if (category !== "textbook" && category !== "dorm" && category !== "other") return null;

  const offers = Array.isArray(raw.offers)
    ? raw.offers
        .map((offer: unknown) => normalizeOffer(offer))
        .filter((offer: Offer | null): offer is Offer => Boolean(offer))
    : [];

  return {
    id: raw.id,
    sellerUserId: typeof raw.sellerUserId === "string" ? raw.sellerUserId : undefined,
    sellerName: raw.sellerName,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
    title: raw.title,
    description: raw.description,
    category,
    status,
    offerWindowEndsAt: typeof raw.offerWindowEndsAt === "string" ? raw.offerWindowEndsAt : new Date().toISOString(),
    acceptedOfferId: typeof raw.acceptedOfferId === "string" ? raw.acceptedOfferId : undefined,
    offers
  };
}

export function SellProductsPage({ token }: { token: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadListings() {
    try {
      const res = await fetch(`${API}/listings`);
      const data = await readJsonSafe(res);
      const next = Array.isArray(data)
        ? data.map(normalizeListing).filter((l): l is Listing => Boolean(l))
        : [];
      setListings(next);
    } catch {
      setError("Could not load listings.");
    }
  }

  useEffect(() => {
    loadListings();
    const handleListingsUpdated = (payload: unknown) => {
      const next = Array.isArray(payload)
        ? payload.map(normalizeListing).filter((l): l is Listing => Boolean(l))
        : [];
      setListings(next);
    };

    socket.on("listings:updated", handleListingsUpdated);
    return () => {
      socket.off("listings:updated", handleListingsUpdated);
    };
  }, []);

  async function createListing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      setIsSubmitting(true);
      let imageUrl = String(fd.get("imageUrl") || "").trim();
      const file = fd.get("imageFile") as File | null;

      if (file && file.size > 0) {
        if (!file.type.startsWith("image/")) {
          setError("Please select an image file.");
          return;
        }
        if (file.size > 1_500_000) {
          setError("Image too large. Please use an image under 1.5MB.");
          return;
        }
        imageUrl = await readFileAsDataUrl(file);
      }

      const res = await fetch(`${API}/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: String(fd.get("title")),
          description: String(fd.get("description")),
          imageUrl,
          category: String(fd.get("category")),
          offerWindowHours: Number(fd.get("offerWindowHours"))
        })
      });

      const body = await readJsonSafe(res);
      if (!res.ok) {
        setError(body?.error?.fieldErrors?.imageUrl?.[0] || body?.error || "Failed to create listing");
        return;
      }

      const created = normalizeListing(body);
      if (!created) {
        setError("Listing created, but received an unexpected API response.");
        await loadListings();
        form.reset();
        return;
      }

      // Immediate UI update even if socket event is delayed.
      setListings((prev) => [created, ...prev]);
      form.reset();
      // Sync with backend canonical ordering/state.
      await loadListings();
    } catch {
      setError("Failed to create listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function offer(listingId: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch(`${API}/listings/${listingId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidderName: String(fd.get("bidderName")), amount: Number(fd.get("amount")) })
      });
      const body = await readJsonSafe(res);
      if (!res.ok) {
        setError(body?.error || "Failed to place offer");
        return;
      }
      e.currentTarget.reset();
    } catch {
      setError("Failed to place offer. Please try again.");
    }
  }

  async function accept(listingId: string, offerId: string) {
    setError("");
    try {
      const res = await fetch(`${API}/listings/${listingId}/accept-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId })
      });
      const body = await readJsonSafe(res);
      if (!res.ok) {
        setError(body?.error || "Failed to accept offer");
      }
    } catch {
      setError("Failed to accept offer. Please try again.");
    }
  }

  return (
    <section className="grid">
      <div className="card">
        <h2>Sell product</h2>
        <form className="form" onSubmit={createListing}>
          <input className="input" name="title" placeholder="Title" required />
          <textarea className="textarea" name="description" placeholder="Description" required />
          <input className="input" name="imageUrl" placeholder="Image URL (optional)" />
          <input className="input" name="imageFile" type="file" accept="image/*" />
          <span className="fileHint">Tip: choose either Image URL or upload a file (max 1.5MB).</span>
          <select className="select" name="category" defaultValue="textbook">
            <option value="textbook">Textbook</option>
            <option value="dorm">Dorm</option>
            <option value="other">Other</option>
          </select>
          <input className="input" type="number" name="offerWindowHours" defaultValue={48} />
          <button className="btn primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create listing"}</button>
        </form>
        {error ? <p className="meta" style={{ color: "#ef4444" }}>{error}</p> : null}
      </div>

      <div className="listingsGrid">
        {listings.map((l) => (
          <article key={l.id} className="card" style={{ marginBottom: 0 }}>
            {l.imageUrl ? <img src={l.imageUrl} alt={l.title} className="listingImage" /> : null}
            <h3>{l.title} <span className="pill">{l.status}</span></h3>
            <p className="meta">Seller: {l.sellerName}</p>
            <p>{l.description}</p>
            {(Array.isArray(l.offers) ? l.offers : []).map((o) => (
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
