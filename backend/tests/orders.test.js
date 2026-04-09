const request = require("supertest");
const app = require("../src/app");
const db = require("../src/shared/db");

let token;
let tableId;
let menuItemId;
let orderId;

beforeAll(async () => {
  const bcrypt = require("bcrypt");
  const hashed = await bcrypt.hash("password123", 10);
  await db.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO NOTHING`,
    ["orders_admin@test.com", hashed],
  );
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "orders_admin@test.com", password: "password123" });
  token = res.body.token;

  const {
    rows: [table],
  } = await db.query(
    `INSERT INTO tables (number, seats) VALUES (99, 4) RETURNING *`,
  );
  tableId = table.id;

  const {
    rows: [item],
  } = await db.query(
    `INSERT INTO menu_items (name, price, category) VALUES ('Test Item', 10.00, 'mains') RETURNING *`,
  );
  menuItemId = item.id;
});

afterAll(async () => {
  if (orderId) {
    await db.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);
    await db.query("DELETE FROM orders WHERE id = $1", [orderId]);
  }
  await db.query("DELETE FROM tables WHERE number = 99");
  await db.query(`DELETE FROM menu_items WHERE name = 'Test Item'`);
  await db.query(`DELETE FROM users WHERE email = 'orders_admin@test.com'`);
});

describe("POST /api/orders", () => {
  it("creates an order", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tableId,
        items: [{ menuItemId, quantity: 2, notes: "No onions" }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    orderId = res.body.id;
  });

  it("rejects order with no items", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ tableId, items: [] });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/orders/:id", () => {
  it("retrieves the created order", async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
  });
});
