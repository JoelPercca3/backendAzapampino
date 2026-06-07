import "dotenv/config";
import express from "express";
import cors from "cors";
import uploadRoutes from "./routes/upload.js";
import path from "path";
import { fileURLToPath } from "url";
import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/orders.js";
import printRoutes from "./routes/print.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: "*" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/print", printRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Ruta no encontrada" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(500)
    .json({ success: false, message: "Error interno del servidor" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Backend corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health check:    http://localhost:${PORT}/api/health`);
  console.log(`🌐 Acceso LAN:      http://<TU_IP>:${PORT}/api\n`);
});
