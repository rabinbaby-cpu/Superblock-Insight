import { query } from "../db";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  SubscriptionRecord,
  GetSubscriptionsResponse,
} from "../types";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

export async function getSubscriptionsHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const params = event.queryStringParameters || {};
    const pathParams = event.pathParameters || {};
    const customerId = (
      params.customerId ||
      params.customer_id ||
      params.clientUserId ||
      params.client_user_id ||
      pathParams.customerId ||
      pathParams.id ||
      ""
    ).trim();

    if (!customerId) {
      const allSql = `
        SELECT 
          s.id::text,
          s.customer_id::text,
          s.plan_id::text,
          s.status,
          s.start_date,
          s.end_date,
          s.amount::numeric,
          s.currency,
          s.billing_interval,
          s.created_at,
          s.updated_at,
          p.name as plan_name,
          cd.customer_name
        FROM public.subscriptions s
        LEFT JOIN public.plans p ON s.plan_id = p.id
        LEFT JOIN public.customers_details cd ON s.customer_id = cd.id
        ORDER BY s.created_at DESC NULLS LAST;
      `;
      const allResult = await query<SubscriptionRecord & { plan_name: string | null; customer_name?: string | null }>(allSql);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          count: allResult.rows.length,
          customerId: "",
          subscriptions: allResult.rows,
        } as GetSubscriptionsResponse),
      };
    }

    const sql = `
      SELECT 
        s.id::text,
        s.customer_id::text,
        s.plan_id::text,
        s.status,
        s.start_date,
        s.end_date,
        s.amount::numeric,
        s.currency,
        s.billing_interval,
        s.created_at,
        s.updated_at,
        p.name as plan_name
      FROM public.subscriptions s
      LEFT JOIN public.plans p ON s.plan_id = p.id
      WHERE s.customer_id::text = $1
         OR s.customer_id IN (
           SELECT c.id 
           FROM public.customers_details c
           LEFT JOIN public.users u ON (
             LOWER(c.client_user_id) = LOWER(u.user_name) 
             OR LOWER(c.client_user_id) = LOWER(u.email) 
             OR LOWER(c.client_user_id) = LOWER(u.user_email)
             OR LOWER(c.client_user_id) = LOWER(u.user_id::text)
           )
           WHERE c.id::text = $1 
              OR LOWER(c.client_user_id) = LOWER($1)
              OR u.user_id::text = $1
              OR LOWER(u.user_name) = LOWER($1)
              OR LOWER(u.email) = LOWER($1)
              OR LOWER(u.user_email) = LOWER($1)
         )
      ORDER BY s.created_at DESC NULLS LAST;
    `;

    const result = await query<SubscriptionRecord>(sql, [customerId]);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        count: result.rows.length,
        customerId,
        subscriptions: result.rows,
      } as GetSubscriptionsResponse),
    };
  } catch (error: any) {
    console.error("Error executing getSubscriptionsHandler:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        count: 0,
        customerId: "",
        subscriptions: [],
        error: error.message || "Failed to retrieve subscriptions",
      } as GetSubscriptionsResponse),
    };
  }
}
