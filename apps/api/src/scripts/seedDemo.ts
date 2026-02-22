import "dotenv/config";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/quadcommerce";
const DEMO_DOMAIN = "qc-demo.edu";
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || "password123";

if (process.env.NODE_ENV === "production" && process.env.DEMO_SEED_ALLOW_PROD !== "true") {
  console.error("Refusing to run demo seed in production. Set DEMO_SEED_ALLOW_PROD=true to override intentionally.");
  process.exit(1);
}

interface UserDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: "student" | "businessOwner";
}

interface ServiceDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  imageUrl?: string;
  durationMinutes: number;
  priceUsd: number;
  isActive: boolean;
}

interface AppointmentDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  businessOwnerId: mongoose.Types.ObjectId;
  customerUserId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  startAt: Date;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
}

interface ChatMessageDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  senderUserId: mongoose.Types.ObjectId;
  recipientUserId: mongoose.Types.ObjectId;
  senderName: string;
  senderEmail: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatReadStateDoc extends mongoose.Document {
  ownerUserId: mongoose.Types.ObjectId;
  peerUserId: mongoose.Types.ObjectId;
  readAt: Date;
  latestIncomingMessageId?: mongoose.Types.ObjectId;
  latestIncomingMessageAt?: Date;
}

interface ListingDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  sellerUserId?: mongoose.Types.ObjectId;
  sellerName: string;
  imageUrl?: string;
  title: string;
  description: string;
  category: "textbook" | "dorm" | "other";
  status: "OPEN" | "SOLD" | "CLOSED";
  startPrice: number;
  floorPrice: number;
  startsAt: Date;
  offerWindowEndsAt: Date;
  acceptedOfferId?: mongoose.Types.ObjectId;
  offers: Array<{ _id: mongoose.Types.ObjectId; bidderName: string; amount: number; createdAt: Date }>;
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
    imageUrl: { type: String, required: false },
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
    recipientUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    senderName: { type: String, required: true },
    senderEmail: { type: String, required: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

const chatReadStateSchema = new Schema<ChatReadStateDoc>(
  {
    ownerUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    peerUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    readAt: { type: Date, required: true },
    latestIncomingMessageId: { type: Schema.Types.ObjectId, required: false },
    latestIncomingMessageAt: { type: Date, required: false }
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
const ChatReadState = mongoose.model<ChatReadStateDoc>("ChatReadState", chatReadStateSchema);
const Listing = mongoose.model<ListingDoc>("Listing", listingSchema);

const usersSeed = [
  { key: "owner1", name: "Maya Patel", email: `maya.patel@${DEMO_DOMAIN}`, role: "businessOwner" as const },
  { key: "owner2", name: "Noah Kim", email: `noah.kim@${DEMO_DOMAIN}`, role: "businessOwner" as const },
  { key: "owner3", name: "Elena Garcia", email: `elena.garcia@${DEMO_DOMAIN}`, role: "businessOwner" as const },
  { key: "student1", name: "Ava Johnson", email: `ava.johnson@${DEMO_DOMAIN}`, role: "student" as const },
  { key: "student2", name: "Liam Carter", email: `liam.carter@${DEMO_DOMAIN}`, role: "student" as const },
  { key: "student3", name: "Zoe Nguyen", email: `zoe.nguyen@${DEMO_DOMAIN}`, role: "student" as const },
  { key: "student4", name: "Ethan Brooks", email: `ethan.brooks@${DEMO_DOMAIN}`, role: "student" as const },
  { key: "student5", name: "Mia Lopez", email: `mia.lopez@${DEMO_DOMAIN}`, role: "student" as const }
];

const listingImages = [
  "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521747116042-5a810fda9664?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1550418290-a8d86ad674c3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1488998527040-85054a85150e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1200&q=80"
];

const serviceImages = [
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1584697964403-cd8f6f5dcf4f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1581090700227-1e8e8c79be7b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1516321310764-8d8f441f0f58?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1596495577886-d920f1fb7238?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=1200&q=80"
];

function pickOwner(ownerIds: mongoose.Types.ObjectId[], idx: number) {
  return ownerIds[idx % ownerIds.length];
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected Mongo: ${MONGO_URI}`);

  // Remove old explicit demo/test footprints only (safe rerun scope)
  const wipeUsers = await User.find({
    $or: [
      { email: { $regex: `@${DEMO_DOMAIN.replace(".", "\\.")}$`, $options: "i" } },
      { email: { $regex: /@demo\.quadcommerce\.edu$/i } },
      { name: { $regex: /^\[DEMO\]/i } }
    ]
  }).select({ _id: 1, email: 1 });

  const wipeIds = wipeUsers.map((u) => u._id);

  if (wipeIds.length > 0) {
    await Promise.all([
      ChatReadState.deleteMany({ $or: [{ ownerUserId: { $in: wipeIds } }, { peerUserId: { $in: wipeIds } }] }),
      ChatMessage.deleteMany({ $or: [{ senderUserId: { $in: wipeIds } }, { recipientUserId: { $in: wipeIds } }] }),
      Appointment.deleteMany({ $or: [{ customerUserId: { $in: wipeIds } }, { businessOwnerId: { $in: wipeIds } }] }),
      Service.deleteMany({ ownerId: { $in: wipeIds } }),
      Listing.deleteMany({ sellerUserId: { $in: wipeIds } }),
      User.deleteMany({ _id: { $in: wipeIds } })
    ]);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = new Map<string, UserDoc>();
  for (const u of usersSeed) {
    const doc = await User.findOneAndUpdate(
      { email: u.email.toLowerCase() },
      { $set: { name: u.name, email: u.email.toLowerCase(), role: u.role, passwordHash } },
      { upsert: true, new: true }
    );
    users.set(u.key, doc!);
  }

  const ownerIds = [users.get("owner1")!._id, users.get("owner2")!._id, users.get("owner3")!._id];
  const studentIds = [users.get("student1")!, users.get("student2")!, users.get("student3")!, users.get("student4")!, users.get("student5")!];

  const listingSeed = [
    ["MacBook Air M1 13-inch", "Great battery health, includes charger and sleeve.", "other", 780, 620],
    ["Nintendo Switch OLED", "Excellent condition, dock and Joy-Cons included.", "dorm", 320, 240],
    ["Calculus Early Transcendentals 9e", "Minimal notes, no torn pages.", "textbook", 95, 60],
    ["Mini Fridge 3.2 cu ft", "Perfect for dorm room, very quiet.", "dorm", 140, 95],
    ["iPad 10th Gen 64GB", "Used one semester, case included.", "other", 420, 340],
    ["Desk Chair Ergonomic Mesh", "Lumbar support, height adjustable.", "dorm", 110, 75],
    ["Data Structures Textbook", "Clean copy with code examples.", "textbook", 70, 45],
    ["Sony WH-1000XM4", "Noise-canceling headphones in black.", "other", 210, 165],
    ["Dorm Microwave 0.9 cu ft", "Compact microwave, works perfectly.", "dorm", 80, 50],
    ["Linear Algebra and Its Applications", "Slight highlighting in chapters 1-3.", "textbook", 65, 40],
    ["Standing Desk Converter", "Fits dual monitors and keyboard.", "dorm", 160, 120],
    ["Graphing Calculator TI-84", "Fresh batteries, includes cover.", "textbook", 85, 55],
    ["Canon EOS M50 Kit", "Includes lens + SD card.", "other", 520, 410],
    ["Air Purifier HEPA", "Great for allergy season in dorms.", "dorm", 90, 58],
    ["Physics for Scientists & Engineers", "Used but in strong condition.", "textbook", 75, 48]
  ] as const;

  const now = Date.now();
  const listingDocs: any[] = [];
  for (let i = 0; i < listingSeed.length; i++) {
    const [title, description, category, startPrice, floorPrice] = listingSeed[i];
    const seller = i % 2 === 0 ? pickOwner(ownerIds, i) : studentIds[i % studentIds.length]._id;
    const sellerUser = [...users.values()].find((u) => u._id.toString() === seller.toString())!;
    const status = i < 7 ? "OPEN" : i < 12 ? "SOLD" : "CLOSED";
    const startsAt = new Date(now - (i + 2) * 3600_000);
    const endsAt = new Date(status === "OPEN" ? now + (8 + i) * 3600_000 : now - (2 + i) * 3600_000);

    const offers = [
      { _id: new mongoose.Types.ObjectId(), bidderName: users.get("student1")!.name, amount: Math.max(floorPrice, startPrice - 20), createdAt: new Date(now - (i + 1) * 1800_000) },
      { _id: new mongoose.Types.ObjectId(), bidderName: users.get("student2")!.name, amount: Math.max(floorPrice, startPrice - 35), createdAt: new Date(now - (i + 1) * 1200_000) }
    ];

    listingDocs.push({
      sellerUserId: seller,
      sellerName: sellerUser.name,
      imageUrl: listingImages[i],
      title,
      description,
      category,
      status,
      startPrice,
      floorPrice,
      startsAt,
      offerWindowEndsAt: endsAt,
      offers: status === "CLOSED" ? [] : offers,
      acceptedOfferId: status === "SOLD" ? offers[0]._id : undefined
    });
  }

  await Listing.insertMany(listingDocs);

  const serviceSeed = [
    ["Calculus Tutoring", "One-on-one sessions focused on limits, derivatives, and exam prep.", 60, 38],
    ["Chemistry Lab Report Review", "Fast, clear feedback on lab formatting and analysis sections.", 45, 30],
    ["Laptop Cleanup & Optimization", "Speed up startup, remove junk software, and tune settings.", 50, 35],
    ["Resume + LinkedIn Refresh", "Targeted edits for internships and on-campus roles.", 40, 32],
    ["Statistics Homework Help", "Guidance on probability, distributions, and hypothesis testing.", 75, 48],
    ["Dorm Wi-Fi Setup", "Router setup, device pairing, and connectivity troubleshooting.", 35, 25],
    ["Public Speaking Coaching", "Presentation structure, pacing, and confidence drills.", 55, 36],
    ["Java/Python Debug Session", "Pair-debug coding assignments and explain root causes.", 60, 42],
    ["Study Plan Design", "Personalized weekly plan for heavy exam weeks.", 30, 22],
    ["Graphic Design Help", "Flyers, social posts, and visual polish in Canva/Figma.", 60, 40],
    ["Accounting Basics Tutoring", "Balance sheets, journal entries, and exam prep support.", 70, 50],
    ["Phone Screen Repair Guidance", "Diagnosis and guided repair checklist before replacement.", 45, 28],
    ["Interview Mock Session", "Behavioral + technical mock interview with feedback.", 50, 38],
    ["Apartment Move Planner", "Packing, checklist, and budget plan for move-in/out.", 30, 20],
    ["Data Analysis Crash Help", "Excel/SPSS basics for class projects and reports.", 65, 44]
  ] as const;

  const services: ServiceDoc[] = [];
  for (let i = 0; i < serviceSeed.length; i++) {
    const [name, description, durationMinutes, priceUsd] = serviceSeed[i];
    const ownerId = pickOwner(ownerIds, i);
    const s = await Service.create({ ownerId, name, description, imageUrl: serviceImages[i], durationMinutes, priceUsd, isActive: true });
    services.push(s);
  }

  const students = [users.get("student1")!, users.get("student2")!, users.get("student3")!, users.get("student4")!, users.get("student5")!];
  const appointments: any[] = [];
  for (let i = 0; i < 12; i++) {
    const svc = services[i % services.length];
    const student = students[i % students.length];
    appointments.push({
      serviceId: svc._id,
      businessOwnerId: svc.ownerId,
      customerUserId: student._id,
      customerName: student.name,
      customerEmail: student.email,
      startAt: new Date(now + (i - 4) * 24 * 3600_000),
      status: i < 5 ? "completed" : i < 10 ? "scheduled" : "cancelled",
      notes: i % 3 === 0 ? "Bring prior assignment notes." : undefined
    });
  }
  await Appointment.insertMany(appointments);

  const chatPairs = [
    [users.get("student1")!, users.get("owner1")!, "Hi Maya, is there a tutoring opening on Tuesday?", "Yep, I can do 4:30 PM Tuesday."],
    [users.get("student2")!, users.get("owner2")!, "Can you help optimize my laptop for coding?", "Absolutely. Bring it to the library at 6 PM."],
    [users.get("student3")!, users.get("owner3")!, "Do you review resumes for finance roles?", "Yes — send me your current draft and target role."],
    [users.get("student4")!, users.get("student5")!, "Are you still selling the mini fridge?", "Yes, still available this week."]
  ] as const;

  for (const [a, b, m1, m2] of chatPairs) {
    const first = await ChatMessage.create({ senderUserId: a._id, recipientUserId: b._id, senderName: a.name, senderEmail: a.email, text: m1 });
    const second = await ChatMessage.create({ senderUserId: b._id, recipientUserId: a._id, senderName: b.name, senderEmail: b.email, text: m2 });
    await ChatReadState.findOneAndUpdate(
      { ownerUserId: a._id, peerUserId: b._id },
      { $set: { readAt: new Date(), latestIncomingMessageId: second._id, latestIncomingMessageAt: second.createdAt } },
      { upsert: true }
    );
    await ChatReadState.findOneAndUpdate(
      { ownerUserId: b._id, peerUserId: a._id },
      { $set: { readAt: new Date(Date.now() - 10 * 60_000), latestIncomingMessageId: first._id, latestIncomingMessageAt: first.createdAt } },
      { upsert: true }
    );
  }

  const listingCount = await Listing.countDocuments({ sellerUserId: { $in: [...users.values()].map((u) => u._id) } });
  const serviceCount = await Service.countDocuments({ ownerId: { $in: ownerIds } });

  console.log("Realistic demo seed complete");
  console.log(`Listings: ${listingCount}, Services: ${serviceCount}`);
  console.log(`Demo users (${users.size}) on @${DEMO_DOMAIN}, password: ${DEMO_PASSWORD}`);
  for (const u of users.values()) {
    console.log(`- ${u.name} (${u.role}) <${u.email}>`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
