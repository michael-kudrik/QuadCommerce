import "dotenv/config";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/quadcommerce";
const DEMO_DOMAIN = "demo.quadcommerce.edu";
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || "password123";
const TAG = "[DEMO]";

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

function email(local: string) {
  return `${local}@${DEMO_DOMAIN}`;
}

async function upsertUser(input: { name: string; email: string; role: "student" | "businessOwner" }, passwordHash: string) {
  return User.findOneAndUpdate(
    { email: input.email.toLowerCase() },
    { $set: { name: input.name, role: input.role, passwordHash } },
    { upsert: true, new: true }
  );
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected Mongo: ${MONGO_URI}`);

  const demoUsersByEmail = await User.find({ email: { $regex: `@${DEMO_DOMAIN.replace(".", "\\.")}$`, $options: "i" } }).select({ _id: 1, email: 1 });
  const demoUserIds = demoUsersByEmail.map((u) => u._id);

  if (demoUserIds.length > 0) {
    await Promise.all([
      ChatReadState.deleteMany({ $or: [{ ownerUserId: { $in: demoUserIds } }, { peerUserId: { $in: demoUserIds } }] }),
      ChatMessage.deleteMany({ $or: [{ senderUserId: { $in: demoUserIds } }, { recipientUserId: { $in: demoUserIds } }] }),
      Appointment.deleteMany({
        $or: [
          { customerUserId: { $in: demoUserIds } },
          { businessOwnerId: { $in: demoUserIds } }
        ]
      }),
      Service.deleteMany({ ownerId: { $in: demoUserIds } }),
      Listing.deleteMany({ sellerUserId: { $in: demoUserIds } })
    ]);
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [owner1, owner2, student1, student2, student3] = await Promise.all([
    upsertUser({ name: `${TAG} Maya Mentor`, email: email("maya.mentor"), role: "businessOwner" }, hash),
    upsertUser({ name: `${TAG} Noah Fixit`, email: email("noah.fixit"), role: "businessOwner" }, hash),
    upsertUser({ name: `${TAG} Ava Student`, email: email("ava.student"), role: "student" }, hash),
    upsertUser({ name: `${TAG} Liam Student`, email: email("liam.student"), role: "student" }, hash),
    upsertUser({ name: `${TAG} Zoe Student`, email: email("zoe.student"), role: "student" }, hash)
  ]);

  const services = await Service.insertMany([
    {
      ownerId: owner1!._id,
      name: `${TAG} Calculus Tutoring`,
      description: "One-on-one calculus tutoring with exam prep and homework walkthroughs.",
      durationMinutes: 60,
      priceUsd: 35,
      isActive: true
    },
    {
      ownerId: owner1!._id,
      name: `${TAG} Chemistry Crash Course`,
      description: "Targeted prep for common gen-chem exam topics.",
      durationMinutes: 90,
      priceUsd: 55,
      isActive: true
    },
    {
      ownerId: owner2!._id,
      name: `${TAG} Dorm Tech Setup`,
      description: "Wi-Fi/router/printer setup and troubleshooting for dorm rooms.",
      durationMinutes: 45,
      priceUsd: 28,
      isActive: true
    }
  ]);

  const now = Date.now();
  const l1Start = new Date(now - 2 * 3600_000);
  const l1End = new Date(now + 10 * 3600_000);
  const l2Start = new Date(now - 30 * 3600_000);
  const l2End = new Date(now - 2 * 3600_000);
  const l3Start = new Date(now - 48 * 3600_000);
  const l3End = new Date(now - 1 * 3600_000);

  const soldOffer1 = { _id: new mongoose.Types.ObjectId(), bidderName: student2!.name, amount: 210, createdAt: new Date(now - 5 * 3600_000) };
  const soldOffer2 = { _id: new mongoose.Types.ObjectId(), bidderName: student3!.name, amount: 190, createdAt: new Date(now - 4 * 3600_000) };

  await Listing.insertMany([
    {
      sellerUserId: owner2!._id,
      sellerName: owner2!.name,
      title: `${TAG} Gaming Monitor 27in`,
      description: "144Hz monitor, lightly used, includes HDMI cable.",
      category: "dorm",
      status: "OPEN",
      startPrice: 180,
      floorPrice: 120,
      startsAt: l1Start,
      offerWindowEndsAt: l1End,
      offers: [
        { _id: new mongoose.Types.ObjectId(), bidderName: student1!.name, amount: 150, createdAt: new Date(now - 40 * 60_000) },
        { _id: new mongoose.Types.ObjectId(), bidderName: student2!.name, amount: 140, createdAt: new Date(now - 20 * 60_000) }
      ]
    },
    {
      sellerUserId: student1!._id,
      sellerName: student1!.name,
      title: `${TAG} Organic Chemistry Textbook`,
      description: "Latest edition, highlighted but in excellent condition.",
      category: "textbook",
      status: "SOLD",
      startPrice: 280,
      floorPrice: 160,
      startsAt: l2Start,
      offerWindowEndsAt: l2End,
      acceptedOfferId: soldOffer1._id,
      offers: [soldOffer1, soldOffer2]
    },
    {
      sellerUserId: student3!._id,
      sellerName: student3!.name,
      title: `${TAG} Desk Lamp + Organizer Bundle`,
      description: "Dorm desk bundle, sold as set.",
      category: "other",
      status: "CLOSED",
      startPrice: 45,
      floorPrice: 20,
      startsAt: l3Start,
      offerWindowEndsAt: l3End,
      offers: []
    }
  ]);

  const appt1At = new Date(now + 24 * 3600_000);
  const appt2At = new Date(now + 48 * 3600_000);
  const appt3At = new Date(now - 24 * 3600_000);

  await Appointment.insertMany([
    {
      serviceId: services[0]._id,
      businessOwnerId: owner1!._id,
      customerUserId: student1!._id,
      customerName: student1!.name,
      customerEmail: student1!.email,
      startAt: appt1At,
      status: "scheduled",
      notes: "Focus on integration by parts"
    },
    {
      serviceId: services[2]._id,
      businessOwnerId: owner2!._id,
      customerUserId: student2!._id,
      customerName: student2!.name,
      customerEmail: student2!.email,
      startAt: appt2At,
      status: "scheduled",
      notes: "New router + printer setup"
    },
    {
      serviceId: services[1]._id,
      businessOwnerId: owner1!._id,
      customerUserId: student3!._id,
      customerName: student3!.name,
      customerEmail: student3!.email,
      startAt: appt3At,
      status: "completed",
      notes: "Exam review complete"
    }
  ]);

  const msg1 = await ChatMessage.create({
    senderUserId: student1!._id,
    recipientUserId: owner1!._id,
    senderName: student1!.name,
    senderEmail: student1!.email,
    text: `${TAG} Hey! Do you have tutoring slots tomorrow afternoon?`
  });

  const msg2 = await ChatMessage.create({
    senderUserId: owner1!._id,
    recipientUserId: student1!._id,
    senderName: owner1!.name,
    senderEmail: owner1!.email,
    text: `${TAG} Yes — I can do 3:00 PM or 5:30 PM. Which works?`
  });

  await ChatMessage.insertMany([
    {
      senderUserId: student2!._id,
      recipientUserId: owner2!._id,
      senderName: student2!.name,
      senderEmail: student2!.email,
      text: `${TAG} Can you also help with monitor calibration?`
    },
    {
      senderUserId: owner2!._id,
      recipientUserId: student2!._id,
      senderName: owner2!.name,
      senderEmail: owner2!.email,
      text: `${TAG} Yep, I can include that in the setup service.`
    },
    {
      senderUserId: student3!._id,
      recipientUserId: student1!._id,
      senderName: student3!.name,
      senderEmail: student3!.email,
      text: `${TAG} Is your textbook listing still available?`
    }
  ]);

  await ChatReadState.findOneAndUpdate(
    { ownerUserId: student1!._id, peerUserId: owner1!._id },
    {
      $set: {
        readAt: new Date(),
        latestIncomingMessageId: msg2._id,
        latestIncomingMessageAt: msg2.createdAt
      }
    },
    { upsert: true }
  );

  await ChatReadState.findOneAndUpdate(
    { ownerUserId: owner1!._id, peerUserId: student1!._id },
    {
      $set: {
        readAt: new Date(Date.now() - 5 * 60_000),
        latestIncomingMessageId: msg1._id,
        latestIncomingMessageAt: msg1.createdAt
      }
    },
    { upsert: true }
  );

  const counts = await Promise.all([
    User.countDocuments({ email: { $regex: `@${DEMO_DOMAIN.replace(".", "\\.")}$`, $options: "i" } }),
    Listing.countDocuments({ sellerUserId: { $in: [owner1!._id, owner2!._id, student1!._id, student2!._id, student3!._id] } }),
    Service.countDocuments({ ownerId: { $in: [owner1!._id, owner2!._id] } }),
    Appointment.countDocuments({ $or: [{ businessOwnerId: { $in: [owner1!._id, owner2!._id] } }, { customerUserId: { $in: [student1!._id, student2!._id, student3!._id] } }] }),
    ChatMessage.countDocuments({ $or: [{ senderUserId: { $in: [owner1!._id, owner2!._id, student1!._id, student2!._id, student3!._id] } }, { recipientUserId: { $in: [owner1!._id, owner2!._id, student1!._id, student2!._id, student3!._id] } }] })
  ]);

  console.log("Demo seed complete");
  console.log(`Users: ${counts[0]}, Listings: ${counts[1]}, Services: ${counts[2]}, Appointments: ${counts[3]}, ChatMessages: ${counts[4]}`);
  console.log(`Demo login password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
