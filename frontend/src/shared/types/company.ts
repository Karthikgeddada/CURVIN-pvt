/** Company discovery contract — mirrors the backend /companies API. */

export type ListingStatus = "active" | "inactive" | "unknown";

export interface DataSourceInfo {
  /** Provider identifier, e.g. "sec-edgar" or "fixtures". */
  provider: string;
  /** Human-readable label, e.g. "SEC EDGAR" or "Deterministic fixtures". */
  label: string;
  /** True when the live provider failed and fixture data is served. */
  degraded: boolean;
}

export interface CompanySummary {
  name: string;
  ticker: string;
  exchange: string;
  cik: string | null;
  sector: string | null;
  industry: string | null;
  status: ListingStatus;
}

export interface CompanySearchResponse {
  results: CompanySummary[];
  total: number;
  page: number;
  limit: number;
  data_source: DataSourceInfo;
}

export interface ExchangeInfo {
  code: string;
  label: string;
  company_count: number;
}

export interface ExchangeListResponse {
  exchanges: ExchangeInfo[];
  data_source: DataSourceInfo;
}

export interface CompanyIdentity {
  name: string;
  ticker: string;
  exchange: string;
  cik: string | null;
  status: ListingStatus;
  /** Share class suffix, e.g. "A" / "B", when known. */
  share_class: string | null;
  country: string | null;
  website: string | null;
}

export interface CompanyBusiness {
  description: string | null;
  sector: string | null;
  industry: string | null;
  headquarters: string | null;
  /** Employee count from reference data, when available. */
  employees: number | null;
}

/** Market quote — null until a market data provider is configured. */
export interface CompanyMarket {
  price: number;
  previous_close: number;
  change: number;
  change_percent: number;
  currency: string;
  market_capitalization: number | null;
  as_of: string;
  data_delay: "realtime" | "delayed" | "eod";
}

export interface CompanyProfile {
  identity: CompanyIdentity;
  business: CompanyBusiness;
  market: CompanyMarket | null;
  /** Populated when a fundamentals provider is configured (M2). */
  fundamentals_available: boolean;
  data_source: DataSourceInfo;
  /** ISO timestamp of the underlying reference snapshot. */
  as_of: string | null;
}

/** Entry persisted locally for “recently viewed” tracking. */
export interface RecentCompany {
  ticker: string;
  name: string;
  exchange: string;
  viewed_at: string;
}

// --- M2 company intelligence ----------------------------------------

/** Response of GET /companies/{ticker}/market. */
export interface CompanyMarketResponse {
  ticker: string;
  /** Null when no licensed provider is configured or reachable. */
  quote: CompanyMarket | null;
  data_source: DataSourceInfo;
  as_of: string;
}

/** One audited annual fiscal year, straight from SEC XBRL facts. */
export interface FiscalYearSummary {
  fiscal_year: number;
  period_end: string;
  currency: string;
  revenue: number | null;
  net_income: number | null;
  operating_income: number | null;
  total_assets: number | null;
  stockholders_equity: number | null;
  diluted_eps: number | null;
}

/** Response of GET /companies/{ticker}/fundamentals. */
export interface CompanyFundamentalsResponse {
  ticker: string;
  available: boolean;
  fiscal_years: FiscalYearSummary[];
  data_source: DataSourceInfo;
  as_of: string;
}

/** One SEC filing, newest first. */
export interface CompanyFiling {
  form: string;
  filed_at: string;
  accession_no: string;
  report_period: string | null;
  primary_document: string;
  url: string;
}

/** Response of GET /companies/{ticker}/filings. */
export interface CompanyFilingsResponse {
  ticker: string;
  filings: CompanyFiling[];
  data_source: DataSourceInfo;
  as_of: string;
}
