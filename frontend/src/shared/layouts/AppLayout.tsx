import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "@/app/providers/useTheme";
import { NAV_GROUPS } from "@/app/config/navigation";
import { SETTINGS_ICON } from "@/app/config/navigation";
import { cn } from "@/shared/utilities/cn";

const COLLAPSE_KEY = "curvin-sidebar-collapsed";
const DEFAULT_OPEN = new Set(["overview", "companies"]);

interface PageContext {
  group: string;
  title: string;
}

function resolvePageContext(pathname: string): PageContext {
  for (const group of NAV_GROUPS) {
    const item = group.items.find(
      (candidate) => candidate.path === pathname,
    );
    if (item) return { group: group.label, title: item.label };
  }
  if (pathname.startsWith("/companies/")) {
    return { group: "Company Discovery", title: "Company Profile" };
  }
  return { group: "CURVIN", title: "Overview" };
}

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      to="/"
      className="flex h-14 items-center gap-2.5 px-5 text-foreground"
      aria-label="CURVIN home"
    >
      <svg
        viewBox="0 0 32 32"
        className="h-6 w-6 shrink-0"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
      >
        <path d="M22.6 7.6A11 11 0 1 0 25.9 21.4" />
      </svg>
      {!collapsed && (
        <span className="text-[15px] font-semibold tracking-[0.16em]">
          CURVIN
        </span>
      )}
    </Link>
  );
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const [open, setOpen] = useState<Set<string>>(() => {
    const active = NAV_GROUPS.find((group) =>
      group.items.some((item) => location.pathname.startsWith(item.path)),
    );
    if (active) return new Set([...DEFAULT_OPEN, active.id]);
    return new Set(DEFAULT_OPEN);
  });

  useEffect(() => {
    const active = NAV_GROUPS.find(
      (group) =>
        group.id !== "overview" &&
        group.items.some(
          (item) =>
            item.path !== "/" && location.pathname.startsWith(item.path),
        ),
    );
    if (active) {
      setOpen((current) => new Set([...current, active.id]));
    }
  }, [location.pathname]);

  const toggleGroup = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
      {NAV_GROUPS.map((group) => {
        const GroupIcon = group.icon;
        const expanded = open.has(group.id) && !collapsed;
        return (
          <div key={group.id} className="mt-1">
            {!collapsed ? (
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground"
              >
                <GroupIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {group.label}
                <ChevronDown
                  className={cn(
                    "ml-auto h-3.5 w-3.5 transition-transform duration-200",
                    expanded && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <NavLink
                to={group.items[0].path}
                onClick={onNavigate}
                aria-label={group.label}
                className="my-1 flex justify-center rounded-md p-2 text-muted hover:bg-subtle hover:text-foreground aria-[current=page]:bg-subtle aria-[current=page]:text-foreground"
              >
                <GroupIcon className="h-4 w-4" aria-hidden="true" />
              </NavLink>
            )}
            {expanded && (
              <ul className="mt-0.5 space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "block rounded-md px-3 py-1.5 text-[13px] transition-colors",
                          isActive
                            ? "bg-subtle font-medium text-foreground"
                            : "text-muted hover:bg-subtle/60 hover:text-foreground",
                        )
                      }
                    >
                      <span className="flex items-center justify-between gap-2">
                        {item.label}
                        {item.status === "future" && (
                          <span
                            className="text-[10px] uppercase tracking-wider text-muted/70"
                            title="Planned module — not yet available"
                          >
                            soon
                          </span>
                        )}
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * The CURVIN application shell: quiet left navigation, a restrained
 * context header, and a scrollable main region. Desktop-first with a
 * drawer on small screens.
 */
export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSE_KEY) === "1",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const page = useMemo(
    () => resolvePageContext(location.pathname),
    [location.pathname],
  );

  const toggleCollapsed = () =>
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });

  // “/” anywhere (outside a text field) jumps into company search.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      navigate("/companies");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const SettingsIcon = SETTINGS_ICON;

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-hairline bg-background transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <BrandMark collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
        <div className="border-t border-hairline px-3 py-3">
          <div className="flex items-center gap-1">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  "flex flex-1 items-center gap-2.5 rounded-md px-2 py-2 text-[13px] transition-colors",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-subtle font-medium text-foreground"
                    : "text-muted hover:bg-subtle/60 hover:text-foreground",
                )
              }
            >
              <SettingsIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed && "Settings"}
            </NavLink>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden rounded-md p-2 text-muted transition-colors hover:bg-subtle/60 hover:text-foreground lg:block"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {!collapsed && (
            <p className="mt-2 px-2 text-[11px] text-muted">
              Research Workspace
            </p>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-hairline bg-background">
            <div className="flex h-14 items-center justify-between pr-3">
              <BrandMark collapsed={false} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-2 text-muted hover:bg-subtle/60"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setDrawerOpen(false)} />
            <div className="border-t border-hairline px-3 py-3">
              <NavLink
                to="/settings"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px] text-muted hover:bg-subtle/60 hover:text-foreground"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Settings
              </NavLink>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-background/90 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-muted hover:bg-subtle/60 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-[0.08em] text-muted">
              {page.group}
            </p>
            <h1 className="truncate text-[15px] font-semibold leading-tight">
              {page.title}
            </h1>
          </div>
          <Link
            to="/companies"
            className="hidden items-center gap-2 rounded-full border border-hairline px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-foreground/30 hover:text-foreground sm:flex"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search companies
            <kbd className="rounded bg-subtle px-1.5 py-0.5 text-[11px] text-muted">
              /
            </kbd>
          </Link>
          <Link
            to="/companies"
            className="rounded-md p-2 text-muted hover:bg-subtle/60 sm:hidden"
            aria-label="Search companies"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md p-2 text-muted transition-colors hover:bg-subtle/60 hover:text-foreground"
            aria-label={
              theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
