import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Home, MessagesSquare } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Админка — Умничка.AI" }] }),
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } as never });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const loc = useLocation();
  const isChats = loc.pathname.startsWith("/admin/chats");
  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <nav className="flex gap-2 text-sm">
          <Link
            to="/admin"
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 ${!isChats ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/60"}`}
          >
            <Home className="h-3.5 w-3.5" /> Дашборд
          </Link>
          <Link
            to="/admin/chats"
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 ${isChats ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/60"}`}
          >
            <MessagesSquare className="h-3.5 w-3.5" /> Чаты
          </Link>
        </nav>
      </div>
      <Outlet />
    </SiteLayout>
  );
}
