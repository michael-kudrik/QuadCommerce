# BE-003 Compatibility Notes (Marketplace bidding identity)

## What changed

- `POST /api/listings/:id/offers` now requires authentication (`Authorization: Bearer <token>`).
- Server now **ignores `bidderName` from client payload** and always stores bidder identity using the authenticated user (`user.name`).
- Seller is blocked from bidding on own listing.

## Route stability

- Route path and HTTP method are unchanged: `POST /api/listings/:id/offers`.
- Existing payload shape remains accepted for backward compatibility:
  - `amount` is required.
  - `bidderName` is tolerated but ignored.

## Frontend impact

- Frontend should send auth token on bid requests.
- Frontend should stop asking user to type bidder name (optional now; ignored by API anyway).

## Error behavior

- Unauthenticated request: `401 Unauthorized`.
- Seller bidding on own listing: `403` with message `Sellers cannot bid on their own listing`.
