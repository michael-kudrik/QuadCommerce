# Web App Design Plan — Campus Exchange + Student Biz Hub

## 1) Product Overview
Build a campus-focused platform with two integrated products:
- **Campus Exchange**: students list textbooks/dorm goods; buyers submit offers; seller accepts best offer before deadline.
- **Student Biz Hub**: dashboard for student entrepreneurs to manage bookings, customers, and performance metrics.

## 2) User Roles
- **Student User**: browse, post listings, submit offers, chat, complete handoff.
- **Student Seller**: manage listings, reserve/accept offers, mark sold.
- **Student Business Owner**: configure services, availability, appointments, customer profiles.
- **Admin/Moderator**: trust/safety, fraud moderation, disputes, analytics oversight.

## 3) Core Features

### A. Campus Exchange (Reverse Auction)
- Item listing (title, category, condition, photos, location, optional minimum acceptable price)
- Offer window (e.g., 24–72 hours) with live best-offer updates
- Seller controls: auto-accept threshold, accept/reject/counter offer
- In-app chat + handoff scheduling (on-campus meetup points)
- Optional payment escrow integration (Phase 2)
- Ratings/reputation and abuse reporting

### B. Student Biz Hub
- Service catalog (service type, duration, price, buffer time)
- Calendar + appointment booking with reminders
- Customer management (history, notes, tags, retention status)
- Metrics dashboard:
  - Revenue by period
  - Booking conversion rate
  - No-show/cancellation rates
  - Returning vs new customers

## 4) Non-Functional Requirements
- University email verification (.edu allowlist)
- Mobile-first responsive UX
- Accessibility (WCAG AA targets)
- Fast page loads (<2s for core views)
- Role-based authorization + audit logging
- Privacy and data retention controls

## 5) Suggested Architecture
- **Frontend**: React/Next.js + TypeScript + Tailwind
- **Backend**: Node.js (NestJS/Express) or Django API
- **DB**: MongoDB (Atlas or self-hosted replica set)
- **Cache/Queue**: Redis (notifications, jobs)
- **Search**: MongoDB Atlas Search first; Algolia/Meilisearch optional later
- **Storage**: S3-compatible object storage for images
- **Realtime**: WebSockets for offer updates/chat
- **Auth**: OAuth + email/password + edu verification

## 6) Core Data Models (High-Level)
- `users` (role, verification status, campus)
- `listings` (item metadata, status, offer_deadline)
- `offers` (listing_id, bidder_id, amount, status)
- `transactions` (accepted offer, payment state)
- `business_profiles` (owner_id, business metadata)
- `services` (duration, price)
- `appointments` (service_id, customer_id, datetime, status)
- `customers` (owner_id, contact + notes)
- `events` (analytics events)

## 7) Key User Flows
1. **Student Sell Flow**: verify account → create listing → receive offers → accept offer → schedule handoff → close listing.
2. **Student Buy Flow**: browse/filter → submit offer → get accepted/rejected/counter → finalize.
3. **Business Ops Flow**: create profile → define services + availability → accept bookings → track customer lifecycle + dashboard KPIs.

## 8) MVP Scope (8–12 Weeks)
- Auth + edu verification
- Listing/offer lifecycle + notifications
- Basic messaging
- Business dashboard with appointment CRUD + customer list
- Baseline analytics (bookings, revenue, conversion)
- Admin moderation tools (reports, user/listing actions)

## 9) Phased Roadmap
- **Phase 1 (MVP)**: marketplace + basic business operations
- **Phase 2**: payments/escrow, advanced analytics, calendar sync
- **Phase 3**: multi-campus expansion, referral system, premium business tools

## 10) Success Metrics
- Listings posted/week
- Offer-to-sale conversion rate
- Median time-to-sale
- Monthly active student businesses
- Appointment completion rate
- 30-day retention (buyers/sellers/business owners)

## 11) Risk & Mitigation
- **Low trust/fraud** → edu verification, report flows, moderation queue
- **No-shows** → reminders, optional deposits, reliability scores
- **Thin marketplace liquidity** → campus ambassadors + launch incentives
- **Scope creep** → strict MVP gates and phased delivery
