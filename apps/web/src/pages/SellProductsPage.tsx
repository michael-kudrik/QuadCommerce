import { FormEvent, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { API } from "../lib/config";
import { formatError } from "../lib/errors";
import { Listing, Offer, User } from "../types";
import { 
  ShoppingBag, 
  Tag, 
  Clock, 
  TrendingDown, 
  Upload, 
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  User as UserIcon,
  ChevronRight
} from "lucide-react";

const socket = io("/", { transports: ["websocket"] });

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function readJsonSafe(res: Response): Promise<any> {
  try { return await res.json(); } catch { return null; }
}

function normalizeListing(raw: any): Listing | null {
  if (!raw || typeof raw !== "object" || !raw.id) return null;
  return {
    ...raw,
    offers: Array.isArray(raw.offers) ? raw.offers : []
  } as Listing;
}

export function SellProductsPage({ token, me }: { token: string; me: User | null }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000); // Update every 10s
    return () => clearInterval(timer);
  }, []);

  async function loadListings() {
    try {
      const res = await fetch(`${API}/listings`);
      const data = await readJsonSafe(res);
      const next = Array.isArray(data) ? data.map(normalizeListing).filter(Boolean) as Listing[] : [];
      setListings(next);
    } catch {
      setError("Could not load marketplace.");
    }
  }

  useEffect(() => {
    loadListings();
    socket.on("listings:updated", (payload: any) => {
      const next = Array.isArray(payload) ? payload.map(normalizeListing).filter(Boolean) as Listing[] : [];
      setListings(next);
    });
    return () => { socket.off("listings:updated"); };
  }, []);

  async function createListing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setSuccess("");

    const fd = new FormData(e.currentTarget);
    try {
      setIsSubmitting(true);
      let imageUrl = String(fd.get("imageUrl") || "").trim();
      const file = fd.get("imageFile") as File | null;

      if (file && file.size > 0) {
        if (file.size > 1_500_000) throw new Error("Image over 1.5MB");
        imageUrl = await readFileAsDataUrl(file);
      }

      const res = await fetch(`${API}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: String(fd.get("title")),
          description: String(fd.get("description")),
          imageUrl,
          category: String(fd.get("category")),
          startPrice: Number(fd.get("startPrice")),
          floorPrice: Number(fd.get("floorPrice")),
          offerWindowHours: Number(fd.get("offerWindowHours"))
        })
      });

      if (!res.ok) {
        const body = await readJsonSafe(res);
        throw new Error(formatError(body?.error || "Failed to create listing"));
      }

      setSuccess("Listing posted successfully!");
      formRef.current?.reset();
      await loadListings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function placeOffer(listingId: string, amount: number) {
    setError("");
    try {
      const res = await fetch(`${API}/listings/${listingId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount })
      });
      if (!res.ok) {
        const body = await readJsonSafe(res);
        throw new Error(body?.error || "Failed to place offer");
      }
      setSuccess("Offer submitted!");
    } catch (err: any) {
      setError(err.message);
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
      if (!res.ok) throw new Error("Failed to accept");
      setSuccess("Sold!");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deleteListing(listingId: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API}/listings/${listingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const body = await readJsonSafe(res);
        throw new Error(formatError(body?.error || "Failed to delete listing"));
      }
      setSuccess("Listing deleted.");
      await loadListings();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar: Sell Form */}
      <aside className="w-full lg:w-[420px] shrink-0">
        <div className="card-premium p-6 sticky top-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-[var(--chip)] text-[var(--accent)] rounded-xl">
              <ShoppingBag size={24} />
            </div>
            <h2 className="text-xl font-bold text-[var(--text)]">List an Item</h2>
          </div>

          <form ref={formRef} className="space-y-4" onSubmit={createListing}>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--muted)] ml-1">Title</label>
              <input className="input-premium" name="title" placeholder="What are you selling?" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--muted)] ml-1">Description</label>
              <textarea className="input-premium min-h-[100px]" name="description" placeholder="Details about condition, etc." required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--accent)] ml-1">Start Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                  <input className="input-premium pl-8" name="startPrice" type="number" step="0.01" defaultValue="100" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-emerald-500 ml-1">Floor Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                  <input className="input-premium pl-8" name="floorPrice" type="number" step="0.01" defaultValue="50" required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--muted)] ml-1">Category</label>
                <select className="input-premium appearance-none bg-no-repeat bg-[right_1rem_center]" name="category" defaultValue="textbook">
                  <option value="textbook">Textbook</option>
                  <option value="dorm">Dorm</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--muted)] ml-1">Hours</label>
                <input className="input-premium" name="offerWindowHours" type="number" defaultValue="48" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--muted)] ml-1">Image URL or Upload</label>
              <div className="flex flex-col gap-2">
                <input className="input-premium" name="imageUrl" placeholder="https://..." />
                <div className="relative">
                  <input type="file" name="imageFile" accept="image/*" className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--chip)] border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:bg-slate-100 transition-colors text-sm text-[var(--muted)]">
                    <Upload size={18} />
                    Choose Image
                  </label>
                </div>
              </div>
            </div>

            <button className="btn-primary w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-50" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Posting..." : "Create Listing"}
              <ChevronRight size={18} />
            </button>
          </form>

          {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex gap-2"><AlertCircle size={18} /> {error}</div>}
          {success && <div className="mt-4 p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm flex gap-2"><CheckCircle2 size={18} /> {success}</div>}
        </div>
      </aside>

      {/* Main Grid: Marketplace */}
      <main className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Live Auctions</h1>
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {listings.length} items online</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              onPlaceOffer={placeOffer}
              onAccept={accept}
              onDelete={deleteListing}
              canManage={Boolean(me?.id && l.sellerUserId === me.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function ListingCard({ listing: l, onPlaceOffer, onAccept, onDelete, canManage }: {
  listing: Listing;
  onPlaceOffer: (id: string, amt: number) => void;
  onAccept: (lId: string, oId: string) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}) {
  const [offerAmount, setOfferAmount] = useState<number | "">(listingPrice(l));
  
  function listingPrice(item: Listing) {
    const now = Date.now();
    const start = new Date(item.offerWindowEndsAt).getTime() - (item.offerWindowHours || 48) * 3600000;
    const end = new Date(item.offerWindowEndsAt).getTime();
    if (now >= end) return item.floorPrice;
    if (now <= start) return item.startPrice;
    const total = end - start;
    const elapsed = now - start;
    const priceDiff = item.startPrice - item.floorPrice;
    return Number((item.startPrice - (elapsed / total) * priceDiff).toFixed(2));
  }

  const currentPrice = listingPrice(l);
  const isCustomPrice = offerAmount !== "" && Number(offerAmount) !== currentPrice;

  return (
    <article className="card-premium overflow-hidden flex flex-col group">
      {/* Image Header */}
      <div className="relative h-56 w-full bg-[var(--chip)] shrink-0">
        {l.imageUrl ? (
          <img src={l.imageUrl} alt={l.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
            <ImageIcon size={48} />
          </div>
        )}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-[var(--bg-elev)] text-[var(--text)] backdrop-blur rounded-full text-xs font-bold shadow-sm border border-[var(--border)] uppercase tracking-wider">
            {l.category}
          </span>
        </div>
        {l.status === "SOLD" && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-6 py-2 bg-[var(--bg-elev)] text-[var(--text)] font-black rounded-lg shadow-xl rotate-[-5deg]">SOLD</span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-[var(--text)] leading-tight">{l.title}</h3>
          <div className="flex flex-col items-end shrink-0">
             <div className="text-2xl font-black text-[var(--accent)]">${currentPrice.toFixed(2)}</div>
             <div className="text-[10px] text-[var(--accent)] opacity-80 font-bold uppercase tracking-tighter flex items-center gap-0.5">
               <TrendingDown size={10} /> Price Falling
             </div>
          </div>
        </div>

        <p className="text-[var(--muted)] text-sm line-clamp-2 mb-4 flex-1">{l.description}</p>

        <div className="flex items-center justify-between py-3 border-y border-[var(--border)] mb-4 gap-4">
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <div className="p-1.5 bg-[var(--chip)] rounded-lg"><UserIcon size={14} /></div>
            <div className="text-xs font-semibold">{l.sellerName}</div>
          </div>
          <div className="flex items-center gap-2 text-amber-600">
            <Clock size={14} />
            <div className="text-xs font-bold">
              {(() => {
                const diff = new Date(l.offerWindowEndsAt).getTime() - Date.now();
                if (diff <= 0) return "Auction Ended";
                const hours = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
              })()}
            </div>
          </div>
        </div>

        {/* Action Section */}
        {l.status === "OPEN" ? (
          <div className="space-y-3 bg-[var(--chip)] p-4 rounded-xl border border-[var(--border)]">
            <div className="flex gap-2">
              <div className="relative shrink-0 w-full">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={14} />
                <input 
                  className="input-premium py-2 pl-6 text-sm" 
                  type="number" 
                  step="0.01"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>
            <button 
              disabled={offerAmount === ""}
              onClick={() => onPlaceOffer(l.id, Number(offerAmount))}
              className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-[0.98] ${
                isCustomPrice 
                  ? "bg-[var(--text)] text-[var(--bg-elev)]" 
                  : "btn-primary text-white"
              }`}
            >
              {isCustomPrice ? `Place Offer for $${Number(offerAmount).toFixed(2)}` : `Buy Now for $${currentPrice.toFixed(2)}`}
            </button>
          </div>
        ) : (
           <div className="space-y-2">
             <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest text-center mb-1">Offer History</div>
             {l.offers.length > 0 ? (
               l.offers.slice(0, 3).map((o) => (
                 <div key={o.id} className="flex items-center justify-between text-sm py-1.5 px-3 bg-[var(--chip)] rounded-lg">
                   <span className="text-[var(--text)] opacity-80 font-medium">{o.bidderName}</span>
                   <span className="text-[var(--text)] font-black">${o.amount.toFixed(2)}</span>
                 </div>
               ))
             ) : (
               <div className="text-xs text-[var(--muted)] text-center py-2 italic">No offers placed</div>
             )}
           </div>
        )}

        {/* Seller Controls for OPEN listings */}
        {canManage && l.status === "OPEN" && l.offers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dashed border-[var(--border)]">
             <div className="text-[10px] font-bold text-[var(--muted)] uppercase mb-2">Pending Offers</div>
             <div className="space-y-2">
               {l.offers.map(o => (
                 <div key={o.id} className="flex items-center justify-between bg-[var(--bg-elev)] border border-[var(--border)] p-2 rounded-lg">
                    <div className="text-xs">
                      <div className="font-bold text-[var(--text)]">{o.bidderName}</div>
                      <div className="text-emerald-500 font-black">${o.amount.toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => onAccept(l.id, o.id)}
                      className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-md hover:bg-emerald-600"
                    >
                      ACCEPT
                    </button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {canManage && (
          <div className="mt-3">
            <button
              onClick={() => onDelete(l.id)}
              className="w-full py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50"
            >
              Delete Listing
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
