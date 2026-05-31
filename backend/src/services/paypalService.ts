import https from 'https';
import { URL } from 'url';

const PAYPAL_MODE = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
const rawPaypalClientId = process.env.PAYPAL_CLIENT_ID;
const rawPaypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_CURRENCY = process.env.PAYPAL_CURRENCY || 'USD';

if (!rawPaypalClientId || !rawPaypalClientSecret) {
  throw new Error('Missing PayPal credentials: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
}

const PAYPAL_CLIENT_ID = rawPaypalClientId;
const PAYPAL_CLIENT_SECRET = rawPaypalClientSecret;

const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

class PayPalService {
  private static async request<T>(path: string, method: 'GET' | 'POST', headers: Record<string, string>, body?: string): Promise<T> {
    const url = new URL(`${PAYPAL_BASE_URL}${path}`);
    const options: https.RequestOptions = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed as T);
            } else {
              const message = parsed?.message || parsed?.details?.[0]?.description || `PayPal API error ${res.statusCode}`;
              const details = parsed?.details ? JSON.stringify(parsed.details) : '';
              const fullMessage = details ? `${message} - ${details}` : message;
              console.error(`[PayPalService] API Error ${res.statusCode}:`, fullMessage);
              reject(new Error(fullMessage));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  private static async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const body = new URLSearchParams({ grant_type: 'client_credentials' }).toString();

    const response = await this.request<{ access_token: string }>(
      '/v1/oauth2/token',
      'POST',
      {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    );

    return response.access_token;
  }

  static async createOrder(amount: number, description: string, orderId: number): Promise<any> {
    const accessToken = await this.getAccessToken();
    
    // Convert VND to USD if needed (exchange rate: 1 USD ≈ 24000 VND)
    const exchangeRate = Number(process.env.VND_TO_USD_RATE) || 24000;
    const convertedAmount = PAYPAL_CURRENCY === 'VND' ? amount : Math.round((amount / exchangeRate) * 100) / 100;
    const formattedValue = convertedAmount.toFixed(2);
    
    console.log(`[PayPalService] Converting amount: ${amount} VND = ${formattedValue} ${PAYPAL_CURRENCY}`);

    const backendUrl = process.env.BACKEND_URL || 'https://restaurant-backend-swoh.onrender.com';
    const returnUrl = `${backendUrl}/api/public/orders/paypal/return?orderId=${orderId}&status=success`;
    const cancelUrl = `${backendUrl}/api/public/orders/paypal/return?orderId=${orderId}&status=cancelled`;

    const requestBody = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: PAYPAL_CURRENCY,
          value: formattedValue
        },
        custom_id: String(orderId)
      }],
      application_context: {
        brand_name: 'Restaurant Order',
        locale: 'en-US',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl
      }
    };
    
    console.log('[PayPalService] Sending request with return URLs:', { returnUrl, cancelUrl });
    const body = JSON.stringify(requestBody);

    const response = await this.request<any>(
      '/v2/checkout/orders',
      'POST',
      {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body
    );

    return response;
  }

  static async captureOrder(paypalOrderId: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    const response = await this.request<any>(
      `/v2/checkout/orders/${paypalOrderId}/capture`,
      'POST',
      {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    );

    return response;
  }

  static getClientId(): string {
    return PAYPAL_CLIENT_ID;
  }

  static getCurrency(): string {
    return PAYPAL_CURRENCY;
  }

  static getMode(): 'live' | 'sandbox' {
    return PAYPAL_MODE as 'live' | 'sandbox';
  }
}

export default PayPalService;
