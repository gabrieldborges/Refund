import { createBrowserRouter } from "react-router";
import MainLayout from "./components/core/MainLayout";
import ProtectedRoute from "./components/core/ProtectedRoute";
import PageRouteError from "./pages/PageRouteError";
import { homeLoader, refundDetailLoader } from "./router-loaders";

export const router = createBrowserRouter([
  {
    ErrorBoundary: PageRouteError,
    children: [
      {
        path: "/login",
        lazy: async () => ({ Component: (await import("./pages/PageLogin")).default }),
      },
      {
        path: "/register",
        lazy: async () => ({ Component: (await import("./pages/PageRegister")).default }),
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            Component: MainLayout,
            children: [
              {
                index: true,
                loader: homeLoader,
                lazy: async () => ({ Component: (await import("./pages/PageHome")).default }),
              },
              {
                path: "/refunds/:id",
                loader: refundDetailLoader,
                lazy: async () => ({
                  Component: (await import("./pages/PageRefundDetails")).default,
                }),
              },
              {
                path: "/success",
                lazy: async () => ({ Component: (await import("./pages/PageSuccess")).default }),
              },
              {
                path: "/components",
                lazy: async () => ({ Component: (await import("./pages/PageComponents")).default }),
              },
            ],
          },
        ],
      },
    ],
  },
]);
