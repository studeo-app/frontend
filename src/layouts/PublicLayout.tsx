import React from "react";
import PageThemeToggle from "@/shared/theme/components/PageThemeToggle";
import { Outlet } from "react-router";

const PublicLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-auth-bg text-auth-title">
      <PageThemeToggle variant="auth" />
      <Outlet />
    </div>
  );
};

export default PublicLayout;
