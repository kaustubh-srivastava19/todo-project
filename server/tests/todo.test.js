require("./setup");

const request = require("supertest");
const app = require("../server/app");

let cookie;

beforeEach(async () => {
  
  await request(app).post("/api/signup").send({
    email: "user@test.com",
    password: "Password@123"
  });

  const res = await request(app).post("/api/login").send({
    email: "user@test.com",
    password: "Password@123"
  });

  cookie = res.headers["set-cookie"];
});

describe("Todo APIs", () => {

  test("Create todo", async () => {
    const res = await request(app)
      .post("/api/todos")
      .set("Cookie", cookie)
      .send({ text: "Test Todo" });

    expect(res.statusCode).toBe(201);
  });

  test("Reject unauthenticated access", async () => {
    const res = await request(app)
      .get("/api/todos");

    expect(res.statusCode).toBe(401);
  });

});