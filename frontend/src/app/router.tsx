import { createBrowserRouter } from "react-router";
import { HomePage } from "@/pages/HomePage";

/**
 * Central route table. Each future capability is registered here as
 * its own route; pages compose feature modules mounted under
 * src/features/.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
]);
