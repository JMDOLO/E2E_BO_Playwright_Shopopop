/**
 * Mobile cancel helper — bypass mobiles-api, calls delivery-api QA3 directly
 *
 * Posts an event on delivery-api QA3 reproducing what mobiles-api would forward
 * to delivery-api after receiving a mobile cancel from the Shopopop app:
 *
 * - URL: delivery-api QA3 (Clever Cloud `[QA3] API Delivery [BO]`,
 *   cleverapps.io direct, no Cloudflare Access in front)
 * - Header `auth_key`: MOBILE_API_KEY (inter-service key delivery-api → mobile caller).
 *   Default code value (defined in delivery-api/app/config/environment.ts:MOBILE_API_KEY).
 * - Body: `{event, user_auth_key: <shop_user.access_token of the acting CTP>}`
 *   This matches what mobiles-api would inject (cf mobiles-api/app/controllers/deliveryController.ts:227).
 *
 * Result: delivery-api treats this as `C_FROM_MOBILES_API` via callerAuthentication
 * (because auth_key header matches its mobileApiKey env var), so `cancelFromMobile=true`
 * is evaluated and the kyc moderation branch is taken.
 */

const DELIVERY_API_URL_QA3 = 'https://api-qa-3-for-bo.cleverapps.io';
const MOBILE_API_KEY = 'ab495534-4778-41ca-aeb6-63bcc764664c';

export type MobileEvent = 'CANCELED';

export async function postMobileDeliveryEvent(
  deliveryId: number,
  userAuthKey: string,
  event: MobileEvent = 'CANCELED',
): Promise<void> {
  const response = await fetch(`${DELIVERY_API_URL_QA3}/deliveries/${deliveryId}/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth_key': MOBILE_API_KEY,
    },
    body: JSON.stringify({ event, user_auth_key: userAuthKey }),
  });

  const body = await response.json().catch(() => null) as { has_error?: boolean; errors?: unknown } | null;

  if (!response.ok || (body && body.has_error)) {
    throw new Error(`delivery-api POST /deliveries/${deliveryId}/event ${event} failed: HTTP ${response.status} body=${JSON.stringify(body)}`);
  }
}
