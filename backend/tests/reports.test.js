const request = require("supertest");
const app = require("../src/app");
const db = require("../src/shared/db");

let adminToken;
let staffToken;

beforeAll(async () => {
  const bcrypt = require("bcrypt");
  const hashed = await bcrypt.hash("password123", 10);

  await db.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO NOTHING`,
    ["reports_admin@test.com", hashed],
  );
  await db.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, 'staff') ON CONFLICT (email) DO NOTHING`,
    ["reports_staff@test.com", hashed],
  );

  const adminRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "reports_admin@test.com", password: "password123" });
  adminToken = adminRes.body.token;

  const staffRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "reports_staff@test.com", password: "password123" });
  staffToken = staffRes.body.token;
});

afterAll(async () => {
  await db.query(`DELETE FROM users WHERE email LIKE 'reports_%@test.com'`);
});

describe("GET /api/reports/daily", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/reports/daily");
    expect(res.status).toBe(401);
  });

  it("forbids staff from accessing reports", async () => {
    const res = await request(app)
      .get("/api/reports/daily")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it("returns daily summary for today", async () => {
    const res = await request(app)
      .get("/api/reports/daily")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("date");
    expect(res.body).toHaveProperty("summary");
    expect(res.body).toHaveProperty("byCategory");
    expect(res.body).toHaveProperty("topItems");
    expect(res.body).toHaveProperty("hourly");
  });

  it("returns daily summary for a specific date", async () => {
    const res = await request(app)
      .get("/api/reports/daily?date=2024-01-01")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.date).toBe("2024-01-01");
    expect(res.body.summary.total_orders).toBeDefined();
    expect(res.body.summary.total_revenue).toBeDefined();
  });

  it("returns structured arrays for byCategory, topItems, and hourly", async () => {
    const res = await request(app)
      .get("/api/reports/daily?date=2024-01-01")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.byCategory)).toBe(true);
    expect(Array.isArray(res.body.topItems)).toBe(true);
    expect(Array.isArray(res.body.hourly)).toBe(true);
  });
});
