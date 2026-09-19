import { query } from "../db";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  InvoiceRecord,
  CreateInvoiceInput,
  CreateInvoiceResponse,
} from "../types";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

async function resolveCustomerUuid(identifier: string): Promise<string | null> {
  const sql = `
    SELECT id::text 
    FROM public.customers_details 
    WHERE id::text = $1 OR LOWER(client_user_id) = LOWER($1)
    LIMIT 1;
  `;
  const res = await query<{ id: string }>(sql, [identifier]);
  return res.rows.length > 0 ? res.rows[0].id : null;
}

export async function createInvoiceHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: "Request body is required",
        } as CreateInvoiceResponse),
      };
    }

    let payload: CreateInvoiceInput;
    try {
      payload =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: "Invalid JSON format in request body",
        } as CreateInvoiceResponse),
      };
    }

    const rawCustomerId = (
      payload.customerId ||
      payload.customer_id ||
      ""
    ).trim();

    if (!rawCustomerId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: "Missing required field: 'customerId'",
        } as CreateInvoiceResponse),
      };
    }

    if (payload.amount === undefined || payload.amount === null || typeof payload.amount !== "number") {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: "Missing or invalid required field: 'amount' (must be a number)",
        } as CreateInvoiceResponse),
      };
    }

    const customerUuid = await resolveCustomerUuid(rawCustomerId);
    if (!customerUuid) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: `Customer not found for identifier: '${rawCustomerId}'`,
        } as CreateInvoiceResponse),
      };
    }

    const invoiceNumber = payload.invoiceNumber || payload.invoice_number || `INV-${Date.now().toString().slice(-6)}`;
    const status = payload.status || "pending";
    const amount = payload.amount;
    const currency = payload.currency || "INR";
    const issueDate = payload.issueDate || payload.issue_date || null;
    const dueDate = payload.dueDate || payload.due_date || null;
    const paidDate = payload.paidDate || payload.paid_date || null;
    const description = payload.description || null;

    const insertSql = `
      INSERT INTO public.invoices (
        id, customer_id, invoice_number, status, amount, currency,
        issue_date, due_date, paid_date, description, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5,
        $6, $7, $8, $9, NOW(), NOW()
      )
      RETURNING 
        id::text, customer_id::text, invoice_number, status,
        amount::numeric, currency, issue_date, due_date, paid_date,
        description, created_at, updated_at;
    `;

    const result = await query<InvoiceRecord>(insertSql, [
      customerUuid, invoiceNumber, status, amount, currency,
      issueDate, dueDate, paidDate, description
    ]);

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        invoice: result.rows[0],
      } as CreateInvoiceResponse),
    };
  } catch (error: any) {
    console.error("Error executing createInvoiceHandler:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: error.message || "Failed to create invoice",
      } as CreateInvoiceResponse),
    };
  }
}
