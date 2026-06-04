import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carpeta donde se guardan las imágenes
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // máx 3MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP"));
  },
});

// POST /api/upload — sube una imagen y devuelve la URL
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "No se recibió ningún archivo" });

  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

export default router;
