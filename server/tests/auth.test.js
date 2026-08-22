require("./setup");

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

describe("Auth APIs", () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("Signup success", async () => {
    const email = `test-${Date.now()}@test.com`;
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        firstName: "Test",
        lastName: "User",
        email,
        password: "Password@123"
      });

    expect(res.statusCode).toBe(201);
  });

  test("Reject duplicate email", async () => {
    const email = `dup-${Date.now()}@test.com`;
    await request(app).post("/api/auth/signup").send({
      firstName: "Test",
      lastName: "User",
      email,
      password: "Password@123"
    });

    const res = await request(app).post("/api/auth/signup").send({
      firstName: "Test",
      lastName: "User",
      email,
      password: "Password@123"
    });

    expect(res.statusCode).toBe(400);
  });

  test("Login success", async () => {
    const email = `login-${Date.now()}@test.com`;
    await request(app).post("/api/auth/signup").send({
      firstName: "Test",
      lastName: "User",
      email,
      password: "Password@123"
    });

    const res = await request(app).post("/api/auth/login").send({
      email,
      password: "Password@123"
    });

    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("Check auth - unauthenticated", async () => {
    const res = await request(app).get("/api/auth/check");
    expect(res.statusCode).toBe(401);
  });

  test("Check auth - authenticated", async () => {
    const email = `check-${Date.now()}@test.com`;
    await request(app).post("/api/auth/signup").send({
      firstName: "Test",
      lastName: "User",
      email,
      password: "Password@123"
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password: "Password@123"
    });

    const cookie = loginRes.headers["set-cookie"];
    expect(cookie).toBeDefined();

    const res = await request(app)
      .get("/api/auth/check")
      .set("Cookie", cookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

});