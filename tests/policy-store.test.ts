import { describe, expect, it } from "vitest";
import { getCompanyPolicy, searchPolicy } from "../agent/lib/policy-store.js";

const VP_APPROVAL_RE = /VP approval/i;
const UNKNOWN_COMPANY_RE = /Unknown company_id/;

describe("policy-store tenant isolation", () => {
  it("returns each company's own policy on successive lookups", () => {
    const acme = searchPolicy("acme", "software");
    expect(acme.company_name).toBe("Acme Robotics");

    const globex = searchPolicy("globex", "software");
    expect(globex.company_name).toBe("Globex Corporation");
    expect(globex.rules).toMatch(VP_APPROVAL_RE);
  });

  it("throws for an unknown company_id instead of falling back to Acme", () => {
    expect(() => getCompanyPolicy("no-such-co")).toThrow(UNKNOWN_COMPANY_RE);
    expect(() => searchPolicy("no-such-co", "software")).toThrow(
      UNKNOWN_COMPANY_RE
    );
  });
});
