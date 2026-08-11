import { createBrowserRouter } from "react-router";
import MainLayout from "./components/core/MainLayout";
import ProtectedRoute from "./components/core/ProtectedRoute";
import ContentError from "./components/core/ContentError";
import PageRouteError from "./pages/PageRouteError";
import {
  homeLoader,
  refundDetailLoader,
  reviewLoader,
  teamLoader,
  teamMemberLoader,
} from "./router-loaders";

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
                // Pathless route carrying the error boundary for every page
                // below. It sits INSIDE MainLayout on purpose: an
                // ErrorBoundary renders in place of the element of the route
                // it is attached to, so putting it on MainLayout would take
                // the sidebar and topbar down with the failing page. Here the
                // shell keeps rendering and the error fills the Outlet.
                ErrorBoundary: ContentError,
                children: [
                  {
                    index: true,
                    loader: homeLoader,
                    handle: { titleKey: "routes.home" },
                    lazy: async () => ({ Component: (await import("./pages/PageHome")).default }),
                  },
                  {
                    path: "/refunds/:id/review",
                    loader: reviewLoader,
                    handle: { titleKey: "routes.review" },
                    lazy: async () => ({
                      Component: (await import("./pages/PageRefundReview")).default,
                    }),
                  },
                  {
                    path: "/refunds/:id",
                    loader: refundDetailLoader,
                    handle: { titleKey: "routes.detail" },
                    lazy: async () => ({
                      Component: (await import("./pages/PageRefundDetails")).default,
                    }),
                  },
                  {
                    path: "/team",
                    loader: teamLoader,
                    handle: { titleKey: "routes.team" },
                    lazy: async () => ({ Component: (await import("./pages/PageTeam")).default }),
                  },
                  {
                    path: "/team/:id",
                    loader: teamMemberLoader,
                    handle: { titleKey: "routes.teamMember" },
                    lazy: async () => ({
                      Component: (await import("./pages/PageTeamMember")).default,
                    }),
                  },
                  {
                    path: "/success",
                    handle: { titleKey: "routes.success" },
                    lazy: async () => ({ Component: (await import("./pages/PageSuccess")).default }),
                  },
                  {
                    path: "/components",
                    handle: { titleKey: "routes.components" },
                    lazy: async () => ({
                      Component: (await import("./pages/PageComponents")).default,
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
