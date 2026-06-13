# WhatsApp Cloud API — Setup & Deployment Guide

**Platform:** i-icon Academy (`iiconacademy.in`)  
**Provider:** Meta WhatsApp Cloud API (official)  
**Purpose:** Deliver school credential notifications via WhatsApp

---

## Overview

The app uses the **Meta WhatsApp Cloud API** (not Baileys / WhatsApp Web) to send WhatsApp
notifications. This is the official, production-grade approach — no QR scanning, no session
management, just HTTP calls with a permanent access token.

Two message modes are used:

| Mode | When used | Requires |
|---|---|---|
| **Template message** | Credential delivery to new school admins (first-time outreach) | Pre-approved Meta template |
| **Text message** | General notifications (broadcasts, alerts) | Open 24-hour service window |

---

## Part 1 — Meta Business Setup

### Step 1 — Create a Meta Business Portfolio

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click **Create account** if you don't have a Business Portfolio
3. Fill in business name: **i-icon Academy**, your name, and business email
4. Complete **Business Verification** (upload GST certificate or incorporation document)
   - Basic verification is sufficient to start; full verification unlocks higher message limits

### Step 2 — Create a Developer App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **Create App**
3. Select app type: **Business**
4. Fill in:
   - App name: `iicon-academy-whatsapp`
   - App contact email: your admin email
   - Business Portfolio: select the one created in Step 1
5. Click **Create App**

### Step 3 — Add WhatsApp to the App

1. On the app dashboard, find the **Add Products** section
2. Click **Set up** next to **WhatsApp**
3. You will be taken to the WhatsApp **API Setup** page

### Step 4 — Set Up a Phone Number

> **Important:** A phone number used with the Cloud API **cannot** be simultaneously active
> on the regular WhatsApp app or WhatsApp Business app. You must deregister it from the app
> first (Settings → Account → Delete My Account or deregister from WA Business app).

**Option A — Use the free test number (development only)**

Meta provides a shared test number in the API Setup page. It can only send messages to up to
5 manually added recipient numbers. Good for testing before going live.

**Option B — Add your own business number (production)**

1. In the WhatsApp API Setup page, click **Add phone number**
2. Fill in:
   - Display name: `i-icon Academy`
   - Category: **Education**
   - Description: `EduTech platform for schools`
3. Enter the phone number and verify via OTP (SMS or voice call)
4. Once verified, the number appears in your Phone Numbers list

**Note down the Phone Number ID** — it looks like `123456789012345`. This is different from
the actual phone number and is what the API uses.

### Step 5 — Create a Permanent System User Token

The temporary token shown in the API Setup dashboard expires in **24 hours**. For production,
create a permanent token:

