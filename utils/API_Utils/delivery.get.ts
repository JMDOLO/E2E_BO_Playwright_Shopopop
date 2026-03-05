/**
 * GET request module for delivery status retrieval via GenericV2 API
 */

export interface APIResponse {
  status: number;
  data: any;
}

/**
 * Get delivery status via GenericV2 API
 * Retrieves delivery information including the internal delivery ID
 *
 * @param url - Base API URL
 * @param reference - Delivery reference
 * @param partnerId - Partner ID for authentication
 * @param apiKey - API key for authentication
 * @param cfClientId - Cloudflare Access Client ID
 * @param cfClientSecret - Cloudflare Access Client Secret
 * @returns Response with status and delivery data including ID
 */
export async function getDeliveryStatus(
  url: string,
  reference: string,
  partnerId: string,
  apiKey: string,
  cfClientId: string,
  cfClientSecret: string
): Promise<APIResponse> {
  try {
    // Create Basic Auth credentials
    const credentials = Buffer.from(`${partnerId}:${apiKey}`).toString('base64');

    const response = await fetch(`${url}/v2/deliveries/${reference}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'CF-Access-Client-Id': cfClientId,
        'CF-Access-Client-Secret': cfClientSecret,
      },
    });

    // Handle non-JSON responses
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { error: text };
    }

    return {
      status: response.status,
      data: data
    };
  } catch (error) {
    console.error('Error getting delivery status via API:', error);
    throw error;
  }
}
