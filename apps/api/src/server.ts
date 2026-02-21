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
}

interface ServiceDoc extends mongoose.Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  durationMinutes: number;
  priceUsd: number;
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
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessageDoc extends mongoose.Document {
  senderUserId: mongoose.Types.ObjectId;
  senderName: string;
  senderEmail: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ListingDoc extends mongoose.Document {
  sellerName: string;
  title: string;
  description: string;
  category: "textbook" | "dorm" | "other";
  status: ListingStatus;
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
    role: { type: String, enum: ["student", "businessOwner"], default: "student" }
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
    status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
    notes: { type: String }
  },
  { timestamps: true }
);

const chatMessageSchema = new Schema<ChatMessageDoc>(
  {
    senderUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    senderName: { type: String, required: true },
    senderEmail: { type: String, required: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

const listingSchema = new Schema<ListingDoc>(
  {
    sellerName: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["textbook", "dorm", "other"], required: true },
    status: { type: String, enum: ["OPEN", "SOLD", "CLOSED"], default: "OPEN" },
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
  sellerName: z.string().min(2),
  title: z.string().min(3),
  description: z.string().min(5),
  category: z.enum(["textbook", "dorm", "other"]),
  offerWindowHours: z.number().int().min(1).max(168).default(48)
});

const createOfferSchema = z.object({
  bidderName: z.string().min(2),
  amount: z.number().positive()
});

const createServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  durationMinutes: z.number().int().min(15).max(480),
  priceUsd: z.number().nonnegative()
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
  status: z.enum(["scheduled", "completed", "cancelled"]) 
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["student", "businessOwner"]).optional()
});

const chatMessageSchemaInput = z.object({
  text: z.string().min(1).max(1000)
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function signToken(user: UserDoc) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: "7d"
  });
}

async function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.header("authorization")?.replace("Bearer ", "") || "";
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    (req as any).user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function serializeListing(doc: ListingDoc) {
  return {
    id: doc._id.toString(),
    sellerName: doc.sellerName,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    status: doc.status,
    offerWindowEndsAt: doc.offerWindowEndsAt.toISOString(),
    acceptedOfferId: doc.acceptedOfferId?.toString(),
    createdAt: doc.createdAt.toISOString(),
    offers: [...doc.offers]
      .sort((a, b) => b.amount - a.amount)
      .map((o) => ({ id: o._id.toString(), bidderName: o.bidderName, amount: o.amount, createdAt: o.createdAt.toISOString() }))
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
  if (exists) return res.status(409).json({ error: "Email already registered" });

  const user = await User.create({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 10),
    role: parsed.data.role
  });

  const token = signToken(user);
  return res.status(201).json({ token, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role, schoolVerified: true } });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({ token, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role, schoolVerified: true } });
});

app.get("/api/me", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  return res.json({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, schoolVerified: true });
});

app.patch("/api/me", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.name) user.name = parsed.data.name;
  if (parsed.data.role) user.role = parsed.data.role;
  await user.save();

  return res.json({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, schoolVerified: true });
});

app.get("/api/dashboard", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const [listingsCount, soldCount, appointmentsCount, offersAgg, servicesCount] = await Promise.all([
    Listing.countDocuments(),
    Listing.countDocuments({ status: "SOLD" }),
    user.role === "businessOwner"
      ? Appointment.countDocuments({ businessOwnerId: user._id })
      : Appointment.countDocuments({ customerUserId: user._id }),
    Listing.aggregate([{ $unwind: "$offers" }, { $count: "total" }]),
    user.role === "businessOwner" ? Service.countDocuments({ ownerId: user._id }) : Promise.resolve(0)
  ]);

  const totalOffers = offersAgg[0]?.total ?? 0;
  return res.json({
    user: { id: user._id.toString(), role: user.role },
    stats: { listingsCount, soldCount, totalOffers, appointmentsCount, servicesCount }
  });
});

// Reverse auction
app.get("/api/listings", async (_req, res) => {
  const docs = await Listing.find().sort({ createdAt: -1 });
  res.json(docs.map(serializeListing));
});

app.post("/api/listings", async (req, res) => {
  const parsed = createListingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const ends = new Date(Date.now() + parsed.data.offerWindowHours * 3600000);
  const doc = await Listing.create({ ...parsed.data, status: "OPEN", offerWindowEndsAt: ends, offers: [] });
  await broadcastListings();
  return res.status(201).json(serializeListing(doc));
});

