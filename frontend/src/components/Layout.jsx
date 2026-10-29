import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import BrandFooter from "./BrandFooter.jsx";

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="min-w-0 flex-1"><Outlet /></main>
      <BrandFooter />
    </div>
  );
}

