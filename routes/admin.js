import { Router } from "express";
import pool from "../db/connection.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// ─────────────────────────────────────────
// CATEGORÍAS
// ─────────────────────────────────────────

router.get("/categories", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM categories ORDER BY sort_order",
    );
    res.json({ success: true, categories: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/categories", requireAdmin, async (req, res) => {
  try {
    const { name, icon = "🍽️", sort_order = 0 } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Nombre requerido" });
    const [r] = await pool.query(
      "INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)",
      [name, icon, sort_order],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const { name, icon, sort_order } = req.body;
    await pool.query(
      "UPDATE categories SET name=?, icon=?, sort_order=? WHERE id=?",
      [name, icon, sort_order, req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────
// PLATOS
// ─────────────────────────────────────────

router.get("/items", requireAdmin, async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT mi.*, c.name AS category_name
      FROM menu_items mi
      JOIN categories c ON c.id = mi.category_id
      ORDER BY c.sort_order, mi.sort_order, mi.name
    `);
    const [variants] = await pool.query(
      "SELECT * FROM item_variants ORDER BY id",
    );

    const variantsMap = {};
    variants.forEach((v) => {
      if (!variantsMap[v.menu_item_id]) variantsMap[v.menu_item_id] = [];
      variantsMap[v.menu_item_id].push(v);
    });

    const result = items.map((i) => ({
      ...i,
      variants: variantsMap[i.id] || [],
    }));
    res.json({ success: true, items: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/items", requireAdmin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      category_id,
      name,
      description,
      price,
      image_url,
      sort_order = 0,
      variants = [],
    } = req.body;
    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos requeridos (nombre, precio, categoría)",
      });
    }
    const [r] = await conn.query(
      "INSERT INTO menu_items (category_id, name, description, price, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [category_id, name, description, price, image_url, sort_order],
    );
    const itemId = r.insertId;

    for (const v of variants) {
      await conn.query(
        "INSERT INTO item_variants (menu_item_id, name, price_modifier) VALUES (?, ?, ?)",
        [itemId, v.name, v.price_modifier || 0],
      );
    }

    await conn.commit();
    res.json({ success: true, id: itemId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

router.put("/items/:id", requireAdmin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      category_id,
      name,
      description,
      price,
      image_url,
      sort_order,
      variants = [],
    } = req.body;

    await conn.query(
      "UPDATE menu_items SET category_id=?, name=?, description=?, price=?, image_url=?, sort_order=? WHERE id=?",
      [
        category_id,
        name,
        description,
        price,
        image_url,
        sort_order,
        req.params.id,
      ],
    );

    await conn.query("DELETE FROM item_variants WHERE menu_item_id = ?", [
      req.params.id,
    ]);
    for (const v of variants) {
      await conn.query(
        "INSERT INTO item_variants (menu_item_id, name, price_modifier) VALUES (?, ?, ?)",
        [req.params.id, v.name, v.price_modifier || 0],
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

router.patch("/items/:id/toggle", requireAdmin, async (req, res) => {
  try {
    await pool.query(
      "UPDATE menu_items SET available = NOT available WHERE id = ?",
      [req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/items/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM menu_items WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/sales-by-day?month=2026-06
router.get("/sales-by-day", requireAdmin, async (req, res) => {
  try {
    const { month } = req.query;
    const dateFilter = month || new Date().toISOString().slice(0, 7);

    const [rows] = await pool.query(
      `
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total ELSE 0 END), 0) as revenue,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as orders
      FROM orders
      WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
      [dateFilter],
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────
// ESTADÍSTICAS DEL DÍA - MEJORADO
// ─────────────────────────────────────────

router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const [[totals]] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total ELSE 0 END), 0) AS confirmed_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders,
        COALESCE(COUNT(CASE WHEN status = 'confirmed' THEN 1 END), 0) AS confirmed_count
      FROM orders
      WHERE DATE(created_at) = ?
    `,
      [date],
    );

    const [[avgTicket]] = await pool.query(
      `
      SELECT COALESCE(AVG(total), 0) AS average_ticket
      FROM orders
      WHERE DATE(created_at) = ? AND status = 'confirmed'
    `,
      [date],
    );

    const [byPayment] = await pool.query(
      `
      SELECT payment_method, COUNT(*) as count, SUM(total) as total
      FROM orders
      WHERE DATE(created_at) = ? AND status != 'cancelled'
      GROUP BY payment_method
    `,
      [date],
    );

    const [topItems] = await pool.query(
      `
      SELECT oi.item_name, SUM(oi.quantity) AS qty, SUM(oi.subtotal) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE DATE(o.created_at) = ? AND o.status != 'cancelled'
      GROUP BY oi.item_name
      ORDER BY qty DESC
      LIMIT 5
    `,
      [date],
    );

    res.json({
      success: true,
      totals: {
        total_orders: totals.total_orders || 0,
        confirmed_revenue: Number(totals.confirmed_revenue) || 0,
        total_revenue: Number(totals.total_revenue) || 0,
        cancelled_orders: totals.cancelled_orders || 0,
        confirmed_count: totals.confirmed_count || 0,
      },
      average_ticket: Number(avgTicket.average_ticket) || 0,
      byPayment,
      topItems,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