app.post("/api/listings/:id/offers", async (req, res) => {
  const doc = await Listing.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Listing not found" });
  if (doc.status !== "OPEN") return res.status(400).json({ error: "Listing is not open" });
  if (doc.offerWindowEndsAt.getTime() < Date.now()) return res.status(400).json({ error: "Offer window has ended" });

  const parsed = createOfferSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  doc.offers.push({ bidderName: parsed.data.bidderName, amount: parsed.data.amount, createdAt: new Date() } as any);
  await doc.save();
  await broadcastListings();

  const added = doc.offers[doc.offers.length - 1];
  return res.status(201).json({ id: added._id.toString(), bidderName: added.bidderName, amount: added.amount, createdAt: added.createdAt.toISOString() });
});

app.post("/api/listings/:id/accept-offer", async (req, res) => {
  const doc = await Listing.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Listing not found" });
  if (doc.status !== "OPEN") return res.status(400).json({ error: "Listing is not open" });

  const parsedId = z.string().min(1).safeParse(req.body.offerId);
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
  const docs = await Service.find({ ownerId: user._id }).sort({ createdAt: -1 });
  res.json(docs.map((d) => ({ id: d._id.toString(), name: d.name, description: d.description, durationMinutes: d.durationMinutes, priceUsd: d.priceUsd, isActive: d.isActive })));
});

app.post("/api/services", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  if (user.role !== "businessOwner") return res.status(403).json({ error: "Only businessOwner can create services" });

  const parsed = createServiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const created = await Service.create({ ownerId: user._id, ...parsed.data, isActive: true });
  return res.status(201).json({ id: created._id.toString(), name: created.name, description: created.description, durationMinutes: created.durationMinutes, priceUsd: created.priceUsd, isActive: created.isActive });
});

app.patch("/api/services/:id", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const parsed = updateServiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await Service.findOneAndUpdate({ _id: req.params.id, ownerId: user._id }, { $set: parsed.data }, { new: true });
  if (!updated) return res.status(404).json({ error: "Service not found" });
  return res.json({ id: updated._id.toString(), name: updated.name, description: updated.description, durationMinutes: updated.durationMinutes, priceUsd: updated.priceUsd, isActive: updated.isActive });
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

  const created = await Appointment.create({
    serviceId: service._id,
    businessOwnerId: service.ownerId,
    customerUserId: user._id,
    customerName: user.name,
    customerEmail: user.email,
    startAt: new Date(parsed.data.startAt),
    status: "scheduled",
    notes: parsed.data.notes
  });

  return res.status(201).json({
    id: created._id.toString(),
    serviceId: created.serviceId.toString(),
    businessOwnerId: created.businessOwnerId.toString(),
    customerUserId: created.customerUserId.toString(),
    customerName: created.customerName,
    customerEmail: created.customerEmail,
    startAt: created.startAt.toISOString(),
    status: created.status,
    notes: created.notes
  });
});

app.get("/api/appointments", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const filter = user.role === "businessOwner" ? { businessOwnerId: user._id } : { customerUserId: user._id };
  const docs = await Appointment.find(filter).sort({ startAt: 1 });
  res.json(
    docs.map((a) => ({
      id: a._id.toString(),
      serviceId: a.serviceId.toString(),
      businessOwnerId: a.businessOwnerId.toString(),
      customerUserId: a.customerUserId.toString(),
      customerName: a.customerName,
      customerEmail: a.customerEmail,
      startAt: a.startAt.toISOString(),
      status: a.status,
      notes: a.notes
    }))
  );
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

// Global chat
app.get("/api/chats", auth, async (_req, res) => {
  const msgs = await ChatMessage.find().sort({ createdAt: -1 }).limit(100);
  res.json(
    msgs
      .reverse()
      .map((m) => ({ id: m._id.toString(), senderUserId: m.senderUserId.toString(), senderName: m.senderName, senderEmail: m.senderEmail, text: m.text, createdAt: m.createdAt.toISOString() }))
  );
});

app.post("/api/chats", auth, async (req, res) => {
  const user = (req as any).user as UserDoc;
  const parsed = chatMessageSchemaInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const created = await ChatMessage.create({
    senderUserId: user._id,
    senderName: user.name,
    senderEmail: user.email,
    text: parsed.data.text
  });

  const payload = {
    id: created._id.toString(),
    senderUserId: created.senderUserId.toString(),
    senderName: created.senderName,
    senderEmail: created.senderEmail,
    text: created.text,
    createdAt: created.createdAt.toISOString()
  };

  io.emit("chat:new", payload);
  res.status(201).json(payload);
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

io.on("connection", (socket) => socket.emit("connected", { ok: true }));

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
