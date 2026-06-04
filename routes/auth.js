import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../db/connection.js";

const router = Router();
const SECRET = process.env.JWT_SECRET || "recreo_secret_2024";

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ success: false, message: "Usuario y contraseña requeridos" });

    const [[user]] = await pool.query(
      "SELECT * FROM users WHERE username = ? AND active = 1",
      [username],
    );

    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Usuario o contraseña incorrectos" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res
        .status(401)
        .json({ success: false, message: "Usuario o contraseña incorrectos" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      SECRET,
      { expiresIn: "12h" },
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/verify — verifica si el token sigue válido
router.post("/verify", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ success: false, message: "Token requerido" });

  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ success: true, user: decoded });
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Token inválido o expirado" });
  }
});

export default router;
