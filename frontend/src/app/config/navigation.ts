import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  Building2,
  FileText,
  Gauge,
  LayoutGrid,
  LineChart,
  Scale,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  /** "live" — implemented in this milestone; "future" — planned module. */
  status: "live" | "future";
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

/**
 * Single source of truth for sidebar navigation and route titles.
 * Every item resolves to a real route — live pages or clearly-labelled
 * future-module pages. No dead links.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutGrid,
    items: [{ label: "Market Intelligence Overview", path: "/", status: "live" }],
  },
  {
    id: "companies",
    label: "Company Discovery",
    icon: Building2,
    items: [
      { label: "Company Search", path: "/companies", status: "live" },
      { label: "Company Directory", path: "/companies/directory", status: "live" },
      { label: "Company Profiles", path: "/companies/profiles", status: "live" },
      { label: "Recently Viewed", path: "/companies/recent", status: "live" },
    ],
  },
  {
    id: "market",
    label: "Market Intelligence",
    icon: BarChart3,
    items: [
      { label: "Market Overview", path: "/market/overview", status: "future" },
      { label: "Market Breadth", path: "/market/breadth", status: "future" },
      { label: "Market Regime", path: "/market/regime", status: "future" },
      { label: "Market Performance", path: "/market/performance", status: "future" },
    ],
  },
  {
    id: "institutional",
    label: "Institutional Intelligence",
    icon: LineChart,
    items: [
      { label: "Institutional Positioning", path: "/institutional/positioning", status: "future" },
      { label: "Accumulation & Distribution", path: "/institutional/accumulation-distribution", status: "future" },
      { label: "Institutional Ownership", path: "/institutional/ownership", status: "future" },
      { label: "Capital Flow Intelligence", path: "/institutional/capital-flow", status: "future" },
    ],
  },
  {
    id: "sectors",
    label: "Sector Intelligence",
    icon: TrendingUp,
    items: [
      { label: "Sector Performance", path: "/sectors/performance", status: "future" },
      { label: "Sector Rotation", path: "/sectors/rotation", status: "future" },
      { label: "Industry Classification", path: "/sectors/classification", status: "future" },
      { label: "Relative Strength", path: "/sectors/relative-strength", status: "future" },
    ],
  },
  {
    id: "risk",
    label: "Risk Intelligence",
    icon: Scale,
    items: [
      { label: "Market Risk", path: "/risk/market", status: "future" },
      { label: "Company Risk", path: "/risk/company", status: "future" },
      { label: "Volatility", path: "/risk/volatility", status: "future" },
      { label: "Portfolio Risk", path: "/risk/portfolio", status: "future" },
    ],
  },
  {
    id: "ai",
    label: "CURVIN AI",
    icon: Bot,
    items: [
      { label: "Research Assistant", path: "/ai/research-assistant", status: "future" },
      { label: "Company Research", path: "/ai/company-research", status: "future" },
      { label: "Financial Q&A", path: "/ai/financial-qa", status: "future" },
      { label: "Intelligence Summaries", path: "/ai/intelligence-summaries", status: "future" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    items: [
      { label: "Intelligence Reports", path: "/reports/intelligence", status: "future" },
      { label: "Saved Reports", path: "/reports/saved", status: "future" },
      { label: "Report Archive", path: "/reports/archive", status: "future" },
    ],
  },
];

/** Icon shown for standalone footer navigation. */
export const SETTINGS_ICON = Settings;

export interface FutureModuleInfo {
  title: string;
  group: string;
  description: string;
  capabilities: string[];
}

