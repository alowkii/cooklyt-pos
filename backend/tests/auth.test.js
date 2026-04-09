const request = require("supertest");
const app = require("../src/app");
const db = require("../src/shared/db");

beforeAll(async () => {
  await db.query(`DELETE FROM users WHERE email LIKE '%@test.com'`);
});

afterAll(async () => {
  await db.query(`DELETE FROM users WHERE email LIKE '%@test.com'`);
});

describe("POST /api/auth/login", () => {
  it("returns 401 for unknown user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns a token for valid credentials", async () => {
    // Seed a user directly
    const bcrypt = require("bcrypt");
    const hashed = await bcrypt.hash("password123", 10);
    await db.query(
      `INSERT INTO users (email, password, role) VALUES ($1, $2, 'admin')`,
      ["admin@test.com", hashed],
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("admin@test.com");
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
    token = res.body.token;
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