1. Go to [business.facebook.com/settings](https://business.facebook.com/settings)
2. In the left sidebar, click **Users → System Users**
3. Click **Add** → name it `iicon-api-user`, set role to **Admin**
4. Click **Add Assets**:
   - Asset type: **Apps**
   - Select your app (`iicon-academy-whatsapp`)
   - Enable **Full control**
   - Click **Save Changes**
5. Click **Generate New Token** on the system user:
   - Select your app
   - Token expiration: **Never**
   - Permissions to enable:
     - `whatsapp_business_messaging` (required — send messages)
     - `whatsapp_business_management` (required — manage templates/numbers)
   - Click **Generate Token**
6. **Copy and save the token immediately** — it is shown only once

**Note down:**
- The **Access Token** (long string starting with `EAAA...`)
- The **WhatsApp Business Account ID** (WABA ID) — visible on the WhatsApp API Setup page

---

## Part 2 — Message Template Setup

Template messages are required for **proactive outreach** (sending to users who have not
previously messaged your number). Credential delivery to new school admins falls into this
category and must use a template.

### Create the Credential Delivery Template

1. Go to [business.facebook.com/wa/manage/message-templates](https://business.facebook.com/wa/manage/message-templates)
   - Or: Meta Business Suite → WhatsApp Manager → Message Templates
2. Click **Create Template**
3. Fill in:
   - **Category:** `Utility`
   - **Name:** `school_account_credentials` *(lowercase, underscores only — must match env var exactly)*
   - **Language:** `English`
4. In the **Body** section, paste exactly:

```
Welcome to i-icon Academy! Your school *{{1}}* is now active.

Login credentials:
User ID: {{2}}
Password: {{3}}

You can also log in with your registered mobile number. Visit iiconacademy.in to get started.
```

Template variable mapping used by the app:
| Variable | Value |
|---|---|
| `{{1}}` | School name |
| `{{2}}` | Generated User ID (e.g. `naveen@iiconacademy.in`) |
| `{{3}}` | Generated password (e.g. `iicon2743`) |

5. Click **Submit** — Utility templates are typically approved within **a few minutes to a few hours**
6. Status changes from **Pending** → **Approved** when ready

> **Template name must exactly match** the `WHATSAPP_CREDENTIAL_TEMPLATE` environment variable.
> Default value in the app is `school_account_credentials`.

---

## Part 3 — Environment Variable Configuration

Add the following variables to your production `.env` file or Docker Compose environment:

```env
# WhatsApp Cloud API — Meta
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_API_VERSION=v20.0
WHATSAPP_CREDENTIAL_TEMPLATE=school_account_credentials
```

### Docker Compose example

In your `docker-compose.yml` under the `api` service:

```yaml
services:
  api:
    environment:
      WHATSAPP_PHONE_NUMBER_ID: "123456789012345"
      WHATSAPP_ACCESS_TOKEN: "EAAxxxxx..."
      WHATSAPP_API_VERSION: "v20.0"
      WHATSAPP_CREDENTIAL_TEMPLATE: "school_account_credentials"
```

Or reference a secrets file:

```yaml
services:
  api:
    env_file:
      - .env.production
```

### Alternative — System Settings (admin UI)

If you prefer not to use environment variables, the same credentials can be stored in the
database via the admin panel under **Settings → WhatsApp**. The fields expected are:
- `whatsapp_phone_number_id`
- `whatsapp_access_token`
- `whatsapp_api_version` (optional, defaults to `v20.0`)

Environment variables take priority over System Settings if both are set.

---

## Part 4 — Verification Checklist Before Go-Live

Work through each item before sending live messages:

- [ ] Business Portfolio created and basic verification complete
- [ ] Developer app created with WhatsApp product added
- [ ] Production phone number added and verified via OTP
- [ ] Permanent system user token generated (never-expiring)
- [ ] `school_account_credentials` template approved (status = **Approved** in Meta)
- [ ] Environment variables set in production deployment
- [ ] Test send via admin panel → Settings → WhatsApp → Test WhatsApp succeeds
- [ ] Test onboarding approval end-to-end — school admin receives WhatsApp with credentials

---

## Part 5 — Message Flow Reference

### Credential delivery (template message)

Triggered when:
- An onboarding request is approved (`PATCH /api/onboardingRequests/:id`)
- A school is created directly (`POST /api/schools`)
- A school is bulk-created (`POST /api/schools/bulk`)

WhatsApp is sent if the school has a `mobile_number` on record. The app automatically
selects the template path when `notification_type = credential_delivery`.

Log output on success:
```
[WA Cloud] Sending template "school_account_credentials" to 919550432743
[WA Cloud] Template "school_account_credentials" sent to 919550432743
```

### General notifications (text message)

Used for admin broadcasts and other in-app notifications. Requires the recipient to have
sent a message to your WhatsApp number within the last 24 hours (Meta's service window rule).

---

## Part 6 — Limits and Pricing

| Tier | Limit | How to unlock |
|---|---|---|
| Unverified business | 250 conversations / 24h | Submit business verification |
| Verified business | 1,000 conversations / 24h | Automatic after verification |
| Higher tiers | Up to unlimited | Automatic based on quality rating |

**Pricing (as of 2024):**
- Utility conversations (credential delivery): ~₹0.30–₹0.40 per conversation
- A "conversation" = all messages exchanged within a 24-hour window
- First 1,000 conversations per month are free for new accounts

Full pricing: [developers.facebook.com/docs/whatsapp/pricing](https://developers.facebook.com/docs/whatsapp/pricing)

---

## Part 7 — Troubleshooting

### Message not received

1. Check logs for `[WA Cloud] API error:` — the Meta error message will explain the issue
2. Common errors:

| Error | Cause | Fix |
|---|---|---|
| `131030` — Template not approved | Template still pending or rejected | Wait for approval or fix template content |
| `131047` — Re-engagement message | Sending text to user outside 24h window | Use template instead |
| `131026` — Recipient not on WhatsApp | Phone number has no WhatsApp account | Verify the number |
| `190` — Invalid access token | Token expired or revoked | Re-generate system user token |
| `100` — Invalid phone number ID | Wrong `WHATSAPP_PHONE_NUMBER_ID` | Double-check the ID in Meta dashboard |

### Template rejected by Meta

Common rejection reasons:
- Variable placeholders not matching actual content (e.g. using `{{1}}` for a URL)
- Template category mismatch (credential delivery = Utility, not Marketing)
- Content that looks promotional — keep the template factual and functional

Resubmit after editing. Template names cannot be reused after rejection — append a version
suffix (e.g. `school_account_credentials_v2`), update `WHATSAPP_CREDENTIAL_TEMPLATE` accordingly.

### Check configuration status

```
GET /api/whatsapp/status
```

Returns:
```json
{
  "provider": "whatsapp_cloud_api",
  "configured": true,
  "phoneNumberId": "123456789012345",
  "source": "env"
}
```

If `configured: false`, credentials are missing from both env and System Settings.

---

## Useful Links

- Meta for Developers — WhatsApp: https://developers.facebook.com/docs/whatsapp
- Cloud API reference: https://developers.facebook.com/docs/whatsapp/cloud-api
- Message Templates guide: https://developers.facebook.com/docs/whatsapp/message-templates
- Business Manager: https://business.facebook.com/settings
- WhatsApp Manager (templates): https://business.facebook.com/wa/manage/message-templates
- Pricing: https://developers.facebook.com/docs/whatsapp/pricing
