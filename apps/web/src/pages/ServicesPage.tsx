import { FormEvent, useEffect, useState, useMemo } from "react";
import { API } from "../lib/config";
import { formatError } from "../lib/errors";
import { Appointment, Service, User } from "../types";
import { 
  Calendar, 
  Briefcase, 
  Clock, 
  Plus, 
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MapPin,
  CalendarCheck,
  ChevronLeft
} from "lucide-react";

export function ServicesPage({ token, me }: { token: string; me: User | null }) {
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Booking state
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  async function load() {
    try {
      const [s, a] = await Promise.all([
        fetch(`${API}/services`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch(`${API}/appointments`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
      ]);
      setServices(Array.isArray(s) ? s : []);
      setAppointments(Array.isArray(a) ? a : []);
    } catch {
      setError("Failed to load services data.");
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  const nextSevenDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

  async function createService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch(`${API}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: String(fd.get("name")),
          description: String(fd.get("description")),
          durationMinutes: Number(fd.get("durationMinutes")),
          priceUsd: Number(fd.get("priceUsd"))
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(formatError(body?.error || "Failed to create service"));
      }
      setSuccess("Service created successfully!");
      form.reset();
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteService(serviceId: string) {
    if (me?.role !== "businessOwner") return;
    if (!confirm("Delete this service? This cannot be undone.")) return;

    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API}/services/${serviceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(formatError(body?.error || "Failed to delete service"));
      }
      if (bookingServiceId === serviceId) {
        setBookingServiceId(null);
        setSelectedTime(null);
      }
      setSuccess("Service deleted.");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function book() {
    if (!bookingServiceId || !selectedTime) return;
    
    const startAt = new Date(selectedDate);
    const [h, m] = selectedTime.split(':');
    startAt.setHours(parseInt(h), parseInt(m), 0, 0);

    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serviceId: bookingServiceId, startAt: startAt.toISOString() })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(formatError(body?.error || "Failed to book appointment"));
      }
      setSuccess("Appointment booked successfully!");
      setBookingServiceId(null);
      setSelectedTime(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-12">
      {/* Sidebar */}
      <aside className="w-full lg:w-[400px] shrink-0 space-y-6">
        <div className="card-premium p-6 sticky top-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-[var(--chip)] text-[var(--accent)] rounded-xl">
              <Briefcase size={24} />
            </div>
            <h2 className="text-xl font-bold text-[var(--text)]">
              {me?.role === "businessOwner" ? "Offer a Service" : "Service Directory"}
            </h2>
          </div>

          {me?.role === "businessOwner" ? (
            <form className="space-y-4" onSubmit={createService}>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--muted)] ml-1">Service Name</label>
                <input className="input-premium" name="name" placeholder="E.g. Math Tutoring" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--muted)] ml-1">Description</label>
                <textarea className="input-premium min-h-[100px]" name="description" placeholder="What's included?" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--muted)] ml-1">Duration (min)</label>
                  <input className="input-premium" name="durationMinutes" type="number" min={15} max={480} required defaultValue="60" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--muted)] ml-1">Price ($)</label>
                  <input className="input-premium" name="priceUsd" type="number" min={0} step="0.01" required defaultValue="25" />
                </div>
              </div>
              <button className="btn-primary w-full mt-2 flex items-center justify-center gap-2" type="submit" disabled={isSubmitting}>
                <Plus size={18} />
                {isSubmitting ? "Creating..." : "Create Service"}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-[var(--muted)] text-sm leading-relaxed italic">
              Find tutoring, tech support, laundry services, and more from fellow campus entrepreneurs.
            </div>
          )}

          {(error || success) && (
            <div className={`mt-6 p-4 rounded-xl text-sm flex items-start gap-3 border transition-all ${
              error ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
            }`}>
              {error ? <AlertCircle size={20} className="shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />}
              <span>{error || success}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-black text-[var(--text)]">Available Services</h1>
            <span className="text-sm font-bold text-[var(--muted)] uppercase tracking-widest">{services.length} items</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((s) => (
              <div key={s.id} className={`card-premium p-6 group transition-all duration-300 ${bookingServiceId === s.id ? 'ring-2 ring-[var(--accent)] border-transparent' : ''}`}>
                <div className="flex justify-between items-start mb-4 gap-2">
                  <h3 className="text-lg font-bold group-hover:text-[var(--accent)] transition-colors text-[var(--text)]">{s.name}</h3>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-xl font-black text-emerald-500">${s.priceUsd.toFixed(2)}</div>
                    {me?.role === "businessOwner" && (
                      <button
                        onClick={() => deleteService(s.id)}
                        className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 text-[10px] font-bold hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-[var(--muted)] text-sm mb-6 line-clamp-3">{s.description}</p>
                
                <div className="flex items-center gap-4 text-xs font-bold text-[var(--muted)] mb-6 opacity-80">
                  <div className="flex items-center gap-1.5"><Clock size={14} /> {s.durationMinutes}m</div>
                  <div className="flex items-center gap-1.5"><MapPin size={14} /> Campus Wide</div>
                </div>

                {me?.role === "student" && (
                  <div className="pt-4 border-t border-[var(--border)]">
                    {bookingServiceId === s.id ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Date Picker */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Select Date</label>
                          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                            {nextSevenDays.map((date) => {
                              const isSelected = selectedDate.toDateString() === date.toDateString();
                              return (
                                <button
                                  key={date.toISOString()}
                                  onClick={() => setSelectedDate(date)}
                                  className={`flex flex-col items-center min-w-[60px] p-2 rounded-xl border transition-all ${
                                    isSelected 
                                      ? 'bg-[var(--accent)] text-white border-transparent shadow-lg scale-105' 
                                      : 'bg-[var(--bg)] text-[var(--text)] border-[var(--border)] hover:border-[var(--muted)]'
                                  }`}
                                >
                                  <span className="text-[9px] uppercase font-black opacity-80">
                                    {date.toLocaleDateString([], { weekday: 'short' })}
                                  </span>
                                  <span className="text-lg font-black leading-tight">
                                    {date.getDate()}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Time Slots */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Select Time</label>
                          <div className="grid grid-cols-4 gap-2">
                            {timeSlots.map((time) => (
                              <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                  selectedTime === time 
                                    ? 'bg-[var(--accent)] text-white border-transparent' 
                                    : 'bg-[var(--bg)] text-[var(--text)] border-[var(--border)] hover:border-[var(--muted)]'
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => {
                              setBookingServiceId(null);
                              setSelectedTime(null);
                            }}
                            className="flex-1 py-2.5 bg-[var(--chip)] text-[var(--text)] text-xs font-bold rounded-xl hover:bg-[var(--border)] transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            disabled={!selectedTime}
                            onClick={book}
                            className="flex-[2] py-2.5 bg-[var(--accent)] text-white text-xs font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/20"
                          >
                            Confirm Booking <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setBookingServiceId(s.id)}
                        className="w-full py-2.5 bg-[var(--chip)] text-[var(--accent)] text-xs font-black rounded-xl hover:bg-[var(--accent)] hover:text-white transition-all flex items-center justify-center gap-2 border border-[var(--accent)]/10"
                      >
                        Check Availability <CalendarCheck size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="pt-8 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 mb-6 text-[var(--text)]">
            <CalendarCheck size={24} className="text-[var(--accent)]" />
            <h2 className="text-2xl font-black">Upcoming Appointments</h2>
          </div>

          {appointments.length === 0 ? (
            <div className="card-premium p-12 text-center text-[var(--muted)] italic bg-[var(--chip)] opacity-60">
              No appointments scheduled yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {appointments.map((a) => (
                <div key={a.id} className="card-premium p-5 border-l-4 border-l-[var(--accent)] shadow-lg hover:translate-y-[-2px]">
                  <div className="font-black text-[var(--text)] mb-1">
                    {new Date(a.startAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(a.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-tighter mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" /> {a.status}
                  </div>
                  
                  {me?.role === "businessOwner" && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)] text-xs">
                      <div className="p-1.5 bg-[var(--chip)] text-[var(--accent)] rounded-lg"><UserIcon size={12} /></div>
                      <div className="min-w-0">
                        <div className="font-bold text-[var(--text)] truncate">{a.customerName}</div>
                        <div className="text-[var(--muted)] tracking-tighter truncate">{a.customerEmail}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
