import upload from "./upload-cloudinary.js";
import { Router } from "express";

const router = Router();

router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No se recibió ningún archivo" });
  }
  res.json({ success: true, url: req.file.path });
});

export default router;
