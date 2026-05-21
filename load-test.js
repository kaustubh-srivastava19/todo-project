import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
};

const BASE_URL = "http://localhost:5000";

export default function () {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: "test@example.com",
      password: "TestPassword123!"
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  check(loginRes, {
    "login success": (r) => r.status === 200,
  });

  const csrfToken = loginRes.cookies.csrfToken?.[0]?.value || "";
  const authToken = loginRes.cookies.token?.[0]?.value || "";

  const cookieHeader = `token=${authToken}; csrfToken=${csrfToken}`;

  const todoRes = http.post(
    `${BASE_URL}/api/todos`,
    JSON.stringify({
      text: `Load test task ${Date.now()}`
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
        "Cookie": cookieHeader
      }
    }
  );

  check(todoRes, {
    "todo created": (r) => r.status === 201 || r.status === 200,
  });

  sleep(1);
}