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

  test("Preserve special characters and toggle todo completion", async () => {
    const createRes = await request(app)
      .post("/api/todos")
      .set("Cookie", cookie)
      .send({ text: "Review / update <task> & notes" });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.data.text).toBe("Review / update <task> & notes");

    const toggleRes = await request(app)
      .patch(`/api/todos/${createRes.body.data._id}`)
      .set("Cookie", cookie);

    expect(toggleRes.statusCode).toBe(200);
    expect(toggleRes.body.data.completed).toBe(true);
  });

  test("Reject unauthenticated access", async () => {
    const res = await request(app).get("/api/todos");

    expect(res.statusCode).toBe(401);
  });
});