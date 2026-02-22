import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import mongoose, { Schema } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

type ListingStatus = "OPEN" | "SOLD" | "CLOSED";
type UserRole = "student" | "businessOwner";

interface UserDoc extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  description?: string;
  portfolioWebsite?: string;
}

interface ServiceDoc extends mongoose.Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  durationMinutes: number;
  priceUsd: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AppointmentDoc extends mongoose.Document {
  serviceId: mongoose.Types.ObjectId;
  businessOwnerId: mongoose.Types.ObjectId;
  customerUserId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  startAt: Date;
  status: "pending" | "approved" | "denied" | "completed" | "cancelled" | "scheduled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessageDoc extends mongoose.Document {
  senderUserId: mongoose.Types.ObjectId;
  recipientUserId: mongoose.Types.ObjectId;
  senderName: string;
  senderEmail: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ListingDoc extends mongoose.Document {
  sellerUserId?: mongoose.Types.ObjectId;
  sellerName: string;
  imageUrl?: string;
  title: string;
  description: string;
  category: "textbook" | "dorm" | "other";
  status: ListingStatus;
  startPrice: number;
  floorPrice: number;
  startsAt: Date;
  offerWindowEndsAt: Date;
  acceptedOfferId?: mongoose.Types.ObjectId;
  offers: Array<{ _id: mongoose.Types.ObjectId; bidderName: string; amount: number; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["student", "businessOwner"], default: "student" },
    description: { type: String, required: false, default: "" },
    portfolioWebsite: { type: String, required: false, default: "" }
  },
  { timestamps: true }
);

const serviceSchema = new Schema<ServiceDoc>(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    priceUsd: { type: Number, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const appointmentSchema = new Schema<AppointmentDoc>(
  {
    serviceId: { type: Schema.Types.ObjectId, required: true, index: true },
    businessOwnerId: { type: Schema.Types.ObjectId, required: true, index: true },
    customerUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    startAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["pending", "approved", "denied", "completed", "cancelled", "scheduled"], default: "pending" },
    notes: { type: String }
  },
  { timestamps: true }
);

const chatMessageSchema = new Schema<ChatMessageDoc>(
  {
    senderUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    recipientUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    senderName: { type: String, required: true },
    senderEmail: { type: String, required: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

const listingSchema = new Schema<ListingDoc>(
  {
    sellerUserId: { type: Schema.Types.ObjectId, required: false, index: true },
    sellerName: { type: String, required: true },
    imageUrl: { type: String, required: false },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["textbook", "dorm", "other"], required: true },
    status: { type: String, enum: ["OPEN", "SOLD", "CLOSED"], default: "OPEN" },
    startPrice: { type: Number, required: true, default: 0 },
    floorPrice: { type: Number, required: true, default: 0 },
    startsAt: { type: Date, required: true, default: Date.now },
    offerWindowEndsAt: { type: Date, required: true },
    acceptedOfferId: { type: Schema.Types.ObjectId, required: false },
    offers: {
      type: [
        {
          bidderName: String,
          amount: Number,
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

const User = mongoose.model<UserDoc>("User", userSchema);
const Service = mongoose.model<ServiceDoc>("Service", serviceSchema);
const Appointment = mongoose.model<AppointmentDoc>("Appointment", appointmentSchema);
const ChatMessage = mongoose.model<ChatMessageDoc>("ChatMessage", chatMessageSchema);
const Listing = mongoose.model<ListingDoc>("Listing", listingSchema);

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().refine((v) => v.toLowerCase().endsWith(".edu"), "School email required (.edu)"),
  password: z.string().min(8),
  role: z.enum(["student", "businessOwner"]).default("student")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const createListingSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  imageUrl: z.string().max(2_000_000).optional().or(z.literal("")),
  category: z.enum(["textbook", "dorm", "other"]),
  startPrice: z.number().positive(),
  floorPrice: z.number().nonnegative(),
  offerWindowHours: z.number().int().min(1).max(168).default(48)
}).refine((data) => data.startPrice >= data.floorPrice, {
  message: "Start price must be greater than or equal to floor price",
  path: ["floorPrice"]
});

const createOfferSchema = z.object({
  // kept optional for backward compatibility with older clients; server ignores it.
  bidderName: z.string().min(2).optional(),
  amount: z.number().positive()
});

const createServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  durationMinutes: z.number().int().min(15).max(480),
  priceUsd: z.number().nonnegative(),
  imageUrl: z.string().max(2_000_000).optional().or(z.literal(""))
});

const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional()
});

const createAppointmentSchema = z.object({
  serviceId: z.string().min(1),
  startAt: z.string().datetime(),
  notes: z.string().max(500).optional()
});

const updateAppointmentSchema = z.object({
  status: z.enum(["approved", "completed", "cancelled"])
});

const denyAppointmentSchema = z.object({
  reason: z.string().min(2).max(500).optional()
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["student", "businessOwner"]).optional(),
  description: z.string().max(1000).optional(),
  portfolioWebsite: z.union([z.literal(""), z.string().url()]).optional()
});

const chatMessageSchemaInput = z.object({
  text: z.string().min(1).max(1000)
});

const chatPeerParamSchema = z.object({
  peerUserId: z
    .string()
    .min(1)
    .refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid peer user id")
});

const objectIdSchema = z
  .string()
  .min(1)
  .refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid id");

function parseObjectId(id: string) {
  const parsed = objectIdSchema.safeParse(id);
  if (!parsed.success) return null;
  return new mongoose.Types.ObjectId(parsed.data);
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: "2mb" })); // Increased limit for base64 images

