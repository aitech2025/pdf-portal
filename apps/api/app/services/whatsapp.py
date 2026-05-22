import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


async def send_whatsapp_message(
    to_number: str,
    message: str,
    whatsapp_config: dict[str, Any] | None = None,
) -> tuple[bool, str]:
    config = whatsapp_config or {}
    if not config.get("enabled"):
        return False, "WhatsApp integration is disabled"

    provider = str(config.get("provider") or "custom").lower()

    try:
        if provider == "custom":
            api_url = config.get("apiUrl")
            api_key = config.get("apiKey")
            from_number = config.get("fromNumber")
            if not api_url or not api_key:
                return False, "Missing custom WhatsApp API configuration"

            payload = {"to": to_number, "from": from_number, "message": message}
            headers = {"Authorization": f"Bearer {api_key}"}
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(api_url, json=payload, headers=headers)
                if 200 <= resp.status_code < 300:
                    return True, "sent"
                return False, f"Provider returned {resp.status_code}"

        if provider == "twilio":
            account_sid = config.get("accountSid")
            auth_token = config.get("authToken")
            from_number = config.get("fromNumber")
            if not account_sid or not auth_token or not from_number:
                return False, "Missing Twilio WhatsApp configuration"

            data = {"From": from_number, "To": f"whatsapp:{to_number}", "Body": message}
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, data=data, auth=(account_sid, auth_token))
                if 200 <= resp.status_code < 300:
                    return True, "sent"
                return False, f"Twilio returned {resp.status_code}"

        return False, f"Unsupported WhatsApp provider: {provider}"
    except Exception as exc:
        logger.error("WhatsApp send failed: %s", exc)
        return False, "WhatsApp delivery failed"
