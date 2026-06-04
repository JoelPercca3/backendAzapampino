import mysql from "mysql2/promise";
import "dotenv/config";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "recreo_pos",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
});

pool
  .getConnection()
  .then((conn) => {
    console.log("✅ MySQL conectado correctamente");
    conn.release();
  })
  .catch((err) => {
    console.error("❌ Error conectando a MySQL:", err.message);
    process.exit(1);
  });

export default pool;
