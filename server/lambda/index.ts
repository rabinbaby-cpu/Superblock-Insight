import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "./types";
import { getNotesHandler } from "./notes/getNotes";
import { createNoteHandler } from "./notes/createNote";
import {
  getCustomerDetailsHandler,
  listCustomerDetailsHandler,
} from "./customerDetails/getCustomerDetails";
import { getMeetingsHandler } from "./meetings/getMeetings";
import { createMeetingHandler } from "./meetings/createMeeting";

export * from "./types";
export * from "./db";
export { getNotesHandler } from "./notes/getNotes";
export { createNoteHandler } from "./notes/createNote";
export {
  getCustomerDetailsHandler,
  listCustomerDetailsHandler,
} from "./customerDetails/getCustomerDetails";
export { getMeetingsHandler } from "./meetings/getMeetings";
export { createMeetingHandler } from "./meetings/createMeeting";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

/**
 * Unified Lambda entrypoint router.
 * Dispatches API Gateway requests based on HTTP method and path,
 * or allows calling individual handlers directly.
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const method = (
    event.httpMethod ||
    event.requestContext?.http?.method ||
    "GET"
  ).toUpperCase();
  const rawPath = (
    event.path ||
    event.rawPath ||
    event.requestContext?.http?.path ||
    "/"
  ).toLowerCase();

  // Handle CORS Preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "OK" }),
    };
  }

  // 1. Notes API: GET /notes
  if (method === "GET" && (rawPath.endsWith("/notes") || rawPath.includes("/notes/"))) {
    return getNotesHandler(event);
  }

  // 2. Notes API: POST /notes
  if (method === "POST" && rawPath.endsWith("/notes")) {
    return createNoteHandler(event);
  }

  // 3. Customer Details: GET /customer-details/{id} or GET /customer-details
  if (
    method === "GET" &&
    (rawPath.includes("/customer-details") || rawPath.includes("/customer_details"))
  ) {
    if (
      event.pathParameters?.id ||
      event.pathParameters?.customerId ||
      event.queryStringParameters?.id ||
      event.queryStringParameters?.customerId ||
      event.queryStringParameters?.clientUserId
    ) {
      return getCustomerDetailsHandler(event);
    }
    return listCustomerDetailsHandler(event);
  }

  // 4. Meetings API: GET /meetings
  if (method === "GET" && (rawPath.endsWith("/meetings") || rawPath.includes("/meetings/"))) {
    return getMeetingsHandler(event);
  }

  // 5. Meetings API: POST /meetings
  if (method === "POST" && rawPath.endsWith("/meetings")) {
    return createMeetingHandler(event);
  }

  // Fallback 404
  return {
    statusCode: 404,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      error: `Route not found for method ${method} at path ${rawPath}`,
    }),
  };
}
