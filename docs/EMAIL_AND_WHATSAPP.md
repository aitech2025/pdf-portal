# Email + WhatsApp Notifications — Setup Guide

This document covers how to enable outbound **email** (Hostinger SMTP) and **WhatsApp** (Meta Cloud API) notifications for i-icon Academy.

Notifications fan out to three channels:

1. **In-app** — always created in MongoDB and pushed live to the recipient's bell icon over WebSocket. Works out of the box, no config required.
2. **Email** — Nodemailer over SMTP. Configured live from the admin Settings UI.
3. **WhatsApp** — Meta Cloud API (recommended), WAHA, or a custom HTTP gateway. Configured live from the admin Settings UI.

Configuration precedence is **DB → env → mock**. The runtime reads `SystemSettings` first (so platform admins can change SMTP/WhatsApp credentials from the UI with zero restart), falls back to `docker-compose.yml` env vars for bootstrap, and finally logs to stdout in "mock mode" when neither is set.

---

## 1. Email — Hostinger SMTP

Hostinger gives every paid email account a working SMTP server. No domain DNS gymnastics required — Hostinger already runs your mail.

### 1.1 Pre-requisites

| Requirement | Where |
| ----------- | ----- |
| A Hostinger Email or Business plan with at least one mailbox | hPanel → **Emails** → Create email account |
| The mailbox email + password | Note both before continuing |
| Outbound port 465 reachable from the API container | Hostinger Cloud allows this; AWS / GCP / Azure may not |

### 1.2 Connection details

| Field | Value |
| ----- | ----- |
| SMTP Host | `smtp.hostinger.com` |
| SMTP Port | `465` |
| Encryption | SSL (TLS for port 587 also works) |
| Username | Full email address (e.g. `noreply@yourdomain.com`) |
| Password | The mailbox password from hPanel |
| From Address | Same as the username |
| From Name | Anything (e.g. `i-icon Academy`) |

### 1.3 Steps (admin UI)

1. Log in as platform admin → **Settings → Email Configuration**.
2. Click the **Hostinger Email** preset under *Quick Presets*. Host, port, SSL, TLS are filled in.
3. Enter the **SMTP Username** (the full Hostinger mailbox address).
4. Enter the **SMTP Password**.
5. Set **From Address** (must match the username — Hostinger rejects spoofed sender addresses) and **From Name**.
6. Click **Save Changes**.
7. Click **Send Test Email** → enter your personal email → look for the test message within 30 seconds.

### 1.4 Steps (env var bootstrap, optional)

If you want emails to work *before* the admin has logged in to fill in the form (e.g. so the very first welcome email after seeding goes out), put the same values in your repo `.env`:

```ini
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USERNAME=noreply@yourdomain.com
SMTP_PASSWORD=your-mailbox-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=i-icon Academy
APP_BASE_URL=https://yourdomain.com
```

Then `docker compose up -d --build api`.

DB values **override** env values once an admin saves them in the UI.

### 1.5 Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `EAUTH: Invalid login` | Double-check the password. Hostinger does *not* use OAuth — it's the mailbox password from hPanel. |
| `ETIMEDOUT` on port 465 | Your hosting provider is blocking outbound port 465. Try 587 with TLS instead, or open a ticket. |
| Emails delivered but in spam | Add your domain in Hostinger hPanel → Emails → SPF / DKIM and make sure both are green. |
| `SSL routines:wrong version number` | You enabled SSL on port 587. Either flip to port 465 *or* disable SSL and enable TLS. |
| Test button reports "ok" but the email never arrives | Check the `api` container logs (`docker compose logs api`) for `[EMAIL]` lines. The transport may have queued the message even though SMTP accepted it. |

---

## 2. WhatsApp — Meta Cloud API

WhatsApp Cloud API is Meta's hosted offering — you don't run an MTA, you just hit a REST endpoint. It is the **recommended** path for any new project.

