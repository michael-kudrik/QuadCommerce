export type Role = "student" | "businessOwner";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  description?: string;
  portfolioWebsite?: string;
  profileImageUrl?: string;
  schoolVerified: boolean;
};

export type Offer = { id: string; bidderName: string; amount: number; createdAt: string };

export type Listing = {
  id: string;
  sellerUserId?: string;
  sellerName: string;
  imageUrl?: string;
  title: string;
  description: string;
  category: "textbook" | "dorm" | "other";
  status: "OPEN" | "SOLD" | "CLOSED";
  startPrice: number;
  floorPrice: number;
  currentPrice: number;
  offerWindowHours?: number;
  offerWindowEndsAt: string;
  acceptedOfferId?: string;
  offers: Offer[];
};

export type Service = {
  id: string;
  ownerId?: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceUsd: number;
  imageUrl?: string;
  isActive: boolean;
  imageUrl?: string;
};

export type Appointment = {
  id: string;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  startAt: string;
  status: "pending" | "approved" | "denied" | "scheduled" | "completed" | "cancelled";
  notes?: string;
};

export type ChatMessage = {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  senderName: string;
  senderEmail: string;
  text: string;
  createdAt: string;
};

export type ChatReadReceipt = {
  peerUserId: string;
  readerUserId: string;
  readAt: string;
  latestIncomingMessageId: string | null;
  latestIncomingMessageAt: string | null;
};
