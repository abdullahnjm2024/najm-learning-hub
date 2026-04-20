import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const dist = path.join(__dirname, "dist/public");

const app = express();

app.use((req, res, next) => {
  const isHashed = /\.(js|css|woff2?|ttf|eot)$/.test(req.path) && /[A-Za-z0-9]{8,}/.test(req.path);
  if (isHashed) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

app.use((req, res, next) => {
  console.log("PROD REQ:", req.method, req.url);
  next();
});

app.use(
  createProxyMiddleware({
    target: "http://127.0.0.1:8080",
    pathFilter: "/api",
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error("Proxy error:", err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: "proxy_error", message: err.message });
        }
      },
    },
  })
);

app.use(express.static(dist));

app.get("/{*path}", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(path.join(dist, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend serving on port ${PORT}`);
});
