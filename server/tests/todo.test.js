require("./setup");

const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");

const agent = request.agent(app);

beforeEach(async () => {
  // Signup
  await agent.post("/api/auth/signup").send({
    email: "user@test.com",
    password: "Password@123",
  });

  // Login
  const res = await agent.post("/api/auth/login").send({
    email: "user@test.com",
    password: "Password@123",
  });

});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("Todo APIs", () => {

  test("Create todo", async () => {
    const res = await agent
      .post("/api/todos")
      .send({ text: "Test Todo" });

    expect(res.statusCode).toBe(201);
  });

  test("Reject unauthenticated access", async () => {
    const res = await request(app).get("/api/todos");

    expect(res.statusCode).toBe(401);
  });

});