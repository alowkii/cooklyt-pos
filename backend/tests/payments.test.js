const request = require("supertest");
const app = require("../src/app");
const db = require("../src/shared/db");

let token;
let orderId;
let tableId;
let menuItemId;

beforeAll(async () => {
  const bcrypt = require("bcrypt");
  const hashed = await bcrypt.hash("password123", 10);
  await db.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO NOTHING`,
    ["payments_admin@test.com", hashed],
  );
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "payments_admin@test.com", password: "password123" });
  token = res.body.token;

  const {
    rows: [table],
  } = await db.query(
    `INSERT INTO tables (number, seats) VALUES (98, 4) RETURNING *`,
  );
  tableId = table.id;

  const {
    rows: [item],
  } = await db.query(
    `INSERT INTO menu_items (name, price, category) VALUES ('Payment Test Item', 15.00, 'mains') RETURNING *`,
  );
  menuItemId = item.id;

  const orderRes = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ tableId, items: [{ menuItemId, quantity: 1 }] });
  orderId = orderRes.body.id;
});

afterAll(async () => {
  await db.query("DELETE FROM payments WHERE order_id = $1", [orderId]);
  await db.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);
  await db.query("DELETE FROM orders WHERE id = $1", [orderId]);
  await db.query("DELETE FROM tables WHERE number = 98");
  await db.query(`DELETE FROM menu_items WHERE name = 'Payment Test Item'`);
  await db.query(`DELETE FROM users WHERE email = 'payments_admin@test.com'`);
});

describe("POST /api/payments/:orderId", () => {
  it("processes a cash payment", async () => {
    const res = await request(app)
      .post(`/api/payments/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ method: "cash", amountTendered: 20.0 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.charged).toBe(15);
    expect(res.body.change).toBe(5);
  });

  it("rejects a second payment on a paid order", async () => {
    const res = await request(app)
      .post(`/api/payments/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ method: "cash", amountTendered: 20.0 });
    expect(res.status).toBe(400);
  });

  it("rejects invalid payment method", async () => {
    const res = await request(app)
      .post(`/api/payments/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ method: "bitcoin" });
    expect(res.status).toBe(400);
  });
});
