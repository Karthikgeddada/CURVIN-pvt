import { describe, expect, it } from "vitest";
import { cn } from "../src/shared/utilities/cn";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns an empty string for no input", () => {
    expect(cn()).toBe("");
  });
});
