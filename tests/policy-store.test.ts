import { describe, it, expect } from "vitest";
import { getCompanyPolicy, searchPolicy } from "../agent/lib/policy-store.js";

describe("policy-store tenant isolation", () => {
  it("returns each company's own policy on successive lookups", () => {
    const acme = searchPolicy("acme", "software");
    expect(acme.company_name).toBe("Acme Robotics");

    const globex = searchPolicy("globex", "software");
    expect(globex.company_name).toBe("Globex Corporation");
    expect(globex.rules).toMatch(/VP approval/i);
  });

  it("throws for an unknown company_id instead of falling back to Acme", () => {
    expect(() => getCompanyPolicy("no-such-co")).toThrow(/Unknown company_id/);
    expect(() => searchPolicy("no-such-co", "software")).toThrow(/Unknown company_id/);
  });
});
