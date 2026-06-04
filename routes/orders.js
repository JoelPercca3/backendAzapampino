import { Router } from "express";
import pool from "../db/connection.js";

const router = Router();

// POST /api/orders — crear pedido
router.post("/", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      table_name,
      customer_name,
      items,
      payment_method = "cash",
      notes,
    } = req.body;

    if (!items || !items.length) {
      return res
        .status(400)
        .json({ success: false, message: "El pedido no tiene ítems" });
    }

    const subtotal = items.reduce(
      (acc, it) => acc + it.unit_price * it.quantity,
      0,
    );
    const total = subtotal;

    const [orderResult] = await conn.query(
      `INSERT INTO orders (table_name, customer_name, subtotal, total, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [table_name, customer_name, subtotal, total, payment_method, notes],
    );
    const orderId = orderResult.insertId;

    for (const it of items) {
      await conn.query(
        `INSERT INTO order_items
           (order_id, menu_item_id, combo_id, variant_id, item_name, unit_price, quantity, subtotal, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          it.menu_item_id || null,
          it.combo_id || null,
          it.variant_id || null,
          it.item_name,
          it.unit_price,
          it.quantity,
          it.unit_price * it.quantity,
          it.notes || null,
        ],
      );
    }

    await conn.commit();
    res.json({ success: true, order_id: orderId, total });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/orders — listar pedidos del día
router.get("/", async (req, res) => {
  try {
    const { date = new Date().toISOString().slice(0, 10), status } = req.query;

    let sql = `
      SELECT o.*, COUNT(oi.id) AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE DATE(o.created_at) = ?
    `;
    const params = [date];

    if (status) {
      sql += " AND o.status = ?";
      params.push(status);
    }
    sql += " GROUP BY o.id ORDER BY o.created_at DESC";

    const [orders] = await pool.query(sql, params);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders/:id — detalle del pedido con sus ítems
router.get("/:id", async (req, res) => {
  try {
    const [[order]] = await pool.query("SELECT * FROM orders WHERE id = ?", [
      req.params.id,
    ]);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Pedido no encontrado" });

    const [items] = await pool.query(
      "SELECT * FROM order_items WHERE order_id = ? ORDER BY id",
      [req.params.id],
    );
    res.json({ success: true, order: { ...order, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Estado inválido" });
    }
    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
