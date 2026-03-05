/**
 * POST request module for delivery creation via GenericV2 API
 */

export interface GenericV2DeliveryPayload {
  retailer?: string | null;
  pickup: {
    id: string;
    name?: string | null;
  };
  dropoff: {
    dropoff_start: string;
    dropoff_end: string;
    contact: {
      first_name?: string;
      last_name: string;
      email: string;
      phone: string;
    };
    street: string;
    zip_code: string;
    city: string;
    country?: string;
    phone_other?: string | null;
    location_name?: string | null;
    type?: string;
    floor?: number | null;
    elevator?: boolean | null;
    comment?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  delivery: {
    id: string;
    order: {
      reference: string;
      amount: number;
      number_of_items?: number | null;
      frozen_food?: boolean;
      alcohol?: boolean;
      order_detail?: {
        title: string;
        quantity: number;
      }[] | null;
    };
    content_size: {
      category?: string | null;
      weight?: number | null;
      volume?: number | null;
      dimensions?: {
        length: number;
        height: number;
        depth: number;
      } | null;
      heavy_item?: boolean | null;
      bulky_item?: boolean | null;
      size_for_florists?: {
        type: string;
        quantity: number;
      }[] | null;
    };
    special_event?: string;
    minimal_transport_mode?: string;
    additional_infos?: string | null;
  };
}

export interface APIResponse {
  status: number;
  data: any;
}

/**
 * Create a delivery via GenericV2 API
 * This endpoint properly creates both errand and drop_off records in the database
 *
 * @param url - Base API URL
 * @param payload - Delivery creation payload
 * @param partnerId - Partner ID for authentication
 * @param apiKey - API key for authentication
 * @param cfClientId - Cloudflare Access Client ID
 * @param cfClientSecret - Cloudflare Access Client Secret
 * @returns Response with status code and data
 */
export async function createDelivery(
  url: string,
  payload: GenericV2DeliveryPayload,
  partnerId: string,
  apiKey: string,
  cfClientId: string,
  cfClientSecret: string
): Promise<APIResponse> {
  try {
    // Create Basic Auth credentials
    const credentials = Buffer.from(`${partnerId}:${apiKey}`).toString('base64');

    const response = await fetch(`${url}/v2/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'CF-Access-Client-Id': cfClientId,
        'CF-Access-Client-Secret': cfClientSecret,
      },
      body: JSON.stringify(payload),
    });

    // Handle 204 No Content response
    let data = null;
    if (response.status !== 204) {
      data = await response.json();
    }

    return {
      status: response.status,
      data: data
    };
  } catch (error) {
    console.error('Error creating delivery via API:', error);
    throw error;
  }
}
