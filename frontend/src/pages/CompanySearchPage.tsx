import { useSearchParams } from "react-router";
import { CompanySearchView } from "@/features/companies/components/CompanySearchView";

/**
 * Company Discovery — search by name or ticker across US equity
 * listings. All state lives in the URL, so searches are shareable.
 */
export function CompanySearchPage() {
  const [searchParams] = useSearchParams();
  const initial = searchParams.get("q") ?? "";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Company Discovery
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Explore publicly listed companies across US equity markets.
          {initial ? ` Searching for “${initial}”.` : " Press / to search."}
        </p>
      </header>
      <CompanySearchView mode="search" />
    </div>
  );
}
