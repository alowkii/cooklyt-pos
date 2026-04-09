const request = require("supertest");
const app = require("../src/app");
const db = require("../src/shared/db");

let adminToken;
let createdItemId;

beforeAll(async () => {
  const bcrypt = require("bcrypt");
  const hashed = await bcrypt.hash("password123", 10);
  await db.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO NOTHING`,
    ["menutest_admin@test.com", hashed],
  );
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "menutest_admin@test.com", password: "password123" });
  adminToken = res.body.token;
});

afterAll(async () => {
  if (createdItemId) {
    await db.query("DELETE FROM menu_items WHERE id = $1", [createdItemId]);
  }
  await db.query(`DELETE FROM users WHERE email = 'menutest_admin@test.com'`);
});

describe("GET /api/menu", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/menu");
    expect(res.status).toBe(401);
  });

  it("returns menu items", async () => {
    const res = await request(app)
      .get("/api/menu")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/menu", () => {
  it("creates a menu item as admin", async () => {
    const res = await request(app)
      .post("/api/menu")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Test Burger", price: 9.99, category: "mains" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test Burger");
    createdItemId = res.body.id;
  });

  it("rejects item without name", async () => {
    const res = await request(app)
      .post("/api/menu")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 5.0 });
    expect(res.status).toBe(400);
  });
});
