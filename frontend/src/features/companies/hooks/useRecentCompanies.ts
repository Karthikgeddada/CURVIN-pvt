import { useCallback, useState } from "react";
import type { RecentCompany } from "@/shared/types/company";

const STORAGE_KEY = "curvin-recent-companies";
const MAX_ENTRIES = 12;

function read(): RecentCompany[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentCompany[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: RecentCompany[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Locally-persisted “recently viewed companies”. Workspace-scoped by
 * the browser; server-side research history arrives with accounts.
 */
export function useRecentCompanies() {
  const [recents, setRecents] = useState<RecentCompany[]>(read);

  const addRecent = useCallback((entry: RecentCompany) => {
    setRecents((current) => {
      const next = [
        entry,
        ...current.filter((item) => item.ticker !== entry.ticker),
      ].slice(0, MAX_ENTRIES);
      write(next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setRecents([]);
  }, []);

  return { recents, addRecent, clearRecents };
}
