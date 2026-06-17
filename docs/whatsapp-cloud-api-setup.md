# WhatsApp Cloud API — Complete Setup & Deployment Guide

**Platform:** i-icon Academy (`iiconacademy.in`)  
**Provider:** Meta WhatsApp Cloud API (official, production-grade)  
**Last validated:** June 2026  

---

## Overview

i-icon Academy delivers school credential notifications via the **Meta WhatsApp Cloud API** —
the official HTTP-based API that requires no QR scanning or session management. All delivery
is via a permanent system-user access token and pre-approved message templates.

### Two send modes

| Mode | When used | Requires |
|---|---|---|
| **Template message** | Credential delivery to new school admins (proactive, first-time outreach) | Pre-approved Meta template in **Approved** status |
| **Text message** | General broadcasts and admin alerts | Recipient must have messaged your number within the last **24 hours** |

Credential delivery **always** uses the template path because new school admins have never
messaged the number before. If the template path fails (wrong language code, template not
approved, etc.) the code falls through to `sendWhatsAppText()` which will also fail for the
same users — so template correctness is critical.

---

## Architecture: How the App Sends Messages

```
POST /api/schools          ─┐
POST /api/onboardingRequests─┤ (approval)  → createAndSendNotification({ type: "credential_delivery" })
POST /api/users            ─┘                       │
                                                     ▼
                                          notificationChannels.ts: sendWhatsApp()
                                                     │
                                          Parse message text for template params
                                          (school name, User ID — password goes via email only)
                                                     │
                                          sendWhatsAppTemplate(phone, templateName, [school, userId])
                                                     │
                                          POST https://graph.facebook.com/v20.0/{phoneNumberId}/messages
                                                     │
                                          Meta Cloud API ──► Recipient's WhatsApp
```

### Message format requirements

The `sendWhatsApp()` function in `notificationChannels.ts` extracts template parameters
by parsing the plaintext `message` string. The message **must** contain these exact patterns:

| Template variable | Regex used | Required text pattern |
|---|---|---|
| `{{1}}` school name | `/school "([^"]+)"/i` or `/school \*([^*]+)\*/i` | `school "ABC School"` or `school *ABC School*` |
| `{{2}}` User ID | `/User ID:\s*(\S+)/i` | `User ID: admin@school.in` |
| `{{3}}` password | `/Password:\s*(\S+)/i` | `Password: abc123` |

If `{{2}}` or `{{3}}` cannot be parsed, the code silently falls back to `sendWhatsAppText()`,
which fails for new users. Check server logs for `[WHATSAPP] Template delivery failed` to
detect this.

---

## Part 1 — Meta Business Account Setup

### Step 1.1 — Create a Meta Business Portfolio

