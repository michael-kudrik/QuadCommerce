# Web App Design Plan — Page-by-Page Product Blueprint

## Scope
This document defines an explicit page overview for the current app and lists **5 concrete feature ideas per page**.

---

## 1) Login Page (`/login`)
### What this page contains
- Centered auth card
- Email input
- Password input
- Login CTA button
- Error/validation state area
- Link to registration page

### 5 feature ideas
1. **Campus SSO button set** (Google/Microsoft) with fallback to email/password.
2. **Magic-link option** (email one-time login link).
3. **“Remember this device”** with session duration controls.
4. **Security notices** (last failed login, suspicious login warning).
5. **Account recovery entrypoint** (Forgot password + reset flow).

---

## 2) Registration Page (`/register`)
### What this page contains
- Name input
- School email input (`.edu` enforced)
- Password input
- Role selector (Student / Business Owner)
- Register CTA
- Inline validation and status messaging

### 5 feature ideas
1. **Email verification code flow** after registration (OTP with resend timer).
2. **School auto-detection** from `.edu` domain and campus assignment.
3. **Password strength meter** + requirement checklist.
4. **Onboarding role wizard** (student buyer/seller vs business owner setup).
5. **Invite/referral code field** for launch growth campaigns.

---

## 3) Dashboard Page (`/`)
### What this page contains
- KPI summary chips/cards (listings, offers, appointments)
- Personal activity summary
- Quick links into major sections

### 5 feature ideas
1. **Action feed**: latest offers, accepted bids, booked appointments.
2. **Urgency panel**: expiring listings and upcoming bookings in next 24h.
3. **Role-based dashboard variants** (student vs business owner).
4. **Weekly performance snapshot** (conversion, acceptance rate, no-shows).
5. **Pinned shortcuts** (user chooses their top 3 actions).

---

## 4) Profile Page (`/profile`)
### What this page contains
- Display/edit name
- Display school email and verification badge
- Role display/edit
- Save profile action

### 5 feature ideas
1. **Profile completion meter** (photo, bio, campus, contact preference).
2. **Trust/reputation score** with transaction history and badges.
3. **Notification preferences** (email/in-app toggles).
4. **Privacy controls** (who can message/view profile).
5. **Account settings** (change password, deactivate account, data export).

---

## 5) Services Page (`/services`)
### What this page contains
- Service list for business owners
- Service creation form (name, description, duration, price)
- Student-facing booking controls
- Appointment list/status section

### 5 feature ideas
1. **Calendar availability editor** (time slots, blackout dates).
2. **Service management table** with edit/duplicate/archive controls.
3. **Service discovery filters** (category, price range, duration).
4. **Booking flow with confirmations** and cancellation policy previews.
5. **Customer insights panel** (repeat clients, top services, conversion rate).

---

## 6) Chats Page (`/chats`)
### What this page contains
- Realtime messaging interface
- Message list/timeline
- Message composer box
- Sent/received updates via sockets

### 5 feature ideas
1. **Instagram-style desktop layout**: left conversation menu + right active thread panel.
2. **Conversation categories** (Marketplace, Services, Support) in left rail.
3. **Search + unread filters** in conversation menu.
4. **Thread context cards** (linked listing/service at top of chat).
5. **Message actions** (react, reply, report, pin).

### Target UI pattern (your explicit request)
Implement this page like Instagram desktop:
- **Left column:** conversation list, avatars, last message preview, unread badges.
- **Top of right column:** active chat header (name + context).
- **Main right area:** scrollable message thread.
- **Bottom right:** sticky composer with send action.

---

## 7) Sell Products Page (`/sell`)
### What this page contains
- Listing creation form (title, description, category, offer window)
- Listing cards with current status
- Offer submission flow
- Seller controls to accept winning offer

### 5 feature ideas
1. **Photo upload + condition grading** (new/like-new/good/fair).
2. **Offer timer countdown** with urgency color states.
3. **Reserve price + auto-accept rules** for sellers.
4. **Counter-offer support** for negotiation.
5. **Handoff workflow** (meetup scheduling + completion confirmation).

---

## Navigation & IA Recommendations
- Keep top nav for global movement.
- Add role-aware nav visibility (student vs business owner).
- Add notification bell with cross-page alerts.
- Add quick-create button (new listing/service) in header.

## Priority Build Order (Recommended)
1. Chats layout redesign (Instagram-style split view)
2. Sell page reverse-auction depth (timer, reserve/counter)
3. Services booking UX + availability
4. Dashboard alerting and role-based summaries
5. Profile security and preference controls
