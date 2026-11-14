// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AppLayout } from "../src/shared/layouts/AppLayout";
import { ThemeProvider } from "../src/app/providers/ThemeProvider";

function renderShell(initialPath: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>overview page</div>} />
            <Route path="/companies" element={<div>search page</div>} />
            <Route path="/settings" element={<div>settings page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

beforeAll(() => {
  // jsdom has no matchMedia implementation; ThemeProvider needs it.
  window.matchMedia = () => ({ matches: false }) as MediaQueryList;
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.className = "";
});

describe("AppLayout shell", () => {
  it("renders the brand, live navigation and settings entry", () => {
    renderShell("/companies");
    expect(screen.getByText("CURVIN")).toBeTruthy();
    expect(screen.getAllByText("Company Discovery").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Company Search").length).toBeGreaterThan(0);
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows page context for the current route", () => {
    renderShell("/settings");
    expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("labels future modules without hiding them", () => {
    renderShell("/");
    // Future groups start collapsed; expanding one reveals its items
    // with an honest "soon" marker.
    fireEvent.click(screen.getByText("Market Intelligence"));
    expect(screen.getAllByText("soon").length).toBeGreaterThan(3);
    expect(screen.getByText("Market Overview")).toBeTruthy();
  });

  it("toggles the theme and persists the choice", () => {
    renderShell("/");
    const toggle = screen.getByRole("button", {
      name: "Switch to dark theme",
    });
    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("curvin-theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeTruthy();
  });

  it("renders the routed page inside the main region", () => {
    renderShell("/companies");
    expect(screen.getByText("search page")).toBeTruthy();
  });
});
