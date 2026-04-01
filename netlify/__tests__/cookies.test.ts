import { describe, it, expect } from "vitest";
import { parseCookies } from "../functions/lib/cookies";

describe("parseCookies", () => {
  it("should correctly parse cookie values containing '=' characters", () => {
    // Base64-encoded values or JWT tokens may contain '='
    const header = "token=abc==; session=xyz=123";
    const result = parseCookies(header);
    expect(result["token"]).toBe("abc==");
    expect(result["session"]).toBe("xyz=123");
  });
});