// Basic Request Logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

if (process.env.NODE_ENV === "production" && JWT_SECRET === "dev-secret-change-me") {
  console.warn("JWT_SECRET is using the development fallback in production. Set a strong JWT_SECRET.");
}

const jwtPayloadSchema = z.object({
  sub: z
    .string()
    .min(1)
    .refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid subject")
});

function verifyTokenSubject(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    const parsed = jwtPayloadSchema.safeParse(decoded);
    return parsed.success ? parsed.data.sub : null;
  } catch {
    return null;
  }
}

function signToken(user: UserDoc) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256"
  });
}

async function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.header("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || "";
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const subject = verifyTokenSubject(token);
  if (!subject) return res.status(401).json({ error: "Unauthorized" });

  const user = await User.findById(subject);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  (req as any).user = user;
  next();
}


function serializeUser(user: UserDoc) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    description: user.description || "",
    portfolioWebsite: user.portfolioWebsite || "",
    schoolVerified: true
  };
}

function serializeListing(doc: ListingDoc) {
  const now = Date.now();
  const start = doc.startsAt.getTime();
  const end = doc.offerWindowEndsAt.getTime();
  let currentPrice = doc.startPrice;

  if (now >= end) {
    currentPrice = doc.floorPrice;
  } else if (now > start) {
    const totalDuration = end - start;
    const elapsed = now - start;
    const priceDiff = doc.startPrice - doc.floorPrice;
    currentPrice = doc.startPrice - (elapsed / totalDuration) * priceDiff;
  }

  return {
    id: doc._id.toString(),
    sellerUserId: doc.sellerUserId?.toString(),
    sellerName: doc.sellerName,
    imageUrl: doc.imageUrl,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    status: doc.status,
    startPrice: doc.startPrice,
    floorPrice: doc.floorPrice,
    currentPrice: Number(currentPrice.toFixed(2)),
    offerWindowEndsAt: doc.offerWindowEndsAt.toISOString(),
    acceptedOfferId: doc.acceptedOfferId?.toString(),
    createdAt: doc.createdAt.toISOString(),
    offers: [...doc.offers]
      .sort((a, b) => b.amount - a.amount)
      .map((o) => ({ id: o._id.toString(), bidderName: o.bidderName, amount: o.amount, createdAt: o.createdAt.toISOString() }))
  };
}

function serializeAppointment(a: AppointmentDoc) {
  return {
    id: a._id.toString(),
    serviceId: a.serviceId.toString(),
    businessOwnerId: a.businessOwnerId.toString(),
    customerUserId: a.customerUserId.toString(),
    customerName: a.customerName,
    customerEmail: a.customerEmail,
    startAt: a.startAt.toISOString(),
    status: a.status,
    notes: a.notes
  };
}

