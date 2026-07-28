import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

const base = process.env.EVE_HOST ?? "http://127.0.0.1:2000";
const api = request(base);

describe("POST /eve/v1/review", () => {
  let serverUp = false;

  beforeAll(async () => {
    try {
      const res = await api.get("/eve/v1/health");
      serverUp = res.status < 500;
    } catch {
      serverUp = false;
    }
    if (!serverUp) {
      console.warn(
        `[review-http] Server not reachable at ${base}. Start with \`just dev\` to run HTTP tests.`
      );
    }
  });

  it("rejects incomplete submission without calling the model", async ({
    skip,
  }) => {
    if (!serverUp) {
      skip();
    }

    const res = await api.post("/eve/v1/review").send({
      company_id: "acme",
      label: "production",
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("Invalid expense submission.");
    expect(res.body.issues).toBeTruthy();
    expect(Array.isArray(res.body.issues)).toBe(true);
  });
});
