import upload from "./upload-cloudinary.js";
import { Router } from "express";

const router = Router();

router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No se recibió ningún archivo" });
  }

  // ✅ Cloudinary ya devuelve la URL completa en req.file.path
  // No modifiques la URL, úsala directamente
  const imageUrl = req.file.path;

  console.log("✅ Imagen subida a Cloudinary:", imageUrl);
  res.json({ success: true, url: imageUrl });
});

export default router;