async function broadcastListings() {
  const docs = await Listing.find().sort({ createdAt: -1 });
  io.emit("listings:updated", docs.map(serializeListing));
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "reverse-auction-api", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// Auth + school email verification (.edu)
app.post("/api/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const email = parsed.data.email.toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) { 
    console.warn("Email already exists", { email });
    return res.status(409).json({ error: "Email already registered" }); 
  }

  const user = await User.create({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 10),
    role: parsed.data.role
  });

  const token = signToken(user);
  return res.status(201).json({ token, user: serializeUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({ token, user: serializeUser(user) });
});

app.get("/api/me", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  return res.json(serializeUser(user));
});

app.patch("/api/me", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.name) user.name = parsed.data.name;
  if (parsed.data.role) user.role = parsed.data.role;
  if (parsed.data.description !== undefined) user.description = parsed.data.description;
  if (parsed.data.portfolioWebsite !== undefined) user.portfolioWebsite = parsed.data.portfolioWebsite;
  await user.save();

  return res.json(serializeUser(user));
});

app.get("/api/dashboard", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const [listingsCount, soldCount, appointmentsCount, offersAgg, servicesCount, servicesSoldCount] = await Promise.all([
    Listing.countDocuments({ sellerUserId: user._id }),
    Listing.countDocuments({ sellerUserId: user._id, status: "SOLD" }),
    user.role === "businessOwner"
      ? Appointment.countDocuments({ businessOwnerId: user._id })
      : Appointment.countDocuments({ customerUserId: user._id }),
    Listing.aggregate([
      { $match: { sellerUserId: user._id } },
      { $unwind: "$offers" },
      { $count: "total" }
    ]),
    user.role === "businessOwner" ? Service.countDocuments({ ownerId: user._id }) : Promise.resolve(0),
    user.role === "businessOwner" ? Appointment.countDocuments({ businessOwnerId: user._id, status: "completed" }) : Promise.resolve(0)
  ]);

  const totalOffers = offersAgg[0]?.total ?? 0;
  return res.json({
    user: { id: user._id.toString(), role: user.role },
    stats: {
      listingsCount,
      soldCount,
      totalOffers,
      appointmentsCount,
      servicesCount,
      servicesSoldCount,
      salesByType: {
        productsSold: soldCount,
        servicesSold: servicesSoldCount
      }
    }
  });
});

// Reverse auction
app.get("/api/listings", async (_req, res) => {
  const docs = await Listing.find().sort({ createdAt: -1 });
  res.json(docs.map(serializeListing));
});

app.post("/api/listings", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const parsed = createListingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + parsed.data.offerWindowHours * 3600000);
  const doc = await Listing.create({
    sellerUserId: user._id,
    sellerName: user.name,
    imageUrl: parsed.data.imageUrl || undefined,
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    startPrice: parsed.data.startPrice,
    floorPrice: parsed.data.floorPrice,
    startsAt,
    status: "OPEN",
    offerWindowEndsAt: endsAt,
    offers: []
  });
  await broadcastListings();
  return res.status(201).json(serializeListing(doc));
});

app.post("/api/listings/:id/offers", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const doc = await Listing.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Listing not found" });
  if (doc.status !== "OPEN") return res.status(400).json({ error: "Listing is not open" });
  if (doc.offerWindowEndsAt.getTime() < Date.now()) return res.status(400).json({ error: "Offer window has ended" });

  if (doc.sellerUserId?.toString() === user._id.toString()) {
    return res.status(403).json({ error: "Sellers cannot bid on their own listing" });
  }

  const parsed = createOfferSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // Enforce authenticated identity; ignore bidderName supplied by client.
  doc.offers.push({ bidderName: user.name, amount: parsed.data.amount, createdAt: new Date() } as any);
  await doc.save();
  await broadcastListings();

  const added = doc.offers[doc.offers.length - 1];
  return res.status(201).json({ id: added._id.toString(), bidderName: added.bidderName, amount: added.amount, createdAt: added.createdAt.toISOString() });
});

