import { createBrowserRouter } from "react-router";
import MainLayout from "./components/core/MainLayout";
import ProtectedRoute from "./components/core/ProtectedRoute";
import PageRouteError from "./pages/PageRouteError";
import { homeLoader, refundDetailLoader, reviewLoader } from "./router-loaders";

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
                handle: { title: "Solicitações de reembolso" },
                lazy: async () => ({ Component: (await import("./pages/PageHome")).default }),
              },
              {
                path: "/refunds/:id/review",
                loader: reviewLoader,
                handle: { title: "Revisar solicitação" },
                lazy: async () => ({
                  Component: (await import("./pages/PageRefundReview")).default,
                }),
              },
              {
                path: "/refunds/:id",
                loader: refundDetailLoader,
                handle: { title: "Detalhe da solicitação" },
                lazy: async () => ({
                  Component: (await import("./pages/PageRefundDetails")).default,
                }),
              },
              {
                path: "/success",
                handle: { title: "Sucesso" },
                lazy: async () => ({ Component: (await import("./pages/PageSuccess")).default }),
              },
              {
                path: "/components",
                handle: { title: "Componentes" },
                lazy: async () => ({ Component: (await import("./pages/PageComponents")).default }),
              },
            ],
          },
        ],
      },
    ],
  },
]);
