import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: "diotg5xa0", // ✅ Este es tu cloud name real
  api_key: "453334958218823",
  api_secret: "22OD5CbG2RS6oh37_oCY5qNdeDs",
});

// Verificar conexión
cloudinary.api.ping((error, result) => {
  if (error) {
    console.error("❌ Error conectando a Cloudinary:", error);
  } else {
    console.log("✅ Cloudinary conectado correctamente");
  }
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "azapampino",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 600, height: 600, crop: "limit" }],
  },
});

const upload = multer({ storage });

export default upload;