app.post("/api/listings/:id/accept-offer", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const listingId = parseObjectId(req.params.id);
  if (!listingId) return res.status(400).json({ error: "Invalid listing id" });

  const doc = await Listing.findById(listingId);
  if (!doc) return res.status(404).json({ error: "Listing not found" });
  if (doc.status !== "OPEN") return res.status(400).json({ error: "Listing is not open" });
  if (doc.sellerUserId?.toString() !== user._id.toString()) {
    return res.status(403).json({ error: "Only the listing seller can accept an offer" });
  }

  const parsedId = objectIdSchema.safeParse(req.body.offerId);
  if (!parsedId.success) return res.status(400).json({ error: "Invalid offerId" });

  const offer = doc.offers.find((o) => o._id.toString() === parsedId.data);
  if (!offer) return res.status(404).json({ error: "Offer not found" });

  doc.acceptedOfferId = offer._id;
  doc.status = "SOLD";
  await doc.save();

  await broadcastListings();
  return res.json({ listingId: doc._id.toString(), status: doc.status, acceptedOffer: { id: offer._id.toString(), bidderName: offer.bidderName, amount: offer.amount } });
});

// Services (CRUD)
app.get("/api/services", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const filter = user.role === "businessOwner" ? { ownerId: user._id } : { isActive: true };
  const docs = await Service.find(filter).sort({ createdAt: -1 });
  res.json(docs.map((d) => ({ id: d._id.toString(), name: d.name, description: d.description, durationMinutes: d.durationMinutes, priceUsd: d.priceUsd, imageUrl: d.imageUrl, isActive: d.isActive })));
});

app.post("/api/services", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  if (user.role !== "businessOwner") return res.status(403).json({ error: "Only businessOwner can create services" });

  const parsed = createServiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const created = await Service.create({ ownerId: user._id, ...parsed.data, imageUrl: parsed.data.imageUrl || undefined, isActive: true });
  return res.status(201).json({ id: created._id.toString(), name: created.name, description: created.description, durationMinutes: created.durationMinutes, priceUsd: created.priceUsd, imageUrl: created.imageUrl, isActive: created.isActive });
});

app.patch("/api/services/:id", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const parsed = updateServiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const patch = { ...parsed.data, ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl || undefined } : {}) };
  const updated = await Service.findOneAndUpdate({ _id: req.params.id, ownerId: user._id }, { $set: patch }, { new: true });
  if (!updated) return res.status(404).json({ error: "Service not found" });
  return res.json({ id: updated._id.toString(), name: updated.name, description: updated.description, durationMinutes: updated.durationMinutes, priceUsd: updated.priceUsd, imageUrl: updated.imageUrl, isActive: updated.isActive });
});

app.delete("/api/services/:id", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const deleted = await Service.findOneAndDelete({ _id: req.params.id, ownerId: user._id });
  if (!deleted) return res.status(404).json({ error: "Service not found" });
  return res.json({ ok: true });
});

// Appointments
app.post("/api/appointments", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const parsed = createAppointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const service = await Service.findById(parsed.data.serviceId);
  if (!service || !service.isActive) return res.status(404).json({ error: "Service not found" });

  const owner = await User.findById(service.ownerId);
  if (!owner) return res.status(404).json({ error: "Service owner not found" });

  const created = await Appointment.create({
    serviceId: service._id,
    businessOwnerId: service.ownerId,
    customerUserId: user._id,
    customerName: user.name,
    customerEmail: user.email,
    startAt: new Date(parsed.data.startAt),
    status: "pending",
    notes: parsed.data.notes
  });

  const hasExistingDirectChat = await ChatMessage.exists({
    $or: [
      { senderUserId: user._id, recipientUserId: owner._id },
      { senderUserId: owner._id, recipientUserId: user._id }
    ]
  });

  if (!hasExistingDirectChat) {
    await ChatMessage.create({
      senderUserId: user._id,
      recipientUserId: owner._id,
      senderName: user.name,
      senderEmail: user.email,
      text: `Hi ${owner.name}, I requested \"${service.name}\" for ${created.startAt.toLocaleString()}. Please approve or deny when you can.`
    });
  }

  return res.status(201).json(serializeAppointment(created));
});

app.get("/api/appointments", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const filter = user.role === "businessOwner" ? { businessOwnerId: user._id } : { customerUserId: user._id };
  const docs = await Appointment.find(filter).sort({ startAt: 1 });
  res.json(docs.map(serializeAppointment));
});

app.patch("/api/appointments/:id", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  if (user.role !== "businessOwner") return res.status(403).json({ error: "Only businessOwner can update appointment status" });

  const parsed = updateAppointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await Appointment.findOneAndUpdate(
    { _id: req.params.id, businessOwnerId: user._id },
    { $set: { status: parsed.data.status } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: "Appointment not found" });

  return res.json({ id: updated._id.toString(), status: updated.status });
});