### 2.1 Pre-requisites

| Requirement | Where |
| ----------- | ----- |
| Meta for Developers account | https://developers.facebook.com |
| A Meta App with the **WhatsApp Business Platform** product enabled | App dashboard → Add product → WhatsApp |
| A registered phone number (Meta provisions a test number free for sandbox use) | App → WhatsApp → API setup |
| A **permanent system-user access token** (not the 24-hour test token!) | Meta Business Manager → System Users |
| At least one **approved message template** for messages outside the 24-hour service window | App → WhatsApp → Message Templates |

### 2.2 Connection details

| Field | Where to find it |
| ----- | ---------------- |
| Phone Number ID | App → WhatsApp → API setup → **Phone number ID** |
| Access Token | Business Manager → System Users → your system user → Generate Token. Pick `whatsapp_business_messaging` + `whatsapp_business_management`. Set expiration to **Never**. |
| Template Name | App → WhatsApp → Message Templates → the template name (e.g. `credential_delivery`) |
| Template Language | Match the template's language code (e.g. `en_US`) |
| API Version | Default `v22.0` is correct as of 2026 |

### 2.3 Steps (admin UI)

1. Log in as platform admin → **Settings → WhatsApp Configuration**.
2. Toggle **Enable WhatsApp Notifications** on.
3. Choose Provider: **WhatsApp Cloud API (Meta) — recommended**.
4. Fill in **Phone Number ID** and **Access Token** (the token is masked in the UI).
5. (Optional but recommended for production) Fill in **Default Template Name** and **Template Language**. Without a template, you can only send messages inside Meta's 24-hour customer service window — fine for testing but not for cold credential delivery.
6. Click **Save Changes**.
7. Enter a test phone number (E.164 format with `+`, e.g. `+919876543210`) in *Test Connection*. While in Meta sandbox mode the number must be on your verified recipient list.
8. Click **Send Test Message**.

### 2.4 Creating a template for credential delivery

Meta requires templates for any message sent outside the 24-hour service window. The simplest template that works for our credential/reset/onboarding messages:

1. Meta App → WhatsApp → **Message Templates** → **Create Template**.
2. Category: `UTILITY` (account-related messaging — not marketing).
3. Name: `credential_delivery` (must be lowercase, snake_case).
4. Language: `English (en_US)`.
5. Body:
   ```
   {{1}}
   ```
   (i-icon Academy substitutes the full message as the first parameter — this gives one template that works for any of our notification types.)
6. Submit and wait for approval (~5 minutes to 24 hours).
7. Once **Approved**, copy the template **name** (`credential_delivery`) into the admin UI's *Default Template Name* field.

### 2.5 Verifying delivery

| Channel | Where |
| ------- | ----- |
| In-app | Recipient's bell icon (`GET /api/notifications`) |
| WhatsApp | Recipient's WhatsApp inbox |
| Meta dashboard | App → WhatsApp → Insights → recent messages |
| API logs | `docker compose logs api \| grep -i whatsapp` |

### 2.6 Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `Meta Cloud API 401: ...invalid OAuth access token` | Token expired. Generate a new permanent token in Business Manager → System Users. |
| `Meta Cloud API 400: ...Template does not exist in en_US` | Template name typo or wrong language. Check the exact name in App → WhatsApp → Message Templates. |
| `Meta Cloud API 131056: ...Recipient phone number not in allowed list` | You're in Meta sandbox mode. Add the test recipient under App → WhatsApp → API setup. |
| `Meta Cloud API 131047: ...Re-engagement message` | Message sent outside the 24-hour service window without a template. Configure *Default Template Name*. |
| Test reports success but message never arrives | Confirm the recipient's number is reachable on WhatsApp (search for it on your phone) and check Meta Insights. |

---

## 3. In-app notifications

Always work, always persisted, always pushed live. No setup required.

### 3.1 What's covered

