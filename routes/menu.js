import { Router } from "express";
import pool from "../db/connection.js";

const router = Router();

// GET /api/menu — todo el menú agrupado por categoría
router.get("/", async (req, res) => {
  try {
    const [categories] = await pool.query(
      "SELECT * FROM categories WHERE active = 1 ORDER BY sort_order",
    );

    const [items] = await pool.query(`
      SELECT mi.*, c.name AS category_name
      FROM menu_items mi
      JOIN categories c ON c.id = mi.category_id
      WHERE mi.available = 1
      ORDER BY mi.sort_order, mi.name
    `);

    const [variants] = await pool.query(
      "SELECT * FROM item_variants WHERE available = 1",
    );

    // Agrupar variantes por item
    const variantsMap = {};
    variants.forEach((v) => {
      if (!variantsMap[v.menu_item_id]) variantsMap[v.menu_item_id] = [];
      variantsMap[v.menu_item_id].push(v);
    });

    // Agrupar items por categoría
    const menu = categories.map((cat) => ({
      ...cat,
      items: items
        .filter((i) => i.category_id === cat.id)
        .map((i) => ({ ...i, variants: variantsMap[i.id] || [] })),
    }));

    // Ya no enviamos combos por separado
    res.json({ success: true, menu });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Error al obtener el menú" });
  }
});

// GET /api/menu/items/:id
router.get("/items/:id", async (req, res) => {
  try {
    const [[item]] = await pool.query(
      "SELECT * FROM menu_items WHERE id = ? AND available = 1",
      [req.params.id],
    );
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Plato no encontrado" });

    const [variants] = await pool.query(
      "SELECT * FROM item_variants WHERE menu_item_id = ? AND available = 1",
      [item.id],
    );
    res.json({ success: true, item: { ...item, variants } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/menu/items/:id/toggle — activar/desactivar plato
router.patch("/items/:id/toggle", async (req, res) => {
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

export default router;