1. Go to **[business.facebook.com](https://business.facebook.com)**
2. Click **Create account** (top right)
3. Fill in:
   - **Business name:** `i-icon Academy`
   - **Your name:** your full name
   - **Business email:** your official email (e.g. `admin@iiconacademy.in`)
4. Follow the email verification prompt
5. Complete your **Business Portfolio settings** — add an address, website (`iiconacademy.in`), and phone number. This is required for Business Verification.

### Step 1.2 — Submit Business Verification (Important)

Without verification your account is limited to **250 conversations / 24 hours** and
cannot send to numbers outside your test recipients list.

1. In Business Portfolio → **Settings** → left sidebar → **Business info**
2. Scroll to **Business verification** → click **Start verification**
3. Upload one of:
   - GST registration certificate
   - Certificate of Incorporation
   - Business PAN card
4. Verification usually completes within **1–3 business days**

> **You can proceed with setup before verification is complete**, but WhatsApp messages
> won't reach real recipients until verification passes.

---

## Part 2 — Create the Developer App

### Step 2.1 — Create a New App

1. Go to **[developers.facebook.com/apps](https://developers.facebook.com/apps)**
2. Click **Create App** (top right)
3. On the "What do you want your app to do?" screen → select **Other** → click **Next**
4. Select app type → **Business** → click **Next**
5. Fill in:
   - **App name:** `iicon-academy-whatsapp`
   - **App contact email:** your admin email
   - **Business Portfolio:** select the portfolio created in Step 1.1
6. Click **Create App** — you may be prompted for your Facebook password

### Step 2.2 — Add the WhatsApp Product

1. On the App Dashboard, scroll down to **Add products to your app**
2. Find **WhatsApp** → click **Set up**
3. You are now on the **WhatsApp** → **API Setup** page
4. Under **Step 1: Select a recipient phone number**, Meta shows a **test phone number** and lets you add up to 5 test recipients. Use this for development.

---

## Part 3 — Register a Production Phone Number

> **Critical:** A phone number registered with the Cloud API **cannot** be simultaneously
> active on the regular WhatsApp app or WhatsApp Business app. You must fully deregister
> it from any device first.
>
> **To deregister from WhatsApp Business App:**
> Open the app → Settings → Account → Delete My Account
> (or: Settings → Account → Request Account Info, wait, then delete)
>
> After deregistration, the SIM can be used with the Cloud API.

### Step 3.1 — Add Your Business Number

1. On the **WhatsApp → API Setup** page, click **Add phone number** (under Step 5)
2. Fill in:
   - **Display name:** `i-icon Academy` *(this appears in the recipient's chat header)*
   - **Category:** `Education`
   - **Description:** `IIT Foundation and JEE preparation platform for schools`
3. Click **Next**
4. Enter your phone number (with country code, e.g. `+91 9550432743`)
5. Choose verification method: **SMS** or **Voice call**
6. Enter the OTP received — number is now registered

### Step 3.2 — Note the Phone Number ID

After registration:
1. Go to **WhatsApp → API Setup** → scroll to **Step 5**
2. Under the phone number dropdown, you will see a **Phone Number ID** — it looks like `123456789012345`
3. **This is NOT the phone number itself** — it is the internal Meta identifier used in all API calls
4. Copy and save this ID

---

## Part 4 — Generate a Permanent System User Access Token

The **temporary token** shown on the API Setup page expires in **24 hours**. For production
you must create a permanent token via a System User. This is a service account — not a real
Meta user — that the API calls authenticate as.

### Step 4.1 — Create the System User

1. Go to **[business.facebook.com/settings](https://business.facebook.com/settings)**
2. In the left sidebar, under **Users**, click **System users**
3. Click **Add** (top right)
4. Fill in:
   - **System username:** `iicon-api-user`
   - **System user role:** **Admin**
5. Click **Create system user**

### Step 4.2 — Assign Assets to the System User

1. On the System Users page, click the `iicon-api-user` row
2. Click **Add assets** button (top right)
3. In the dialog:
   - **Asset type:** Apps
   - Select your app `iicon-academy-whatsapp`
   - Toggle **Full control** to ON
4. Click **Save changes**

Also assign the WhatsApp Business Account:
1. Click **Add assets** again
2. **Asset type:** WhatsApp accounts
3. Select your WhatsApp Business Account (WABA)
4. Toggle **Full control** to ON
5. Click **Save changes**

### Step 4.3 — Generate the Token

1. Still on `iicon-api-user`, click **Generate new token** button
2. In the dialog:
   - **Select app:** `iicon-academy-whatsapp`
   - **Token expiration:** **Never** ← must be this for production
   - Permissions — enable **all of the following** (scroll through the list):
     - ✅ `whatsapp_business_messaging` — send and receive messages
     - ✅ `whatsapp_business_management` — manage templates, phone numbers
     - ✅ `business_management` — required for WABA access
3. Click **Generate token**
4. **IMPORTANT: Copy the token immediately.** It will NOT be shown again.
   - The token starts with `EAAA...` and is ~250 characters long
   - Store it in your password manager or secrets vault

### Step 4.4 — Note the WhatsApp Business Account ID

On the **WhatsApp → API Setup** page, under Step 2, you will see the **WhatsApp Business
Account ID** (WABA ID). This is used when creating templates. It looks like `123456789012345`
(different from the Phone Number ID).

---

## Part 5 — Create the Credential Delivery Message Template

Templates must be pre-approved by Meta before they can be sent. The credential delivery
template is a **Utility** category template used to send login credentials to new school
admins.

### Step 5.1 — Open the Template Manager

1. Go to **[business.facebook.com/wa/manage/message-templates](https://business.facebook.com/wa/manage/message-templates)**
   - Alternative path: Meta Business Suite → left sidebar → **WhatsApp Manager** → **Message Templates**
2. Make sure the correct **WhatsApp Business Account** is selected in the top dropdown

### Step 5.2 — Create the Template

1. Click **Create template** (top right, blue button)
2. On the first screen:
   - **Category:** `Utility`
   - **Name:** `school_account` ← must be lowercase, underscores only, no spaces
   - **Language:** `English (en_US)` ← see note below
3. Click **Continue**

> **Language code critical note:**
> When you select **"English"** in the dropdown, Meta internally registers this as `en_US`.
> The app's API calls send `languageCode = "en_US"`. These **must match exactly**.
> If you see error `132000: Template name does not exist in the language` in server logs,
> the language codes do not match — check what code Meta shows on the template detail page
> and update `WHATSAPP_LANGUAGE_CODE` env var (or the default in `whatsappCloudApi.ts`).

### Step 5.3 — Write the Template Body

On the template editor screen, you will see sections: Header (optional), Body, Footer (optional), Buttons (optional).

**Leave Header and Footer empty** for this template.

In the **Body** text area, paste the template body exactly as registered in Meta:

```
iicon academy
Hello {{1}},

Your account has been created successfully at iicon academy.

{{2}}
{{3}}

Regards, 
iicon academy
```

Three variables:
- `{{1}}` = school name
- `{{2}}` = user ID (generated login email)
- `{{3}}` = password/access (generated password)

Under the body text, click **Add sample** — Meta requires sample content for each variable:

| Variable | Sample value |
|---|---|
| `{{1}}` | `Delhi Public School` |
| `{{2}}` | `admin@dps.iiconacademy.in` |
| `{{3}}` | `DPS@iicon2024` |

### Step 5.4 — Submit for Review

1. Click **Submit** (bottom right)
2. Status will show as **Pending** — Utility templates are typically reviewed in minutes to a few hours
3. Refresh the template list; when status changes to **Approved** ✅ the template is live
4. If status shows **Rejected**, see troubleshooting section below

### Template variable mapping (what the app sends)

| Variable | Source | Regex used to extract |
|---|---|---|
| `{{1}}` school name | School name from notification message | `school "([^"]+)"` |
| `{{2}}` User ID | Generated login email | `User ID:\s*(\S+)` |
| `{{3}}` password | Generated password | `Password:\s*(\S+)` |

---

## Part 5B — Content Upload Notification Template

Whenever a PDF is uploaded and approved, all school admins whose school has access to that program receive a WhatsApp notification. This requires a second pre-approved template.

### Template details

| Field | Value |
|---|---|
| Category | `Utility` |
| Name | `new_content_notification` |
| Language | `English (en_US)` |

**Body:**
```
New content has been added to i-icon Academy.

Content: {{1}}
Program: {{2}}

Log in to view the latest material.
```

**Button:**
| Field | Value |
|---|---|
| Button type | `Visit website` |
| Button text | `View Content` |
| URL type | `Static` |
| Website URL | `https://iiconacademy.in` |

**Sample values:**
| Variable | Sample |
|---|---|
| `{{1}}` | `Physics Chapter 5 - Laws of Motion` |
| `{{2}}` | `CBSE` |

### Variable mapping

| Variable | Source |
|---|---|
| `{{1}}` content title | PDF file name from the upload |
| `{{2}}` program name | Program the PDF was uploaded to |

The app (`notificationChannels.ts`) parses these from the notification message using:
- `{{1}}`: regex `/PDF "([^"]+)"/i`
- `{{2}}`: regex `/to the (.+?) program/i`

### When this fires

Automatically triggered when:
- A PDF is uploaded with `status: "approved"` (platform admins upload as approved by default)
- The program (`category_id`) has at least one school assigned via `SchoolCategoryAccess`

School admins with `school_admin` or `school` role, who are active, and whose school has access to that program all receive the notification simultaneously via WhatsApp + email + in-app.

---

## Part 5C — Broadcast Announcement Template

Used when a platform admin sends a broadcast via **Broadcast → WhatsApp** from the admin panel. Because school admins have not initiated a conversation with the business number, free-text messages cannot be sent to them. A single-variable template wraps the admin's composed message.

### Template details

| Field | Value |
|---|---|
| Category | `Utility` |
| Name | `broadcast_announcement` |
| Language | `English (en_US)` |

**Body:**
```
Message from i-icon Academy:

{{1}}

— i-icon Academy team
```

**Sample for `{{1}}`:** `Scheduled maintenance on 20th June from 11 PM to 1 AM. The portal will be unavailable during this time.`

No button needed (broadcast messages are informational).

### How it works

The admin composes the message in the Broadcast screen. When WhatsApp is selected as a channel, the app passes the full composed message as `{{1}}` to this template. Recipients receive it formatted as above.

---

## Part 6 — Environment Variable Configuration

### In `.env` / `.env.production`

```env
# WhatsApp Cloud API — Meta
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_API_VERSION=v20.0
WHATSAPP_CREDENTIAL_TEMPLATE=school_account
WHATSAPP_NEW_CONTENT_TEMPLATE=new_content_notification
WHATSAPP_BROADCAST_TEMPLATE=broadcast_announcement
```

Replace the placeholder values:
- `WHATSAPP_PHONE_NUMBER_ID` — the Phone Number ID from Step 3.2 (not the phone number itself)
- `WHATSAPP_ACCESS_TOKEN` — the permanent system user token from Step 4.3
- `WHATSAPP_API_VERSION` — keep as `v20.0` unless Meta releases a newer required version
- `WHATSAPP_CREDENTIAL_TEMPLATE` — template name from Part 5 (registered as `school_account`)
- `WHATSAPP_NEW_CONTENT_TEMPLATE` — template name from Part 5B (registered as `new_content_notification`)
- `WHATSAPP_BROADCAST_TEMPLATE` — template name from Part 5C (registered as `broadcast_announcement`)

### Docker Compose

```yaml
services:
  api:
    environment:
      WHATSAPP_PHONE_NUMBER_ID: "123456789012345"
      WHATSAPP_ACCESS_TOKEN: "EAAxxxxx..."
      WHATSAPP_API_VERSION: "v20.0"
      WHATSAPP_CREDENTIAL_TEMPLATE: "school_account_credentials"
```

Or using a secrets file:

```yaml
services:
  api:
    env_file:
      - .env.production
```

### Alternative — Admin UI System Settings

The same credentials can be configured from the admin panel (**Settings → WhatsApp**) and
are stored in MongoDB `system_settings`. The DB fields are:
- `whatsapp_phone_number_id`
- `whatsapp_access_token`
- `whatsapp_api_version` (optional, defaults to `v20.0`)

Environment variables take priority over database settings when both are present.

---

## Part 7 — Verification and Testing

### Step 7.1 — Check Configuration Status

```
GET /api/whatsapp/status
Authorization: Bearer <admin_token>
```

Expected response when configured:
```json
{
  "provider": "whatsapp_cloud_api",
  "configured": true,
  "phoneNumberId": "123456789012345",
  "source": "env"
}
```

If `"configured": false`, credentials are missing from both env and System Settings.

### Step 7.2 — Send a Test Message via Admin UI

1. Log in as platform admin
2. Go to **Settings → WhatsApp**
3. Enter a test phone number (must be registered on WhatsApp, e.g. your own number)
4. Click **Test WhatsApp** — this sends a text message (not a template)
5. If successful, you receive a test message on WhatsApp

### Step 7.3 — Test the Credential Template End-to-End

The most reliable test is to create a school with a valid mobile number:

1. Go to **Schools → Create School**
2. Fill in all fields including a **Mobile Number** (your personal WhatsApp number for testing)
3. Click **Create**
4. Within seconds, check the server logs for:
   ```
   [WHATSAPP] Attempting send to="91XXXXXXXXXX" type=credential_delivery
   [WA Cloud] Sending template "school_account_credentials" to 91XXXXXXXXXX
   [WA Cloud] Template "school_account_credentials" sent to 91XXXXXXXXXX
   ```
5. Check your WhatsApp — you should receive the credential message within 30 seconds

### Step 7.4 — What the Successful Template Looks Like on the Recipient's Device

```
Your school *Delhi Public School* has been set up on i-icon Academy.

Your administrator login ID is *dps.admin@iiconacademy.in*

Your password has been sent to your registered email address. Please
check your inbox to complete your first login.

[ Log In ]   ← tappable button → https://iiconacademy.in
```

---

## Part 8 — Credential Delivery Triggers

The template is sent automatically in these three flows:

| Event | Route | Condition |
|---|---|---|
| School created directly | `POST /api/schools` | School has a `mobile_number` |
| Onboarding request approved | `PATCH /api/onboardingRequests/:id` | Request has a `mobile_number` |
| School user created | `POST /api/users` | User has a `mobile_number` |

All three flows call `createAndSendNotification({ type: "credential_delivery", ... })` which
routes through `sendWhatsApp()` in `notificationChannels.ts` to the template path.

---

## Part 9 — Message Limits and Pricing

### Conversation limits

| Account state | Conversations per 24h | How to increase |
|---|---|---|
| Unverified business | 250 | Complete Business Verification (Part 1.2) |
| Verified business | 1,000 | Automatic after verification |
| Scale tier 1 | 10,000 | Automatic — Meta promotes based on quality rating |
| Scale tier 2 | 100,000 | Automatic |
| Unlimited | Unlimited | Automatic for high-volume, high-quality accounts |

A "conversation" = all messages exchanged with a single recipient within a 24-hour window
(not per-message).

### Pricing (India, as of 2026)

| Category | Per conversation |
|---|---|
| Authentication (credential delivery) | ~₹0.15–₹0.25 |
| Utility | ~₹0.30–₹0.40 |
| Marketing | ~₹0.80–₹1.00 |
| Service (user-initiated) | Free |

Full current pricing: https://developers.facebook.com/docs/whatsapp/pricing

---

## Part 10 — Error Reference

### Error codes in server logs

| Error code | Message | Cause | Fix |
|---|---|---|---|
| `132000` | Template name does not exist in the language | Language code mismatch between API call and template | Check the language code on the template detail page. The app sends `en_US` by default. If your template was created with a different language, either recreate the template with `en_US` or update the language code in code. |
| `131030` | Template not approved | Template status is Pending or Rejected | Wait for approval, or check rejection reason in Meta and fix template content before re-submitting |
| `131047` | Re-engagement message | Sending a text message to user outside the 24h service window | Use template instead of text. The credential delivery flow always uses a template — this error means the code fell through to `sendWhatsAppText()`, which means template param parsing failed. Check logs for parsing failures. |
| `131026` | Recipient not on WhatsApp | Phone number does not have a WhatsApp account | Verify the recipient's number has WhatsApp installed and active |
| `190` | Invalid access token | Token has expired or been revoked | Re-generate the system user token (Part 4.3). Permanent tokens can still be revoked if the system user's permissions change. |
| `100` | Invalid parameter: phone_number_id | `WHATSAPP_PHONE_NUMBER_ID` is wrong | Open Meta → App → WhatsApp → API Setup and verify the Phone Number ID shown there matches your env var |
| `200` | Permission denied | System user lacks required permissions | Re-add permissions `whatsapp_business_messaging` and `whatsapp_business_management` to the system user token (Step 4.3) |

### Checking detailed error responses

When an API call fails, the full error payload is logged:
```
[WA Cloud] API error: <message> <full_json_response>
```

Look for the `error.error_data.details` field in the JSON — it often contains a more specific
explanation than the top-level message.

---

## Part 11 — Troubleshooting

### Template delivery falls back to text silently

**Symptom:** Server logs show `sendWhatsAppText` being called for `credential_delivery`,
or you see `131047` errors when creating schools.

**Cause:** The message text could not be parsed for template parameters. The regex in
`notificationChannels.ts` looks for:
- `school "NAME"` (with double quotes) or `school *NAME*` (with asterisks)
- `User ID: value`
- `Password: value`

If the message format from any route deviates from this, `userId` will be `""` and
the template path is skipped.

**How to debug:** Add a temporary log before the regex in `notificationChannels.ts`:
```typescript
console.log("[WHATSAPP DEBUG] message:", message);
```
Trigger a school creation and examine the logged message to verify the patterns match.

### Template rejected by Meta

Common rejection reasons and fixes:

| Rejection reason | Fix |
|---|---|
| "Marketing-like content detected" | Remove any promotional language. Credential messages should be purely functional. Remove phrases like "discover our platform", "get started today", etc. |
| "Variable parameter mismatch" | The sample values you provided for `{{1}}`, `{{2}}`, `{{3}}` must be plausible real values matching the variable's purpose |
| "Template category is incorrect" | If Meta re-categorizes your Utility template as Marketing, you can appeal via the Meta Business Help Center. Credential delivery is explicitly Utility. |
| "Template name already exists" | If the previous template with this name was rejected, you cannot reuse the name. Append `_v2` and update `WHATSAPP_CREDENTIAL_TEMPLATE` env var. |

### Token stops working after working correctly

Permanent system user tokens can be invalidated when:
- The system user's app asset permissions are removed or changed
- The associated app is put in Development mode
- Meta detects suspicious activity on the Business Portfolio

Re-generate via Step 4.3. The new token should work immediately.

### Test number receives messages but production number does not

Check:
1. The production number has been verified in Meta (Step 3.1) and is in **Connected** status
2. The `WHATSAPP_PHONE_NUMBER_ID` in env matches the production number's ID (not the test number's ID)
3. The production number's **Quality Rating** in WhatsApp Manager is not **Low** (Low rating blocks outbound template messages)

---

## Part 12 — Security Notes

- **Never commit the access token to git.** Use `.env` (gitignored) or Docker secrets.
- The access token provides full messaging access on behalf of your business number. Treat it as a master credential.
- Rotate the token periodically (annually minimum) via Step 4.3.
- The template body (including school name, User ID, password) is transmitted in plaintext to Meta's servers. This is inherent to the WhatsApp Cloud API — Meta stores and routes the message content. Passwords sent via WhatsApp should be treated as first-login temporary passwords and users should be encouraged to change them on first login.

---

## Useful Links

- Meta WhatsApp Cloud API docs: https://developers.facebook.com/docs/whatsapp/cloud-api
- Message Templates guide: https://developers.facebook.com/docs/whatsapp/message-templates
- Template category guidelines: https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines
- Error codes: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
- Business Manager: https://business.facebook.com/settings
- WhatsApp Manager (templates): https://business.facebook.com/wa/manage/message-templates
- Pricing: https://developers.facebook.com/docs/whatsapp/pricing
