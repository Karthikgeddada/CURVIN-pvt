import { CompanySearchView } from "@/features/companies/components/CompanySearchView";

/**
 * The full US-listed universe, browsable and filterable — the same
 * discovery engine in browse mode, without a required query.
 */
export function CompanyDirectoryPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Company Directory
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Browse every listed company in the CURVIN reference universe,
          filtered by exchange and listing status.
        </p>
      </header>
      <CompanySearchView mode="directory" />
    </div>
  );
}
