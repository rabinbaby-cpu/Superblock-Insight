import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

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

startServer().catch(console.error);
