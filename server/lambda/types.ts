/**
 * TypeScript definitions for AWS Lambda handlers and database records
 * in Analytics Studio backend.
 */

export interface APIGatewayProxyEvent {
  httpMethod?: string;
  path?: string;
  rawPath?: string;
  requestContext?: {
    http?: {
      method?: string;
      path?: string;
    };
  };
  queryStringParameters?: Record<string, string | undefined> | null;
  pathParameters?: Record<string, string | undefined> | null;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
}

export interface APIGatewayProxyResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

/**
 * Exact schema for public.notes
 */
export interface NoteRecord {
  id: string;
  customer_id: string;
  title: string | null;
  content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetNotesResponse {
  success: boolean;
  count: number;
  customerId: string;
  notes: NoteRecord[];
  error?: string;
}

export interface CreateNoteInput {
  customerId?: string;
  customer_id?: string;
  title?: string | null;
  content: string;
  createdBy?: string | null;
  created_by?: string | null;
}

export interface CreateNoteResponse {
  success: boolean;
  note?: NoteRecord;
  error?: string;
}

/**
 * Exact schema for public.customers_details (formerly public.customers)
 */
export interface CustomerDetailsRecord {
  id: string;
  client_user_id: string;
  customer_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetCustomerDetailsResponse {
  success: boolean;
  customer?: CustomerDetailsRecord | null;
  error?: string;
}

export interface ListCustomerDetailsResponse {
  success: boolean;
  count: number;
  customers: CustomerDetailsRecord[];
  error?: string;
}
