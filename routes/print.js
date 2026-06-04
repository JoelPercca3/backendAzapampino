import { Router } from "express";
import pool from "../db/connection.js";

const router = Router();

const BUSINESS_NAME =
  process.env.BUSINESS_NAME || "RECREO CAMPESTRE EL PARAISO";
const BUSINESS_RUC = process.env.BUSINESS_RUC || "RUC: 20123456789";
const BUSINESS_ADDR = process.env.BUSINESS_ADDR || "Huancayo - Junin";

// FORZAR MODO SIMULACIÓN - Siempre mostrar en consola
const FORCE_SIMULATION = true; // Cambia a false cuando tengas impresora real

// Función para imprimir BOLETA DEL CLIENTE
async function printCustomerReceipt(order, items) {
  const now = new Date();

  // Siempre mostrar en consola si FORCE_SIMULATION está activo
  if (FORCE_SIMULATION) {
    console.log("\n========== BOLETA CLIENTE ==========");
    console.log(BUSINESS_NAME);
    console.log(BUSINESS_RUC);
    console.log(BUSINESS_ADDR);
    console.log("-------------------------------------");
    console.log(`Pedido    : #${String(order.id).padStart(5, "0")}`);
    console.log(`Fecha     : ${now.toLocaleDateString("es-PE")}`);
    console.log(`Hora      : ${now.toLocaleTimeString("es-PE")}`);
    if (order.table_name) console.log(`Mesa      : ${order.table_name}`);
    if (order.customer_name) console.log(`Cliente   : ${order.customer_name}`);
    console.log("-------------------------------------");

    items.forEach((it) => {
      const subtotal = Number(it.subtotal).toFixed(2);
      console.log(`${it.quantity}x ${it.item_name.padEnd(28)} S/ ${subtotal}`);
    });

    console.log("-------------------------------------");
    console.log(`TOTAL: S/ ${Number(order.total).toFixed(2)}`);

    const paymentLabels = {
      cash: "Efectivo",
      card: "Tarjeta",
      yape: "Yape",
      plin: "Plin",
    };
    console.log(
      `Pago: ${paymentLabels[order.payment_method] || order.payment_method}`,
    );
    if (order.notes) console.log(`Notas: ${order.notes}`);
    console.log("-------------------------------------");
    console.log("¡Gracias por su preferencia!");
    console.log("Vuelva pronto");
    console.log("=====================================\n");
    return;
  }

  // Código para impresión real (solo si FORCE_SIMULATION = false)
  console.log("🖨️ Intentando imprimir en impresora real...");
}

// Función para imprimir TICKET DE COCINA
async function printKitchenTicket(order, items) {
  const now = new Date();

  if (FORCE_SIMULATION) {
    console.log("\n========== TICKET COCINA ==========");
    console.log(`PEDIDO #${String(order.id).padStart(5, "0")}`);
    if (order.table_name) console.log(`Mesa: ${order.table_name}`);
    if (!order.table_name) console.log(`Mesa: Para llevar`);
    console.log(`Hora: ${now.toLocaleTimeString("es-PE")}`);
    console.log("-------------------------------------");

    items.forEach((it) => {
      console.log(`${it.quantity}x ${it.item_name}`);
      if (it.notes) console.log(`   * ${it.notes}`);
    });

    console.log("-------------------------------------");
    console.log("⏱️  URGENCIA: NORMAL");
    console.log("=====================================\n");
    return;
  }

  // Código para impresión real (solo si FORCE_SIMULATION = false)
  console.log("🖨️ Intentando imprimir ticket cocina...");
}

// POST /api/print/:orderId
router.post("/:orderId", async (req, res) => {
  try {
    const [[order]] = await pool.query("SELECT * FROM orders WHERE id = ?", [
      req.params.orderId,
    ]);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Pedido no encontrado" });
    }

    const [items] = await pool.query(
      "SELECT * FROM order_items WHERE order_id = ? ORDER BY id",
      [req.params.orderId],
    );

    // 1. Imprimir boleta para el cliente
    await printCustomerReceipt(order, items);

    // 2. Imprimir ticket para la cocina
    await printKitchenTicket(order, items);

    await pool.query("UPDATE orders SET printed = TRUE WHERE id = ?", [
      order.id,
    ]);

    res.json({
      success: true,
      message: "Boleta y ticket de cocina generados correctamente",
      order_id: order.id,
    });
  } catch (err) {
    console.error("Error al generar:", err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

export default router;
