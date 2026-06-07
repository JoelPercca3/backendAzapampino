import upload from "./upload-cloudinary.js";
import { Router } from "express";

const router = Router();

router.post("/", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No se recibió ningún archivo" });
    }
    console.log("Imagen subida a Cloudinary:", req.file.path);
    res.json({ success: true, url: req.file.path });
  } catch (error) {
    console.error("Error en upload:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
