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
    ["kitchen_admin@test.com", hashed],
  );

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "kitchen_admin@test.com", password: "password123" });
  token = res.body.token;

  const { rows: [table] } = await db.query(
    `INSERT INTO tables (number, seats) VALUES (97, 4) RETURNING *`,
  );
  tableId = table.id;

  const { rows: [item] } = await db.query(
    `INSERT INTO menu_items (name, price, category) VALUES ('Kitchen Test Item', 12.00, 'mains') RETURNING *`,
  );
  menuItemId = item.id;

  const orderRes = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ tableId, items: [{ menuItemId, quantity: 1 }] });
  orderId = orderRes.body.id;
});

afterAll(async () => {
  if (orderId) {
    await db.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);
    await db.query("DELETE FROM orders WHERE id = $1", [orderId]);
  }
  await db.query("DELETE FROM tables WHERE number = 97");
  await db.query(`DELETE FROM menu_items WHERE name = 'Kitchen Test Item'`);
  await db.query(`DELETE FROM users WHERE email = 'kitchen_admin@test.com'`);
});

describe("GET /api/kitchen/queue", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/kitchen/queue");
    expect(res.status).toBe(401);
  });

  it("returns kitchen queue with order items", async () => {
    const res = await request(app)
      .get("/api/kitchen/queue")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Our newly created order should be in the queue
    const entry = res.body.find((i) => i.order_id === orderId);
    expect(entry).toBeDefined();
    expect(entry.item_name).toBe("Kitchen Test Item");
  });
});

describe("PATCH /api/kitchen/:orderId/preparing", () => {
  it("marks an order as preparing", async () => {
    const res = await request(app)
      .patch(`/api/kitchen/${orderId}/preparing`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("preparing");
  });
});

describe("PATCH /api/kitchen/:orderId/ready", () => {
  it("marks an order as ready", async () => {
    const res = await request(app)
      .patch(`/api/kitchen/${orderId}/ready`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
  });
});