app.post("/api/appointments/:id/approve", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  if (user.role !== "businessOwner") return res.status(403).json({ error: "Only businessOwner can approve appointment requests" });

  const appointmentId = parseObjectId(req.params.id);
  if (!appointmentId) return res.status(400).json({ error: "Invalid appointment id" });

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });
  if (appointment.businessOwnerId.toString() !== user._id.toString()) {
    return res.status(403).json({ error: "Only the appointment owner can approve this request" });
  }

  const service = await Service.findById(appointment.serviceId).select({ ownerId: 1 });
  if (!service) return res.status(409).json({ error: "Associated service no longer exists" });
  if (service.ownerId.toString() !== user._id.toString()) {
    return res.status(403).json({ error: "Only the service owner can approve this request" });
  }

  if (!["pending", "scheduled"].includes(appointment.status)) {
    return res.status(409).json({ error: `Appointment cannot be approved from status ${appointment.status}` });
  }

  appointment.status = "approved";
  await appointment.save();
  return res.json(serializeAppointment(appointment));
});

app.post("/api/appointments/:id/deny", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  if (user.role !== "businessOwner") return res.status(403).json({ error: "Only businessOwner can deny appointment requests" });

  const parsed = denyAppointmentSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const appointmentId = parseObjectId(req.params.id);
  if (!appointmentId) return res.status(400).json({ error: "Invalid appointment id" });

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });
  if (appointment.businessOwnerId.toString() !== user._id.toString()) {
    return res.status(403).json({ error: "Only the appointment owner can deny this request" });
  }

  const service = await Service.findById(appointment.serviceId).select({ ownerId: 1 });
  if (!service) return res.status(409).json({ error: "Associated service no longer exists" });
  if (service.ownerId.toString() !== user._id.toString()) {
    return res.status(403).json({ error: "Only the service owner can deny this request" });
  }

  if (!["pending", "scheduled"].includes(appointment.status)) {
    return res.status(409).json({ error: `Appointment cannot be denied from status ${appointment.status}` });
  }

  appointment.status = "denied";
  if (parsed.data.reason) {
    appointment.notes = appointment.notes
      ? `${appointment.notes}\n\nDenial reason: ${parsed.data.reason}`
      : `Denial reason: ${parsed.data.reason}`;
  }
  await appointment.save();
  return res.json(serializeAppointment(appointment));
});

// User-scoped direct chat
app.get("/api/users", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const users = await User.find({ _id: { $ne: user._id } }).sort({ name: 1 }).limit(200);
  res.json(users.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email, role: u.role })));
});

app.get("/api/chats/conversations", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const uid = user._id;
  const msgs = await ChatMessage.find({ $or: [{ senderUserId: uid }, { recipientUserId: uid }] })
    .sort({ createdAt: -1 })
    .limit(500);

  const summaries = new Map<string, { peerUserId: string; lastText: string; lastAt: string; lastSenderName: string }>();
  for (const m of msgs) {
    // Guard against legacy chat rows created before recipientUserId existed.
    if (!m.senderUserId || !m.recipientUserId) continue;

    const senderId = m.senderUserId.toString();
    const recipientId = m.recipientUserId.toString();
    const myId = uid.toString();
    const peer = senderId === myId ? recipientId : senderId;

    if (!summaries.has(peer)) {
      summaries.set(peer, {
        peerUserId: peer,
        lastText: m.text,
        lastAt: m.createdAt.toISOString(),
        lastSenderName: m.senderName
      });
    }
  }

  const peers = [...summaries.keys()].map((id) => new mongoose.Types.ObjectId(id));
  const peerUsers = await User.find({ _id: { $in: peers } });
  const peerMap = new Map(peerUsers.map((u) => [u._id.toString(), u]));

  res.json(
    [...summaries.values()].map((s) => ({
      ...s,
      peerName: peerMap.get(s.peerUserId)?.name || "Unknown",
      peerEmail: peerMap.get(s.peerUserId)?.email || ""
    }))
  );
});

