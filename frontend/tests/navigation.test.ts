import { describe, expect, it } from "vitest";
import {
  FUTURE_MODULES,
  NAV_GROUPS,
  groupForPath,
} from "../src/app/config/navigation";

describe("navigation registry", () => {
  it("covers every future item with module copy", () => {
    const futurePaths = NAV_GROUPS.flatMap((group) =>
      group.items
        .filter((item) => item.status === "future")
        .map((item) => item.path),
    );
    expect(futurePaths.length).toBeGreaterThan(10);
    for (const path of futurePaths) {
      expect(FUTURE_MODULES[path], `missing copy for ${path}`).toBeDefined();
    }
  });

  it("marks only discovery and overview as live", () => {
    const livePaths = NAV_GROUPS.flatMap((group) =>
      group.items
        .filter((item) => item.status === "live")
        .map((item) => item.path),
    );
    expect(livePaths.sort()).toEqual(
      [
        "/",
        "/companies",
        "/companies/directory",
        "/companies/profiles",
        "/companies/recent",
      ].sort(),
    );
  });

  it("has unique paths across all groups", () => {
    const paths = NAV_GROUPS.flatMap((group) =>
      group.items.map((item) => item.path),
    );
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("resolves the group for a known path", () => {
    expect(groupForPath("/companies")?.label).toBe("Company Discovery");
    expect(groupForPath("/nowhere")).toBeUndefined();
  });

  it("describes each future module completely", () => {
    for (const info of Object.values(FUTURE_MODULES)) {
      expect(info.title).toBeTruthy();
      expect(info.group).toBeTruthy();
      expect(info.description.length).toBeGreaterThan(20);
      expect(info.capabilities.length).toBeGreaterThan(0);
    }
  });
});
