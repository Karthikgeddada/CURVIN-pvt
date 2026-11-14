import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/shared/layouts/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { CompanySearchPage } from "@/pages/CompanySearchPage";
import { CompanyDirectoryPage } from "@/pages/CompanyDirectoryPage";
import { CompanyProfilesPage } from "@/pages/CompanyProfilesPage";
import { RecentCompaniesPage } from "@/pages/RecentCompaniesPage";
import { CompanyProfilePage } from "@/pages/CompanyProfilePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { FutureModulePage } from "@/pages/FutureModulePage";
import { FUTURE_MODULES } from "@/app/config/navigation";

/**
 * Central route table. Every navigation item resolves to a route:
 * implemented capabilities have real pages; planned modules have
 * clearly-labelled future-module pages. No dead links.
 */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/companies", element: <CompanySearchPage /> },
      { path: "/companies/directory", element: <CompanyDirectoryPage /> },
      { path: "/companies/profiles", element: <CompanyProfilesPage /> },
      { path: "/companies/recent", element: <RecentCompaniesPage /> },
      { path: "/companies/:ticker", element: <CompanyProfilePage /> },
      { path: "/settings", element: <SettingsPage /> },
      ...Object.keys(FUTURE_MODULES).map((path) => ({
        path,
        element: <FutureModulePage />,
      })),
    ],
  },
]);
