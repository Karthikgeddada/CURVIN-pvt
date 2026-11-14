import { useEffect, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/providers/useTheme";
import { apiClient } from "@/core/api/client";
import { Badge } from "@/shared/components/Badge";
import { Panel } from "@/shared/components/Panel";
import { UnavailableState } from "@/shared/components/StateViews";
import { cn } from "@/shared/utilities/cn";
import type { ExchangeListResponse } from "@/shared/types/company";

/**
 * Workspace settings. Theme is fully functional; data sources show
 * the live provider status from the API; account management is an
 * honestly-labelled planned capability.
 */
export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [dataSources, setDataSources] = useState<
    ExchangeListResponse | "error" | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getExchanges()
      .then((response) => {
        if (!cancelled) setDataSources(response);
      })
      .catch(() => {
        if (!cancelled) setDataSources("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[14px] text-muted">
          Workspace preferences for this browser.
        </p>
      </header>

      <Panel title="Theme" subtitle="Applies instantly and is remembered">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { value: "light", label: "Light", icon: Sun, hint: "Premium white surfaces for daylight research." },
              { value: "dark", label: "Dark", icon: Moon, hint: "Deep neutral surfaces, calibrated contrast." },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                aria-pressed={active}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors",
                  active
                    ? "border-foreground/40 bg-subtle"
                    : "border-hairline hover:border-foreground/25",
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13px] font-medium">
                    {option.label}
                    {active && <Check className="h-3.5 w-3.5 text-change-up" aria-hidden="true" />}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted">
                    {option.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Data sources" subtitle="What currently powers company discovery">
        {dataSources === null ? (
          <p className="text-[13px] text-muted">Checking configured providers…</p>
        ) : dataSources === "error" ? (
          <UnavailableState
            title="Provider status unavailable"
            detail="The backend could not be reached. The next successful request will refresh this status."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium">
                  Company reference data
                </p>
                <p className="text-[12px] text-muted">
                  Names, tickers, exchanges and CIK numbers for US-listed
                  companies.
                </p>
              </div>
              <Badge tone={dataSources.data_source.degraded ? "down" : "outline"}>
                {dataSources.data_source.label}
                {dataSources.data_source.degraded ? " · offline fixtures" : ""}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-hairline pt-4">
              <div>
                <p className="text-[13px] font-medium">Market data</p>
                <p className="text-[12px] text-muted">
                  Quotes, indices and intraday activity.
                </p>
              </div>
              <Badge tone="muted">Not configured</Badge>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-hairline pt-4">
              <div>
                <p className="text-[13px] font-medium">Financial fundamentals</p>
                <p className="text-[12px] text-muted">
                  Statements and standardized company metrics.
                </p>
              </div>
              <Badge tone="muted">Not configured</Badge>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Account" subtitle="Identity, teams and workspace sharing">
        <UnavailableState
          title="Account management arrives with CURVIN workspaces"
          detail="Sign-in, team workspaces and server-side preferences are a planned milestone. Nothing here requires configuration today."
        />
      </Panel>
    </div>
  );
}