/** Copy for future-module pages, keyed by route path. */
export const FUTURE_MODULES: Record<string, FutureModuleInfo> = {
  "/market/overview": {
    title: "Market Overview",
    group: "Market Intelligence",
    description: "A unified market view: index levels, breadth, regime signals and cross-asset context for US equities.",
    capabilities: ["Index snapshots (S&P 500, NASDAQ, Dow, Russell 2000)", "Breadth and advance/decline measures", "Regime classification", "Rolling performance windows"],
  },
  "/market/breadth": {
    title: "Market Breadth",
    group: "Market Intelligence",
    description: "Advance/decline dynamics, new highs and lows, and participation measures across the US market.",
    capabilities: ["Advance/decline ratios", "New highs vs. new lows", "Participation by index membership"],
  },
  "/market/regime": {
    title: "Market Regime",
    group: "Market Intelligence",
    description: "Systematic classification of market regimes to contextualise every other intelligence module.",
    capabilities: ["Trend and volatility regime states", "Regime history and transitions", "Signal attribution"],
  },
  "/market/performance": {
    title: "Market Performance",
    group: "Market Intelligence",
    description: "Index and factor performance across horizons, with drill-down to constituents.",
    capabilities: ["Multi-horizon returns", "Factor decomposition", "Constituent drill-down"],
  },
  "/institutional/positioning": {
    title: "Institutional Positioning",
    group: "Institutional Intelligence",
    description: "Aggregate institutional positioning derived from disclosed ownership data.",
    capabilities: ["13F-derived positioning", "Sector and factor tilts", "Concentration measures"],
  },
  "/institutional/accumulation-distribution": {
    title: "Accumulation & Distribution",
    group: "Institutional Intelligence",
    description: "Where institutional capital is accumulating and being distributed, by company and sector.",
    capabilities: ["Ownership change analysis", "Position size trajectories", "Conviction scoring"],
  },
  "/institutional/ownership": {
    title: "Institutional Ownership",
    group: "Institutional Intelligence",
    description: "Ownership structure by manager, filing period and security.",
    capabilities: ["Manager-level holdings", "Filing-period comparisons", "Share-class breakdowns"],
  },
  "/institutional/capital-flow": {
    title: "Capital Flow Intelligence",
    group: "Institutional Intelligence",
    description: "Flow signals that connect institutional behaviour with price and volume dynamics.",
    capabilities: ["Flow direction metrics", "Price-volume-ownership linkage", "Anomaly detection"],
  },
  "/sectors/performance": {
    title: "Sector Performance",
    group: "Sector Intelligence",
    description: "Performance and attribution across GICS sectors and industry groups.",
    capabilities: ["Sector return tables", "Contribution analysis", "Market-cap segment views"],
  },
  "/sectors/rotation": {
    title: "Sector Rotation",
    group: "Sector Intelligence",
    description: "Rotation dynamics and leadership changes across sectors over time.",
    capabilities: ["Relative rotation graphs", "Leadership transitions", "Momentum persistence"],
  },
  "/sectors/classification": {
    title: "Industry Classification",
    group: "Sector Intelligence",
    description: "Curated sector, industry-group and industry mappings used across CURVIN modules.",
    capabilities: ["Classification reference", "Constituent counts", "Mapping lineage from source data"],
  },
  "/sectors/relative-strength": {
    title: "Relative Strength",
    group: "Sector Intelligence",
    description: "Relative-strength comparisons between sectors, industries and benchmarks.",
    capabilities: ["RS ranking", "Trend quality metrics", "Divergence alerts"],
  },
  "/risk/market": {
    title: "Market Risk",
    group: "Risk Intelligence",
    description: "Market-level risk measures and stress context for portfolio decisions.",
    capabilities: ["Volatility and drawdown measures", "Correlation structure", "Stress scenarios"],
  },
  "/risk/company": {
    title: "Company Risk",
    group: "Risk Intelligence",
    description: "Company-level risk signals combining market, fundamental and disclosure data.",
    capabilities: ["Risk scoring framework", "Signal history", "Peer comparisons"],
  },
  "/risk/volatility": {
    title: "Volatility",
    group: "Risk Intelligence",
    description: "Realised and implied volatility analytics across the coverage universe.",
    capabilities: ["Realised volatility", "Term structure", "Volatility regime flags"],
  },
  "/risk/portfolio": {
    title: "Portfolio Risk",
    group: "Risk Intelligence",
    description: "Portfolio construction and risk analytics for institutional workflows.",
    capabilities: ["Position-level risk", "Exposure decomposition", "Scenario analysis"],
  },
  "/ai/research-assistant": {
    title: "Research Assistant",
    group: "CURVIN AI",
    description: "A research assistant grounded in CURVIN's governed data, with citations to sources.",
    capabilities: ["Grounded Q&A over company and market data", "Cited answers", "Research workflow integrations"],
  },
  "/ai/company-research": {
    title: "Company Research",
    group: "CURVIN AI",
    description: "AI-assisted deep research on individual companies, built on verified reference data.",
    capabilities: ["Company dossiers", "Automated profile summarisation", "Source-linked claims"],
  },
  "/ai/financial-qa": {
    title: "Financial Q&A",
    group: "CURVIN AI",
    description: "Natural-language questions over financial statements and market data.",
    capabilities: ["Statement-aware answers", "Period and unit precision", "Audit-friendly citations"],
  },
  "/ai/intelligence-summaries": {
    title: "Intelligence Summaries",
    group: "CURVIN AI",
    description: "Scheduled intelligence briefings generated from CURVIN's curated data.",
    capabilities: ["Daily market briefs", "Company watch summaries", "Distribution workflows"],
  },
  "/reports/intelligence": {
    title: "Intelligence Reports",
    group: "Reports",
    description: "Composed intelligence reports combining CURVIN modules into shareable documents.",
    capabilities: ["Report builder", "Module embedding", "Export formats"],
  },
  "/reports/saved": {
    title: "Saved Reports",
    group: "Reports",
    description: "Your saved reports and their latest refresh state.",
    capabilities: ["Report library", "Refresh scheduling", "Sharing controls"],
  },
  "/reports/archive": {
    title: "Report Archive",
    group: "Reports",
    description: "Historical report versions retained for audit and review.",
    capabilities: ["Version history", "Point-in-time data snapshots", "Audit trail"],
  },
};

/** Dashboard metric cards that will light up when a market data provider is configured. */
export const DASHBOARD_ICONS = { Activity, Gauge, Sparkles, Brain };

/** Resolve the group label for a path, for header context. */
export function groupForPath(path: string): NavGroup | undefined {
  return NAV_GROUPS.find((group) =>
    group.items.some((item) => item.path === path),
  );
}
