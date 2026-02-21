# PagesPlan.md

## Overview
This document outlines feature plans and ideas for each page in the current QuadCommerce app.

---

## 1) Login Page (`/login`)
### Core Features
- Email + password login form
- Input validation + error states
- Remember session token in local storage
- Redirect to dashboard after successful login

### Product Ideas
- “Continue with school SSO” (Google/Microsoft campus auth)
- Device/session history (“where you’re logged in”)
- Password reset flow
- Suspicious login detection alerts

### UX Enhancements
- Friendly onboarding copy
- Inline error highlighting
- Loading spinner on submit

---

## 2) Registration Page (`/register`)
### Core Features
- Name, school email, password, role selection
- `.edu` domain enforcement
- Create account + auto-login

### Product Ideas
- Verify via emailed one-time code
- Campus selection from known schools
- Profile completion checklist after sign-up

### UX Enhancements
- Password strength meter
- “Why .edu is required” tooltip
- Terms/privacy acceptance checkbox

---

## 3) Dashboard Page (`/`)
### Core Features
- Overview cards (listings, offers, appointments)
- Quick health snapshot of user activity

### Product Ideas
- Personalized feed: trending listings + service recommendations
- Activity timeline (latest offers, bookings, messages)
- Alerts center (expiring offer windows, upcoming appointments)

### UX Enhancements
- Drill-down from cards to filtered views
- Date range filters (today/week/month)

---

## 4) Profile Page (`/profile`)
### Core Features
- View/edit name and account role
- Show verified school email status
- Persist profile changes

### Product Ideas
- Profile photo + short bio
- Campus and graduation year
- Trust score/reputation and completed transactions
- Notification preferences by channel

### UX Enhancements
- Save confirmation toasts
- Unsaved changes warning

---

## 5) Services Page (`/services`)
### Core Features
- Business owner: create and view services
- Student: browse services and book appointment
- View appointment list and statuses

### Product Ideas
- Service categories + search/filter
- Calendar availability slots
- Reschedule/cancel policies
- Service packages/bundles and promo codes

### UX Enhancements
- Calendar-style booking UI
- Service cards with richer metadata (duration, rating, provider)
- Empty-state guidance by role

---

## 6) Chats Page (`/chats`)
### Core Features
- Shared realtime chat feed
- Send/receive messages instantly via sockets

### Product Ideas
- Direct messages between buyer/seller or student/business
- Per-listing chat threads
- Typing indicators + read receipts
- Moderation/report message actions

### UX Enhancements
- Message grouping by sender/time
- Sticky compose box + quick emoji actions

---

## 7) Sell Products Page (`/sell`)
### Core Features
- Create listing for reverse auction items
- Place offers on open listings
- Accept offer to mark listing as sold
- Live updates for listing state

### Product Ideas
- Listing photos + condition scale
- Offer expiration countdown timers
- Auto-accept thresholds and reserve prices
- Meet-up scheduling and transaction confirmation

### UX Enhancements
- Better listing cards with status chips
- Offer ranking visuals
- Seller action drawer for accept/reject/counter

---

## Cross-Page Platform Ideas
- Unified notifications center
- Role-aware navigation and permissions
- Activity audit trail
- Basic admin moderation panel
- Search across listings, services, and users

## Suggested MVP Priority (Next Iteration)
1. Login/Register hardening (reset password + email code)
2. Sell page feature depth (photos, countdowns, better offer controls)
3. Services scheduling UX (availability slots + rescheduling)
4. Chat threading by listing/service context
5. Dashboard feed and actionable alerts
