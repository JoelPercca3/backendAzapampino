import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: "mediaflows_0b9c65ac-a555-4fd5-a79e-8649ea3e3aef",
  api_key: "453334958218823",
  api_secret: "22OD5CbG2RS6oh37_oCY5qNdeDs",
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
