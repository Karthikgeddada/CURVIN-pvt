import { RouterProvider } from "react-router";
import { AppProviders } from "@/app/providers/AppProviders";
import { router } from "@/app/router";

/**
 * Application root. Composition order:
 * providers → router. Keep this component free of feature logic.
 */
export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
