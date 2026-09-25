import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  getCustomerActivities,
  getCustomerProducts,
  getCustomerDeals,
  getCustomerTasks,
  getCustomerTickets,
  getCustomerContactGroups,
  getCustomerOperations,
  invalidateAnalyticsCache,
} from "./analyticsDb";
import { createNoteHandler } from "./lambda/notes/createNote";
import { getNotesHandler } from "./lambda/notes/getNotes";
import { deleteNoteHandler } from "./lambda/notes/deleteNote";
import { updateNoteHandler } from "./lambda/notes/updateNote";
import { getMeetingsHandler } from "./lambda/meetings/getMeetings";
import { createMeetingHandler } from "./lambda/meetings/createMeeting";
import { deleteMeetingHandler } from "./lambda/meetings/deleteMeeting";
import { updateMeetingHandler } from "./lambda/meetings/updateMeeting";
import { getInvoicesHandler } from "./lambda/invoices/getInvoices";
import { createInvoiceHandler } from "./lambda/invoices/createInvoice";
import { getSubscriptionsHandler } from "./lambda/subscriptions/getSubscriptions";
import { createSubscriptionHandler } from "./lambda/subscriptions/createSubscription";
import { getProductsHandler } from "./lambda/products/getProducts";
import { createProductHandler } from "./lambda/products/createProduct";
import { getTeamMembersHandler } from "./lambda/teamMembers/getTeamMembers";
import { createTeamMemberHandler } from "./lambda/teamMembers/createTeamMember";
import { getUsageMetricsHandler } from "./lambda/usageMetrics/getUsageMetrics";
import { getCredentialsHandler } from "./lambda/credentials/getCredentials";
import { getCustomerOfferingsHandler } from "./lambda/customerOfferings/getCustomerOfferings";
import { createCustomerOfferingHandler } from "./lambda/customerOfferings/createCustomerOffering";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Parse JSON payloads
app.use(express.json());

  // Session cookie management endpoint
  app.post("/api/set-user-session", (req, res) => {
    try {
      const { userId } = req.body || {};

      if (userId) {
        res.cookie("sb_user_session", userId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        return res.json({ success: true, userId });
      } else {
        res.clearCookie("sb_user_session", { path: "/" });
        return res.json({ success: true, userId: null });
      }
    } catch (error) {
      console.error("Error setting user session:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  });

  // Analytics Studio PostgreSQL real data endpoints
  app.get("/api/customer-activities", async (req, res) => {
    try {
      const customerId = (req.query.customerId as string) || "";
      const customerName = (req.query.customerName as string) || "";
      const activities = await getCustomerActivities(customerId, customerName);
      return res.json({ success: true, count: activities.length, activities });
    } catch (error) {
      console.error("Error fetching customer activities:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error", activities: [] });
    }
  });

  app.get("/api/customer-products", async (req, res) => {
    try {
      const customerId = (req.query.customerId as string) || "";
      const customerName = (req.query.customerName as string) || "";
      const products = await getCustomerProducts(customerId, customerName);
      return res.json({ success: true, count: products.length, products });
    } catch (error) {
      console.error("Error fetching customer products:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error", products: [] });
    }
  });

  app.get("/api/customer-deals", async (req, res) => {
    try {
      const customerId = (req.query.customerId as string) || "";
      const customerName = (req.query.customerName as string) || "";
      const deals = await getCustomerDeals(customerId, customerName);
      return res.json({ success: true, count: deals.length, deals });
    } catch (error) {
      console.error("Error fetching customer deals:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error", deals: [] });
    }
  });

  app.get("/api/customer-tasks", async (req, res) => {
    try {
      const customerId = (req.query.customerId as string) || "";
      const customerName = (req.query.customerName as string) || "";
      const tasks = await getCustomerTasks(customerId, customerName);
      return res.json({ success: true, count: tasks.length, tasks });
    } catch (error) {
      console.error("Error fetching customer tasks:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error", tasks: [] });
    }
  });

  app.get("/api/customer-tickets", async (req, res) => {
    try {
      const customerId = (req.query.customerId as string) || "";
      const customerName = (req.query.customerName as string) || "";
      const tickets = await getCustomerTickets(customerId, customerName);
      return res.json({ success: true, count: tickets.length, tickets });
    } catch (error) {
      console.error("Error fetching customer tickets:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error", tickets: [] });
    }
  });

  app.get("/api/customer-contact-groups", async (req, res) => {
    try {
      const customerId = (req.query.customerId as string) || "";
      const customerName = (req.query.customerName as string) || "";
      const groups = await getCustomerContactGroups(customerId, customerName);
      return res.json({ success: true, count: groups.length, groups });
    } catch (error) {
      console.error("Error fetching customer contact groups:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error", groups: [] });
    }
  });

  app.get("/api/customer-operations", async (req, res) => {
    try {
      const customerId = (req.query.customerId as string) || "";
      const customerName = (req.query.customerName as string) || "";
      if (req.query.refresh === "true" || req.query._t) {
        invalidateAnalyticsCache();
      }
      const operations = await getCustomerOperations(customerId, customerName);
      return res.json({ success: true, ...operations });
    } catch (error) {
      console.error("Error fetching customer operations:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        activities: [],
        products: [],
        deals: [],
        tasks: [],
        tickets: [],
        groups: [],
        notes: [],
      });
    }
  });

  app.get("/api/notes", async (req, res) => {
    try {
      const result = await getNotesHandler({
        httpMethod: "GET",
        path: "/notes",
        headers: req.headers as Record<string, string | undefined>,
        queryStringParameters: req.query as Record<string, string | undefined>,
      });

      let responseData: unknown;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }

      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error fetching notes:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Internal server error",
        notes: [],
      });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const result = await createNoteHandler({
        httpMethod: "POST",
        path: "/notes",
        headers: req.headers as Record<string, string | undefined>,
        body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      });

      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }

      if (
        result.statusCode >= 500 ||
        (responseData && !responseData.success && (responseData.error?.includes("ECONNRESET") || responseData.error?.includes("connect")))
      ) {
        const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
        return res.status(200).json({
          success: true,
          offline: true,
          note: {
            id: `note-${Date.now()}`,
            customer_id: bodyObj.customerId || bodyObj.customer_id,
            title: bodyObj.title || "Customer Note",
            content: bodyObj.content || "",
            created_by: bodyObj.createdBy || "Admin User",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }

      if (result.statusCode >= 200 && result.statusCode < 300) {
        invalidateAnalyticsCache();
      }

      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error creating note:", error);
      const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      return res.status(200).json({
        success: true,
        offline: true,
        note: {
          id: `note-${Date.now()}`,
          customer_id: bodyObj.customerId || bodyObj.customer_id,
          title: bodyObj.title || "Customer Note",
          content: bodyObj.content || "",
          created_by: bodyObj.createdBy || "Admin User",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const result = await deleteNoteHandler({
        httpMethod: "DELETE",
        path: `/notes/${req.params.id}`,
        pathParameters: { id: req.params.id },
        headers: req.headers as Record<string, string | undefined>,
      });

      let responseData: unknown;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }

      if (result.statusCode >= 200 && result.statusCode < 300) {
        invalidateAnalyticsCache();
      }

      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error deleting note:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Internal server error",
      });
    }
  });

  const handleUpdateNote = async (req: express.Request, res: express.Response) => {
    try {
      const result = await updateNoteHandler({
        httpMethod: req.method,
        path: `/notes/${req.params.id}`,
        pathParameters: { id: req.params.id },
        headers: req.headers as Record<string, string | undefined>,
        body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      });

      let responseData: unknown;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }

      if (result.statusCode >= 200 && result.statusCode < 300) {
        invalidateAnalyticsCache();
      }

      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error updating note:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Internal server error",
      });
    }
  };

  app.put("/api/notes/:id", handleUpdateNote);
  app.patch("/api/notes/:id", handleUpdateNote);

  // Meetings endpoints
  app.get("/api/meetings", async (req, res) => {
    try {
      const result = await getMeetingsHandler({
        httpMethod: "GET",
        path: "/meetings",
        headers: req.headers as Record<string, string | undefined>,
        queryStringParameters: req.query as Record<string, string | undefined>,
      });
      let responseData: unknown;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error fetching meetings:", error);
      return res.status(500).json({ success: false, error: error?.message || "Internal server error", meetings: [] });
    }
  });

  app.post("/api/meetings", async (req, res) => {
    try {
      const result = await createMeetingHandler({
        httpMethod: "POST",
        path: "/meetings",
        headers: req.headers as Record<string, string | undefined>,
        body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (
        result.statusCode >= 500 ||
        (responseData && !responseData.success && (responseData.error?.includes("ECONNRESET") || responseData.error?.includes("connect")))
      ) {
        const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
        return res.status(200).json({
          success: true,
          offline: true,
          meeting: {
            id: `meeting-${Date.now()}`,
            customer_id: bodyObj.customerId || bodyObj.customer_id,
            title: bodyObj.title || "Meeting",
            description: bodyObj.description || null,
            meeting_date: bodyObj.meetingDate || new Date().toISOString(),
            duration_minutes: bodyObj.durationMinutes ?? 30,
            status: bodyObj.status || "scheduled",
            meeting_url: bodyObj.meetingUrl || null,
            created_by: bodyObj.createdBy || "Admin User",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }
      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      return res.status(200).json({
        success: true,
        offline: true,
        meeting: {
          id: `meeting-${Date.now()}`,
          customer_id: bodyObj.customerId || bodyObj.customer_id,
          title: bodyObj.title || "Meeting",
          description: bodyObj.description || null,
          meeting_date: bodyObj.meetingDate || new Date().toISOString(),
          duration_minutes: bodyObj.durationMinutes ?? 30,
          status: bodyObj.status || "scheduled",
          meeting_url: bodyObj.meetingUrl || null,
          created_by: bodyObj.createdBy || "Admin User",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }
  });

  app.delete("/api/meetings/:id", async (req, res) => {
    try {
      const result = await deleteMeetingHandler({
        httpMethod: "DELETE",
        path: `/meetings/${req.params.id}`,
        pathParameters: { id: req.params.id },
        headers: req.headers as Record<string, string | undefined>,
      });
      let responseData: unknown;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error deleting meeting:", error);
      return res.status(500).json({ success: false, error: error?.message || "Internal server error" });
    }
  });

  const handleUpdateMeeting = async (req: express.Request, res: express.Response) => {
    try {
      const result = await updateMeetingHandler({
        httpMethod: req.method,
        path: `/meetings/${req.params.id}`,
        pathParameters: { id: req.params.id },
        headers: req.headers as Record<string, string | undefined>,
        body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      });
      let responseData: unknown;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error updating meeting:", error);
      return res.status(500).json({ success: false, error: error?.message || "Internal server error" });
    }
  };

  app.put("/api/meetings/:id", handleUpdateMeeting);
  app.patch("/api/meetings/:id", handleUpdateMeeting);

  let fallbackInvoices = [
    { id: "INV-20341", date: "01 Sep 2026", dueDate: "10 Sep 2026", product: "Growth + WhatsApp API", amount: 128000, tax: 23040, total: 151040, status: "Paid", paymentDate: "06 Sep 2026", customer: "Acme Commerce", customerId: "CUS-10482" },
    { id: "INV-20116", date: "01 Aug 2026", dueDate: "10 Aug 2026", product: "Growth + WhatsApp API", amount: 128000, tax: 23040, total: 151040, status: "Paid", paymentDate: "08 Aug 2026", customer: "Acme Commerce", customerId: "CUS-10482" },
    { id: "INV-19982", date: "01 Jul 2026", dueDate: "10 Jul 2026", product: "Growth + WhatsApp API", amount: 124000, tax: 22320, total: 146320, status: "Paid", paymentDate: "09 Jul 2026", customer: "Acme Commerce", customerId: "CUS-10482" },
    { id: "INV-20455", date: "15 Sep 2026", dueDate: "25 Sep 2026", product: "Advanced + AI Agent", amount: 186000, tax: 33480, total: 219480, status: "Sent", customer: "Northstar Learning", customerId: "CUS-10461" },
    { id: "INV-20412", date: "10 Sep 2026", dueDate: "20 Sep 2026", product: "Growth", amount: 92000, tax: 16560, total: 108560, status: "Paid", paymentDate: "12 Sep 2026", customer: "Carely Health", customerId: "CUS-10444" },
    { id: "INV-20389", date: "05 Sep 2026", dueDate: "15 Sep 2026", product: "Advanced", amount: 214000, tax: 38520, total: 252520, status: "Overdue", customer: "Fleetgrid Logistics", customerId: "CUS-10398" },
    { id: "INV-20299", date: "20 Aug 2026", dueDate: "30 Aug 2026", product: "Enterprise", amount: 248000, tax: 44640, total: 292640, status: "Draft", customer: "Mirovia Finance", customerId: "CUS-10376" },
  ];

  // Invoices endpoint
  app.get("/api/invoices", async (req, res) => {
    try {
      const result = await getInvoicesHandler({
        httpMethod: "GET",
        path: "/invoices",
        headers: req.headers as Record<string, string | undefined>,
        queryStringParameters: req.query as Record<string, string | undefined>,
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (result.statusCode >= 200 && result.statusCode < 300 && Array.isArray(responseData?.invoices) && responseData.invoices.length > 0) {
        return res.status(result.statusCode).json(responseData);
      }
      return res.status(200).json({ success: true, count: fallbackInvoices.length, invoices: fallbackInvoices, offline: true });
    } catch (error: any) {
      console.warn("Error fetching invoices (DB offline), serving fallback:", error?.message);
      return res.status(200).json({ success: true, count: fallbackInvoices.length, invoices: fallbackInvoices, offline: true });
    }
  });

  app.put("/api/invoices/:id", (req, res) => {
    const id = req.params.id;
    const updates = req.body || {};
    const existing = fallbackInvoices.find((i) => i.id === id);
    if (existing) {
      Object.assign(existing, updates);
    }
    return res.json({ success: true, invoice: existing || updates });
  });

  app.delete("/api/invoices/:id", (req, res) => {
    const id = req.params.id;
    fallbackInvoices = fallbackInvoices.filter((i) => i.id !== id);
    return res.json({ success: true, id });
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const result = await createInvoiceHandler({
        httpMethod: "POST",
        path: "/invoices",
        headers: req.headers as Record<string, string | undefined>,
        body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (
        result.statusCode >= 500 ||
        (responseData && !responseData.success && (responseData.error?.includes("ECONNRESET") || responseData.error?.includes("connect")))
      ) {
        const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
        return res.status(200).json({
          success: true,
          offline: true,
          invoice: {
            id: `inv-${Date.now()}`,
            customer_id: bodyObj.customerId || bodyObj.customer_id,
            invoice_number: bodyObj.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            status: bodyObj.status || "draft",
            amount: bodyObj.amount || 0,
            currency: bodyObj.currency || "USD",
            issue_date: bodyObj.issueDate || new Date().toISOString(),
            due_date: bodyObj.dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
            paid_date: null,
            description: bodyObj.description || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }
      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      return res.status(200).json({
        success: true,
        offline: true,
        invoice: {
          id: `inv-${Date.now()}`,
          customer_id: bodyObj.customerId || bodyObj.customer_id,
          invoice_number: bodyObj.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          status: bodyObj.status || "draft",
          amount: bodyObj.amount || 0,
          currency: bodyObj.currency || "USD",
          issue_date: bodyObj.issueDate || new Date().toISOString(),
          due_date: bodyObj.dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
          paid_date: null,
          description: bodyObj.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }
  });

  // In-memory fallback stores for graceful offline resilience during DB maintenance
  let fallbackProducts = [
    { id: "prod-1", name: "WhatsApp Business API", category: "Channel", model: "Usage based", status: "Active", plans: 3, customers: 942, description: "Managed WABA onboarding, messaging, and template operations." },
    { id: "prod-2", name: "Superblock Team Inbox", category: "Collaboration", model: "Per seat", status: "Active", plans: 4, customers: 788, description: "Centralized multi-agent inbox for WhatsApp, SMS, and Email." },
    { id: "prod-3", name: "Broadcast Studio", category: "Marketing", model: "Tiered usage", status: "Active", plans: 3, customers: 654, description: "Bulk messaging campaigns with advanced targeting." },
    { id: "prod-4", name: "AI Agent", category: "AI & Automation", model: "Outcome + usage", status: "Beta", plans: 2, customers: 86, description: "Automated generative bot for support and qualification." },
  ];

  let fallbackPlans = [
    { id: "plan-1", name: "Starter", product: "Omnichannel Suite", monthly: 1499, annual: 15290, limit: "10k broadcasts", features: 6, status: "Active" },
    { id: "plan-2", name: "Growth", product: "Omnichannel Suite", monthly: 2699, annual: 27530, limit: "Unlimited broadcasts", features: 12, status: "Active" },
    { id: "plan-3", name: "Advanced", product: "Omnichannel Suite", monthly: 5999, annual: 61190, limit: "5k automations", features: 18, status: "Active" },
    { id: "plan-4", name: "Enterprise", product: "Custom bundle", monthly: 0, annual: 0, limit: "Contracted", features: 24, status: "Private" },
  ];

  let fallbackSubscriptions = [
    { id: "sub-1", customer: "Acme Commerce", customerId: "CUS-10482", plan: "Growth", status: "Active", startDate: "12 Mar 2025", renewalDate: "11 Mar 2026", cycle: "Annual", mrr: 128000, amount: 1536000, payment: "Paid", autoRenewal: true },
    { id: "sub-2", customer: "Northstar Learning", customerId: "CUS-10461", plan: "Advanced", status: "Renewal Due", startDate: "19 Sep 2025", renewalDate: "18 Sep 2026", cycle: "Annual", mrr: 186000, amount: 2232000, payment: "Pending", autoRenewal: false },
    { id: "sub-3", customer: "Carely Health", customerId: "CUS-10444", plan: "Growth", status: "Active", startDate: "04 May 2025", renewalDate: "03 May 2026", cycle: "Monthly", mrr: 92000, amount: 1104000, payment: "Paid", autoRenewal: true },
    { id: "sub-4", customer: "Fleetgrid Logistics", customerId: "CUS-10398", plan: "Advanced", status: "Active", startDate: "14 Jul 2025", renewalDate: "13 Jul 2026", cycle: "Annual", mrr: 214000, amount: 2568000, payment: "Paid", autoRenewal: true },
    { id: "sub-5", customer: "Mirovia Finance", customerId: "CUS-10376", plan: "Enterprise", status: "Past due", startDate: "10 Feb 2025", renewalDate: "09 Feb 2026", cycle: "Annual", mrr: 248000, amount: 2976000, payment: "Past Due", autoRenewal: false },
  ];

  let fallbackTeamMembers = [
    { id: "tm-1", name: "Anika Shah", initials: "AS", email: "anika@superblock.chat", role: "Customer Success", department: "Customer", customers: 42, status: "Active", lastActive: "Now" },
    { id: "tm-2", name: "Karan Mehta", initials: "KM", email: "karan@superblock.chat", role: "Sales", department: "Revenue", customers: 31, status: "Active", lastActive: "8 min ago" },
    { id: "tm-3", name: "Rishi Kapoor", initials: "RK", email: "rishi@superblock.chat", role: "Support", department: "Customer", customers: 28, status: "Active", lastActive: "24 min ago" },
    { id: "tm-4", name: "Nisha Rao", initials: "NR", email: "nisha@superblock.chat", role: "Finance", department: "Finance", customers: 0, status: "Active", lastActive: "1 hr ago" },
    { id: "tm-5", name: "Dev Malhotra", initials: "DM", email: "dev@superblock.chat", role: "Analyst", department: "Operations", customers: 0, status: "Away", lastActive: "Yesterday" },
  ];

  let fallbackSettings = {
    profile: {
      fullName: "Anika Shah",
      displayName: "Anika",
      email: "anika@superblock.chat",
      phone: "+91 98765 43210",
      timezone: "ist",
    },
    notifications: {
      renewalAlerts: true,
      billingExceptions: true,
      usageAnomalies: true,
      productUpdates: false,
    },
    security: {
      twoFactorEnabled: false,
      loginAlerts: true,
      sessionTimeoutHours: "8",
      activeSessions: [
        { id: "sess-1", device: "Chrome on macOS", location: "Mumbai, India", lastActive: "Active now", isCurrent: true },
        { id: "sess-2", device: "Safari on iPhone", location: "Mumbai, India", lastActive: "2 days ago", isCurrent: false },
      ],
    },
    apiKeys: [
      { id: "key-1", name: "Production Webhook", keyPrefix: "sb_live_92f...", createdAt: "01 Sep 2026", expiresAt: "01 Sep 2027" },
    ],
    workspaceName: "Superblock HQ",
  };

  const customerOverrides = new Map<string, any>();

  // Subscriptions endpoints
  app.get("/api/subscriptions", async (req, res) => {
    try {
      const result = await getSubscriptionsHandler({
        httpMethod: "GET",
        path: "/subscriptions",
        headers: req.headers as Record<string, string | undefined>,
        queryStringParameters: req.query as Record<string, string | undefined>,
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (result.statusCode >= 200 && result.statusCode < 300 && Array.isArray(responseData?.subscriptions) && responseData.subscriptions.length > 0) {
        return res.status(result.statusCode).json(responseData);
      }
      return res.status(200).json({ success: true, count: fallbackSubscriptions.length, subscriptions: fallbackSubscriptions, offline: true });
    } catch (error: any) {
      console.warn("Error fetching subscriptions (DB offline), serving fallback:", error?.message);
      return res.status(200).json({ success: true, count: fallbackSubscriptions.length, subscriptions: fallbackSubscriptions, offline: true });
    }
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      const result = await createSubscriptionHandler({
        httpMethod: "POST",
        path: "/subscriptions",
        headers: req.headers as Record<string, string | undefined>,
        body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (result.statusCode >= 200 && result.statusCode < 300 && responseData?.success) {
        return res.status(result.statusCode).json(responseData);
      }
      // Offline fallback
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const newSub = {
        id: body.id || `sub-${Date.now()}`,
        customer: body.customer || "Superblock Customer",
        customerId: body.customerId || "CUS-DEFAULT",
        plan: body.plan || "Growth",
        status: body.status || "Active",
        startDate: body.startDate || new Date().toISOString().split("T")[0],
        renewalDate: body.renewalDate || body.endDate || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
        cycle: body.cycle || body.billingInterval || "Annual",
        mrr: Number(body.amount) || Number(body.mrr) || 2500,
        amount: (Number(body.amount) || Number(body.mrr) || 2500) * 12,
        payment: "Paid",
        autoRenewal: body.autoRenewal ?? true,
      };
      fallbackSubscriptions = [newSub, ...fallbackSubscriptions.filter((s) => s.id !== newSub.id)];
      return res.status(200).json({ success: true, offline: true, subscription: newSub });
    } catch (error: any) {
      console.warn("POST /api/subscriptions failed, storing in fallback:", error?.message);
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const newSub = {
        id: body.id || `sub-${Date.now()}`,
        customer: body.customer || "Superblock Customer",
        customerId: body.customerId || "CUS-DEFAULT",
        plan: body.plan || "Growth",
        status: body.status || "Active",
        startDate: body.startDate || new Date().toISOString().split("T")[0],
        renewalDate: body.renewalDate || body.endDate || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
        cycle: body.cycle || body.billingInterval || "Annual",
        mrr: Number(body.amount) || Number(body.mrr) || 2500,
        amount: (Number(body.amount) || Number(body.mrr) || 2500) * 12,
        payment: "Paid",
        autoRenewal: body.autoRenewal ?? true,
      };
      fallbackSubscriptions = [newSub, ...fallbackSubscriptions.filter((s) => s.id !== newSub.id)];
      return res.status(200).json({ success: true, offline: true, subscription: newSub });
    }
  });

  app.put("/api/subscriptions/:id", (req, res) => {
    const id = req.params.id;
    const updates = req.body || {};
    const existing = fallbackSubscriptions.find((s) => s.id === id);
    if (existing) {
      Object.assign(existing, updates);
    }
    return res.json({ success: true, subscription: existing || updates });
  });

  app.delete("/api/subscriptions/:id", (req, res) => {
    const id = req.params.id;
    fallbackSubscriptions = fallbackSubscriptions.filter((s) => s.id !== id);
    return res.json({ success: true, id });
  });

  // Credentials endpoint
  app.get("/api/credentials", async (req, res) => {
    try {
      const result = await getCredentialsHandler({
        httpMethod: "GET",
        path: "/credentials",
        headers: req.headers as Record<string, string | undefined>,
        queryStringParameters: req.query as Record<string, string | undefined>,
      });
      let responseData: unknown;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error fetching credentials:", error);
      return res.status(500).json({ success: false, error: error?.message || "Internal server error", credentials: null });
    }
  });

  // Products endpoints (GET, POST, PUT, DELETE)
  app.get("/api/products", async (req, res) => {
    try {
      const result = await getProductsHandler({
        httpMethod: "GET",
        path: "/products",
        headers: req.headers as Record<string, string | undefined>,
        queryStringParameters: req.query as Record<string, string | undefined>,
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (result.statusCode >= 200 && result.statusCode < 300 && Array.isArray(responseData?.products) && responseData.products.length > 0) {
        return res.status(result.statusCode).json(responseData);
      }
      return res.status(200).json({ success: true, count: fallbackProducts.length, products: fallbackProducts, offline: true });
    } catch (error: any) {
      console.warn("Error fetching products (DB offline), serving fallback:", error?.message);
      return res.status(200).json({ success: true, count: fallbackProducts.length, products: fallbackProducts, offline: true });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const result = await createProductHandler({
        httpMethod: "POST",
        path: "/products",
        headers: req.headers as Record<string, string | undefined>,
        body: JSON.stringify({
          customerId: body.customerId || "superblock",
          name: body.name,
          category: body.category,
          billing: body.model || body.billing,
          description: body.description,
          price: body.price,
        }),
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (result.statusCode >= 200 && result.statusCode < 300 && responseData?.success) {
        return res.status(result.statusCode).json(responseData);
      }
      // Offline fallback
      const newProduct = {
        id: body.id || `prod-${Date.now()}`,
        name: body.name || "New Product",
        category: body.category || "General",
        model: body.model || body.billing || "Usage based",
        status: body.status || "Active",
        plans: body.plans ?? 1,
        customers: body.customers ?? 0,
        description: body.description || `${body.category || "General"} capabilities.`,
      };
      fallbackProducts = [newProduct, ...fallbackProducts.filter((p) => p.id !== newProduct.id)];
      return res.status(200).json({ success: true, offline: true, product: newProduct });
    } catch (error: any) {
      console.warn("POST /api/products failed, storing in fallback:", error?.message);
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const newProduct = {
        id: body.id || `prod-${Date.now()}`,
        name: body.name || "New Product",
        category: body.category || "General",
        model: body.model || body.billing || "Usage based",
        status: body.status || "Active",
        plans: body.plans ?? 1,
        customers: body.customers ?? 0,
        description: body.description || `${body.category || "General"} capabilities.`,
      };
      fallbackProducts = [newProduct, ...fallbackProducts.filter((p) => p.id !== newProduct.id)];
      return res.status(200).json({ success: true, offline: true, product: newProduct });
    }
  });

  app.put("/api/products/:id", (req, res) => {
    const id = req.params.id;
    const updates = req.body || {};
    const existing = fallbackProducts.find((p) => p.id === id);
    if (existing) {
      Object.assign(existing, updates);
    }
    return res.json({ success: true, product: existing || updates });
  });

  app.delete("/api/products/:id", (req, res) => {
    const id = req.params.id;
    fallbackProducts = fallbackProducts.filter((p) => p.id !== id);
    return res.json({ success: true, id });
  });

  // Plans endpoints (GET, POST, PUT, DELETE)
  app.get("/api/plans", (_req, res) => {
    return res.json({ success: true, count: fallbackPlans.length, plans: fallbackPlans });
  });

  app.post("/api/plans", (req, res) => {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const newPlan = {
      id: body.id || `plan-${Date.now()}`,
      name: body.name || "New Plan",
      product: body.product || "Omnichannel Suite",
      monthly: body.monthly ?? 0,
      annual: body.annual ?? ((body.monthly || 0) * 10),
      limit: body.limit || "Unlimited broadcasts",
      features: body.features ?? 8,
      status: body.status || "Active",
    };
    fallbackPlans = [newPlan, ...fallbackPlans.filter((p) => p.id !== newPlan.id)];
    return res.status(200).json({ success: true, plan: newPlan });
  });

  app.put("/api/plans/:id", (req, res) => {
    const id = req.params.id;
    const updates = req.body || {};
    const existing = fallbackPlans.find((p) => p.id === id);
    if (existing) {
      Object.assign(existing, updates);
    }
    return res.json({ success: true, plan: existing || updates });
  });

  app.delete("/api/plans/:id", (req, res) => {
    const id = req.params.id;
    fallbackPlans = fallbackPlans.filter((p) => p.id !== id);
    return res.json({ success: true, id });
  });

  // Team endpoints (GET, POST, PUT, DELETE)
  app.get("/api/team", async (req, res) => {
    try {
      const result = await getTeamMembersHandler({
        httpMethod: "GET",
        path: "/team-members",
        headers: req.headers as Record<string, string | undefined>,
        queryStringParameters: req.query as Record<string, string | undefined>,
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (result.statusCode >= 200 && result.statusCode < 300 && Array.isArray(responseData?.teamMembers) && responseData.teamMembers.length > 0) {
        return res.status(result.statusCode).json(responseData);
      }
      return res.status(200).json({ success: true, count: fallbackTeamMembers.length, teamMembers: fallbackTeamMembers, offline: true });
    } catch (error: any) {
      console.warn("Error fetching team (DB offline), serving fallback:", error?.message);
      return res.status(200).json({ success: true, count: fallbackTeamMembers.length, teamMembers: fallbackTeamMembers, offline: true });
    }
  });

  app.post("/api/team", async (req, res) => {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const result = await createTeamMemberHandler({
        httpMethod: "POST",
        path: "/team-members",
        headers: req.headers as Record<string, string | undefined>,
        body: JSON.stringify({
          customerId: "superblock",
          name: body.name,
          email: body.email,
          role: body.role,
        }),
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (result.statusCode >= 200 && result.statusCode < 300 && responseData?.success) {
        return res.status(result.statusCode).json(responseData);
      }
      // Offline fallback
      const initials = (body.name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      const newMember = {
        id: body.id || `tm-${Date.now()}`,
        name: body.name || "New Member",
        initials: body.initials || initials,
        email: body.email || "member@superblock.chat",
        role: body.role || "Customer Success",
        department: body.department || "Customer",
        customers: body.customers ?? 0,
        status: body.status || "Active",
        lastActive: "Just now",
      };
      fallbackTeamMembers = [newMember, ...fallbackTeamMembers.filter((m) => m.id !== newMember.id && m.email !== newMember.email)];
      return res.status(200).json({ success: true, offline: true, teamMember: newMember });
    } catch (error: any) {
      console.warn("POST /api/team failed, storing in fallback:", error?.message);
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const initials = (body.name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      const newMember = {
        id: body.id || `tm-${Date.now()}`,
        name: body.name || "New Member",
        initials: body.initials || initials,
        email: body.email || "member@superblock.chat",
        role: body.role || "Customer Success",
        department: body.department || "Customer",
        customers: body.customers ?? 0,
        status: body.status || "Active",
        lastActive: "Just now",
      };
      fallbackTeamMembers = [newMember, ...fallbackTeamMembers.filter((m) => m.id !== newMember.id && m.email !== newMember.email)];
      return res.status(200).json({ success: true, offline: true, teamMember: newMember });
    }
  });

  app.put("/api/team/:id", (req, res) => {
    const id = req.params.id;
    const updates = req.body || {};
    const existing = fallbackTeamMembers.find((m) => m.id === id || m.email === id);
    if (existing) {
      Object.assign(existing, updates);
    }
    return res.json({ success: true, teamMember: existing || updates });
  });

  app.delete("/api/team/:id", (req, res) => {
    const id = req.params.id;
    fallbackTeamMembers = fallbackTeamMembers.filter((m) => m.id !== id && m.email !== id);
    return res.json({ success: true, id });
  });

  // Settings endpoints (GET, POST)
  app.get("/api/settings", (_req, res) => {
    return res.json({ success: true, settings: fallbackSettings });
  });

  app.post("/api/settings", (req, res) => {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    fallbackSettings = {
      ...fallbackSettings,
      ...body,
      profile: { ...fallbackSettings.profile, ...(body.profile || {}) },
      notifications: { ...fallbackSettings.notifications, ...(body.notifications || {}) },
      security: { ...fallbackSettings.security, ...(body.security || {}) },
    };
    return res.json({ success: true, settings: fallbackSettings });
  });

  // Customer Profile Update endpoint
  app.put("/api/customers/:id", (req, res) => {
    const id = req.params.id;
    const updates = req.body || {};
    customerOverrides.set(id, { ...(customerOverrides.get(id) || {}), ...updates, updatedAt: new Date().toISOString() });
    return res.json({ success: true, customerId: id, updates: customerOverrides.get(id) });
  });

  app.get("/api/customers/:id/overrides", (req, res) => {
    const id = req.params.id;
    return res.json({ success: true, customerId: id, overrides: customerOverrides.get(id) || null });
  });

  // Usage Metrics endpoint
  app.get("/api/usage-metrics", async (req, res) => {
    try {
      const result = await getUsageMetricsHandler({
        httpMethod: "GET",
        path: "/usage-metrics",
        headers: req.headers as Record<string, string | undefined>,
        queryStringParameters: req.query as Record<string, string | undefined>,
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (result.statusCode >= 200 && result.statusCode < 300) {
        return res.status(result.statusCode).json(responseData);
      }
      return res.json({
        success: true,
        offline: true,
        summary: {
          messages: 24800000,
          apiRequests: 51200000,
          automations: 642000,
          storageGb: 18400,
          activeConversations: 8240,
        },
      });
    } catch {
      return res.json({
        success: true,
        offline: true,
        summary: {
          messages: 24800000,
          apiRequests: 51200000,
          automations: 642000,
          storageGb: 18400,
          activeConversations: 8240,
        },
      });
    }
  });

  // Customer Offerings endpoints
  app.get("/api/customer-offerings", async (req, res) => {
    try {
      const result = await getCustomerOfferingsHandler({
        httpMethod: "GET",
        path: "/customer-offerings",
        headers: req.headers as Record<string, string | undefined>,
        queryStringParameters: req.query as Record<string, string | undefined>,
      });
      let responseData: unknown;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error fetching customer offerings:", error);
      return res.status(500).json({ success: false, error: error?.message || "Internal server error", offerings: [] });
    }
  });

  app.post("/api/customer-offerings", async (req, res) => {
    try {
      const result = await createCustomerOfferingHandler({
        httpMethod: "POST",
        path: "/customer-offerings",
        headers: req.headers as Record<string, string | undefined>,
        body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      });
      let responseData: any;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        responseData = { message: result.body };
      }
      if (
        result.statusCode >= 500 ||
        (responseData && !responseData.success && (responseData.error?.includes("ECONNRESET") || responseData.error?.includes("connect")))
      ) {
        const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
        return res.status(200).json({
          success: true,
          offline: true,
          offering: {
            id: `offering-${Date.now()}`,
            customer_id: bodyObj.customerId || bodyObj.customer_id,
            offering_name: bodyObj.offeringName || "Custom Offering",
            status: bodyObj.status || "Active",
            start_date: bodyObj.startDate || new Date().toISOString(),
            end_date: bodyObj.endDate || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }
      return res.status(result.statusCode).json(responseData);
    } catch (error: any) {
      console.error("Error creating customer offering:", error);
      const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      return res.status(200).json({
        success: true,
        offline: true,
        offering: {
          id: `offering-${Date.now()}`,
          customer_id: bodyObj.customerId || bodyObj.customer_id,
          offering_name: bodyObj.offeringName || "Custom Offering",
          status: bodyObj.status || "Active",
          start_date: bodyObj.startDate || new Date().toISOString(),
          end_date: bodyObj.endDate || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }
  });

export async function startServer() {
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

const isVite = process.argv.some((arg) => arg.includes("vite"));
if (!isVite) {
  startServer().catch(console.error);
}
