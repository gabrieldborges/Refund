import { RouterProvider } from "react-router/dom";
import { AuthProvider } from "./context/AuthContext";
import ThemeEffect from "./components/core/ThemeEffect";
import { router } from "./router";

export default function App() {
  return (
    <AuthProvider>
      <ThemeEffect />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
