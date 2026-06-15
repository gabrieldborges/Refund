import { Outlet } from "react-router";
import Header from "../organisms/Header";

export default function MainLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
