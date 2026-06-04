import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "recreo_secret_2024";

// Verifica que el request tenga un token válido
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "No autorizado — inicia sesión" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res
      .status(401)
      .json({
        success: false,
        message: "Sesión expirada — vuelve a iniciar sesión",
      });
  }
}

// Solo permite el rol 'admin'
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin")
      return res
        .status(403)
        .json({
          success: false,
          message: "Acceso denegado — se requiere rol admin",
        });
    next();
  });
}