Every helper that calls `createAndSendNotification(...)` automatically creates an in-app notification record. Today that includes:

| Event | Type | Channels |
| ----- | ---- | -------- |
| School onboarding (admin creates a school) | `credential_delivery` | in-app + email + WhatsApp (if mobile) |
| Bulk school import | `credential_delivery` | in-app + email + WhatsApp (if mobile) |
| User creation (admin invites a school user) | `credential_delivery` | in-app + email + WhatsApp (if mobile) |
| Admin-triggered password reset (`POST /api/users/:id/reset-password`) | `credential_delivery` | in-app + the channel(s) specified by `sendVia` |
| Self-service forgot password (`POST /api/auth/forgot-password`) | `password_reset` | in-app + email + WhatsApp (if mobile) |
| Successful password reset confirmation | `password_reset_confirmed` | in-app + email |
| Self-service password change confirmation | `password_changed` | in-app + email |
| Broadcast messages from admin | (from broadcast UI) | in-app + selected channels |
| Test buttons (admin Settings) | `configuration_test` | the channel being tested |

### 3.2 Where users see them

- Web: the bell icon top-right of the header. Unread count and full drawer.
- Mobile: same bell icon on the wrapped React app.
- API: `GET /api/notifications` (paged, filterable by `read=false` / `type=...`).

### 3.3 Where admins see delivery results

`Notification` records carry a `status` field (`sent` / `pending` / `failed`) and an `error_message` when external delivery failed. The **Admin → Notifications** page lists everything with filters by status, type, and recipient.

---

## 4. Architecture cheat-sheet

```
                       ┌──────────────────────────┐
                       │  routes/auth.ts          │
                       │  routes/schools.ts       │  call
                       │  routes/users.ts         │  createAndSendNotification
                       │  routes/maintenance.ts   │  (channels: [...])
                       └──────────┬───────────────┘
                                  ▼
                ┌──────────────────────────────────────┐
                │  services/notificationChannels.ts    │
                │                                       │
                │  1. loadEmailConfig()   ──► DB → env  │
                │  2. loadWhatsAppConfig()─► DB → env  │
                │  3. sendEmail()         ──► nodemailer│
                │  4. sendWhatsApp()      ──► Cloud API │
                │                              / WAHA  │
                │                              / custom │
                │  5. ALWAYS persist Notification doc  │
                │  6. ALWAYS push WebSocket bell event │
                └──────────────────────────────────────┘
                                  │
                ┌─────────────────┼────────────────┐
                ▼                 ▼                ▼
            MongoDB           SMTP server      WhatsApp
        Notification doc  (Hostinger / SES   (Meta Cloud API
                          / Mailgun / ...)    / WAHA / custom)
                │
                ▼
           WebSocket push to recipient ──► bell icon update
```

### 4.1 Config precedence

```
1.  SystemSettings document in MongoDB
    └─ smtp_host / smtp_port / smtp_username / smtp_password / email_from_*
    └─ integrations.whatsapp.{enabled, provider, phoneNumberId, accessToken, ...}

2.  Environment variables (docker-compose.yml / .env)
    └─ SMTP_HOST / SMTP_PORT / SMTP_USERNAME / SMTP_PASSWORD / SMTP_FROM_*
    └─ WHATSAPP_API_URL / WHATSAPP_API_KEY / WHATSAPP_FROM_NUMBER (custom gateway only)

3.  Mock mode — logs to stdout, never blocks the request
```

DB always wins. Saving an empty value in the admin UI **does** override env — set the value back to non-empty if you want env to take over again, or clear the DB row entirely.

---

## 5. Related documents

- [`MOBILE_TESTING.md`](./MOBILE_TESTING.md) — test scenarios that exercise these channels on mobile
- [`DOCUMENTATION.md`](./DOCUMENTATION.md) — full system overview
- [`MOBILE.md`](./MOBILE.md) — mobile build pipeline
