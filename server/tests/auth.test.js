require("./setup");

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

describe("Auth APIs", () => {
  afterAll(async () => {
  await mongoose.connection.close();
});

  test("Signup success", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        email: "test@test.com",
        password: "Password@123"
      });

    expect(res.statusCode).toBe(201);
  });

  test("Reject duplicate email", async () => {
    await request(app).post("/api/auth/signup").send({
      email: "test@test.com",
      password: "Password@123"
    });

    const res = await request(app).post("/api/auth/signup").send({
      email: "test@test.com",
      password: "Password@123"
    });

    expect(res.statusCode).toBe(400);
  });

  test("Login success", async () => {
    await request(app).post("/api/auth/signup").send({
      email: "test@test.com",
      password: "Password@123"
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "test@test.com",
      password: "Password@123"
    });

    expect(res.headers["set-cookie"]).toBeDefined();
  });


});