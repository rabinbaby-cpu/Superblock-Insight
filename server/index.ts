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
      console.error("Error creating note:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Internal server error",
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