app.get("/api/chats/:peerUserId", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const parsedPeer = chatPeerParamSchema.safeParse(req.params);
  if (!parsedPeer.success) return res.status(400).json({ error: "Invalid peer user id" });
  const peerId = new mongoose.Types.ObjectId(parsedPeer.data.peerUserId);

  const msgs = await ChatMessage.find({
    $or: [
      { senderUserId: user._id, recipientUserId: peerId },
      { senderUserId: peerId, recipientUserId: user._id }
    ]
  })
    .sort({ createdAt: 1 })
    .limit(500);

  res.json(
    msgs.map((m) => ({
      id: m._id.toString(),
      senderUserId: m.senderUserId.toString(),
      recipientUserId: m.recipientUserId.toString(),
      senderName: m.senderName,
      senderEmail: m.senderEmail,
      text: m.text,
      createdAt: m.createdAt.toISOString()
    }))
  );
});

app.post("/api/chats/:peerUserId", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const parsedPeer = chatPeerParamSchema.safeParse(req.params);
  if (!parsedPeer.success) return res.status(400).json({ error: "Invalid peer user id" });

  const parsed = chatMessageSchemaInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const peer = await User.findById(parsedPeer.data.peerUserId);
  if (!peer) return res.status(404).json({ error: "Peer user not found" });

  const created = await ChatMessage.create({
    senderUserId: user._id,
    recipientUserId: peer._id,
    senderName: user.name,
    senderEmail: user.email,
    text: parsed.data.text
  });

  const payload = {
    id: created._id.toString(),
    senderUserId: created.senderUserId.toString(),
    recipientUserId: created.recipientUserId.toString(),
    senderName: created.senderName,
    senderEmail: created.senderEmail,
    text: created.text,
    createdAt: created.createdAt.toISOString()
  };

  io.to(`user:${user._id.toString()}`).emit("chat:new", payload);
  io.to(`user:${peer._id.toString()}`).emit("chat:new", payload);
  res.status(201).json(payload);
});

app.post("/api/chats/:peerUserId/read", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const parsedPeer = chatPeerParamSchema.safeParse(req.params);
  if (!parsedPeer.success) return res.status(400).json({ error: "Invalid peer user id" });

  const peer = await User.findById(parsedPeer.data.peerUserId);
  if (!peer) return res.status(404).json({ error: "Peer user not found" });

  const latestIncoming = await ChatMessage.findOne({
    senderUserId: peer._id,
    recipientUserId: user._id
  })
    .sort({ createdAt: -1 })
    .select({ _id: 1, createdAt: 1 });

  const payload = {
    peerUserId: peer._id.toString(),
    readerUserId: user._id.toString(),
    readAt: new Date().toISOString(),
    latestIncomingMessageId: latestIncoming?._id?.toString() || null,
    latestIncomingMessageAt: latestIncoming?.createdAt?.toISOString() || null
  };

  io.to(`user:${peer._id.toString()}`).emit("chat:read", payload);
  io.to(`user:${user._id.toString()}`).emit("chat:read", payload);
  return res.json(payload);
});

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/quadcommerce";
const port = Number(process.env.PORT ?? 4000);

async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    return MONGO_URI;
  } catch {
    const memory = await MongoMemoryServer.create({
      binary: { version: process.env.MEMORY_MONGO_VERSION ?? "4.4.28" },
      instance: { dbName: "quadcommerce" }
    });
    const uri = memory.getUri();
    await mongoose.connect(uri);
    console.log("Fell back to in-process local MongoDB (mongodb-memory-server)");
    return uri;
  }
}

async function start() {
  const uri = await connectMongo();

  // Clean up legacy global-chat rows that do not have recipientUserId.
  const cleanup = await ChatMessage.deleteMany({ recipientUserId: { $exists: false } as any });
  if (cleanup.deletedCount) {
    console.log(`Removed ${cleanup.deletedCount} legacy chat messages without recipientUserId`);
  }

  httpServer.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.error(`Port ${port} already in use. Stop the other API process or change PORT.`);
      process.exit(1);
    }
  });
  httpServer.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
    console.log(`Mongo connected: ${uri}`);
  });
}

io.on("connection", (socket) => {
  const token = (socket.handshake.auth?.token || socket.handshake.query?.token || "") as string;
  if (token) {
    const subject = verifyTokenSubject(token);
    if (subject) {
      socket.join(`user:${subject}`);
    }
  }
  socket.emit("connected", { ok: true });
});

// --- Global Error Handler ---
app.use((err: any, _req: express.Response, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
