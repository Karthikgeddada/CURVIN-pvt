import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/Button";

function StateShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {children}
    </div>
  );
}

/** No results — expected, not an error. */
export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: ReactNode;
}) {
  return (
    <StateShell>
      <Inbox className="h-5 w-5 text-muted" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-relaxed text-muted">{hint}</p>}
    </StateShell>
  );
}

/** Something failed — offer a way out. */
export function ErrorState({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <StateShell>
      <AlertCircle className="h-5 w-5 text-change-down" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      {detail && <p className="max-w-sm text-xs leading-relaxed text-muted">{detail}</p>}
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      )}
    </StateShell>
  );
}

/** Deliberate placeholder for a module that is not yet available. */
export function UnavailableState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <StateShell>
      <p className="text-sm font-medium">{title}</p>
      {detail && <p className="max-w-sm text-xs leading-relaxed text-muted">{detail}</p>}
    </StateShell>
  );
}
