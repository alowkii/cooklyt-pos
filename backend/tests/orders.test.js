const request = require("supertest");
const app = require("../src/app");
const db = require("../src/shared/db");
const { createTestUser, createRestaurant, deleteRestaurant, resetBuckets } = require("./helpers");

let token;
let tableId;
let menuItemId;
let orderId;
let restaurantId;

beforeAll(async () => {
  resetBuckets();
  restaurantId = await createRestaurant("Orders Test");
  token = await createTestUser(restaurantId, "orders_admin@test.com", "admin");

  const { rows: [table] } = await db.query(
    `INSERT INTO tables (number, seats, restaurant_id) VALUES (99, 4, $1) RETURNING *`,
    [restaurantId],
  );
  tableId = table.id;

  const { rows: [item] } = await db.query(
    `INSERT INTO menu_items (name, price, category, restaurant_id) VALUES ('Test Item', 10.00, 'mains', $1) RETURNING *`,
    [restaurantId],
  );
  menuItemId = item.id;
});

afterAll(async () => {
  await deleteRestaurant(restaurantId);
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
