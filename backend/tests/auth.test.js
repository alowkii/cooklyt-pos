const request = require("supertest");
const app = require("../src/app");
const db = require("../src/shared/db");
const bcrypt = require("bcrypt");
const { extractToken, createRestaurant, deleteRestaurant, resetBuckets } = require("./helpers");

let restaurantId;

beforeAll(async () => {
  resetBuckets();
  await db.query(`DELETE FROM users WHERE email = 'admin@test.com'`);
  restaurantId = await createRestaurant("Auth Test");
});

afterAll(async () => {
  await deleteRestaurant(restaurantId);
});

describe("POST /api/auth/login", () => {
  it("returns 401 for unknown user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("sets a cookie and returns user info for valid credentials", async () => {
    const hashed = await bcrypt.hash("password123", 10);
    await db.query(
      `INSERT INTO users (email, password, role, restaurant_id, password_changed_at)
       VALUES ($1, $2, 'admin', $3, NOW() - INTERVAL '1 hour')`,
      ["admin@test.com", hashed, restaurantId],
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe("admin@test.com");
    expect(extractToken(res)).toBeTruthy();
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "password123" });
    token = extractToken(res);
  });

  it("returns user profile with valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("admin@test.com");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
