const request = require("supertest");
const app = require("../src/app");
const db = require("../src/shared/db");

let adminToken;
let staffToken;
let createdTableId;

beforeAll(async () => {
  const bcrypt = require("bcrypt");
  const hashed = await bcrypt.hash("password123", 10);

  await db.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO NOTHING`,
    ["tables_admin@test.com", hashed],
  );
  await db.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, 'staff') ON CONFLICT (email) DO NOTHING`,
    ["tables_staff@test.com", hashed],
  );

  const adminRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "tables_admin@test.com", password: "password123" });
  adminToken = adminRes.body.token;

  const staffRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "tables_staff@test.com", password: "password123" });
  staffToken = staffRes.body.token;
});

afterAll(async () => {
  if (createdTableId) {
    await db.query("DELETE FROM tables WHERE id = $1", [createdTableId]);
  }
  await db.query(`DELETE FROM users WHERE email LIKE 'tables_%@test.com'`);
});

describe("GET /api/tables", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/tables");
    expect(res.status).toBe(401);
  });

  it("returns list of tables for authenticated user", async () => {
    const res = await request(app)
      .get("/api/tables")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/tables", () => {
  it("allows admin to create a table", async () => {
    const res = await request(app)
      .post("/api/tables")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ number: 999, seats: 4 });

    expect(res.status).toBe(201);
    expect(res.body.number).toBe(999);
    expect(res.body.seats).toBe(4);
    expect(res.body.status).toBe("available");
    createdTableId = res.body.id;
  });

  it("rejects creation without required fields", async () => {
    const res = await request(app)
      .post("/api/tables")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ number: 998 });
    expect(res.status).toBe(400);
  });

  it("forbids staff from creating a table", async () => {
    const res = await request(app)
      .post("/api/tables")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ number: 997, seats: 2 });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/tables/:id", () => {
  it("returns a specific table", async () => {
    const res = await request(app)
      .get(`/api/tables/${createdTableId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdTableId);
  });

  it("returns 404 for unknown table", async () => {
    const res = await request(app)
      .get("/api/tables/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/tables/:id/status", () => {
  it("updates table status", async () => {
    const res = await request(app)
      .patch(`/api/tables/${createdTableId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "occupied" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("occupied");
  });

  it("rejects invalid status", async () => {
    const res = await request(app)
      .patch(`/api/tables/${createdTableId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "on-fire" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/tables/:id", () => {
  it("forbids staff from deleting a table", async () => {
    const res = await request(app)
      .delete(`/api/tables/${createdTableId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it("allows admin to delete a table", async () => {
    const res = await request(app)
      .delete(`/api/tables/${createdTableId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
    createdTableId = null;
  });
});
