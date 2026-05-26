const request = require("supertest");
const app = require("../src/app");
const db = require("../src/shared/db");
const { createTestUser, createRestaurant, deleteRestaurant, resetBuckets } = require("./helpers");

let token;
let orderId;
let restaurantId;

beforeAll(async () => {
  resetBuckets();
  restaurantId = await createRestaurant("Payments Test");
  token = await createTestUser(restaurantId, "payments_admin@test.com", "admin");

  const { rows: [table] } = await db.query(
    `INSERT INTO tables (number, seats, restaurant_id) VALUES (98, 4, $1) RETURNING *`,
    [restaurantId],
  );

  const { rows: [item] } = await db.query(
    `INSERT INTO menu_items (name, price, category, restaurant_id) VALUES ('Payment Test Item', 15.00, 'mains', $1) RETURNING *`,
    [restaurantId],
  );

  const orderRes = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ tableId: table.id, items: [{ menuItemId: item.id, quantity: 1 }] });
  orderId = orderRes.body.id;
});

afterAll(async () => {
  await deleteRestaurant(restaurantId);
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
