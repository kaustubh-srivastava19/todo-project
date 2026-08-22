require("./setup");

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

let cookie = null;

beforeEach(async () => {
  const email = `testuser${Date.now()}@example.com`;
  const signupRes = await request(app).post("/api/auth/signup").send({
    firstName: "Test",
    lastName: "User",
    email,
    password: "Password@123",
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email,
    password: "Password@123",
  });

  cookie = loginRes.headers["set-cookie"];
});

describe("Todo APIs", () => {
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  test("Create todo", async () => {
    const res = await request(app)
      .post("/api/todos")
      .set("Cookie", cookie)
      .send({ text: "Test Todo" });

    expect(res.statusCode).toBe(201);
  });

  test("Reject unauthenticated access", async () => {
    const res = await request(app).get("/api/todos");

    expect(res.statusCode).toBe(401);
  });
});