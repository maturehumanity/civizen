---
title: Public Market Jobs
status: current
canonical: true
last_reviewed: 2026-08-16
---

# Public Market Jobs

First public participation surface: **Market > Jobs** (`/market?section=jobs`) is open without an account.

## What is public

- Anyone can open Market > Jobs.
- Worker / Employer toggle is visible to guests.
- Anyone can post looking-for-work or a job opening from the sentence form.
- Anyone can browse **Available work** (employer posts) or **Available workers** (seeker posts).
- Public rows show job type, place, age, pay, a public name, and a **masked** phone. Employer company names stay dotted until unlocked.

## What stays locked

- Full names, company names, and phone numbers are not in the public listing RPC.
- Unlocking contact details requires sign-in. There is **no paid unlock**.
- Sell, Saved, Agreements, and prototype credits remain member-only.
- `/market/taxonomy` stays protected.

## Privacy

- `list_public_market_job_listings` returns sanitized rows only.
- `unlock_market_job_contact` is authenticated.
- Anonymous inserts must leave `user_id` and `profile_id` null.

## Product notes

- This is the first step toward open public involvement, not a CareerCenter clone.
- Civizen style: existing sentence form, outlined identity fields, known profile values stay hidden for signed-in members.
- Work Fulfillment and Contribute Opportunities stay distinct from Jobs.
