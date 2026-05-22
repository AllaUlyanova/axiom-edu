import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminListChats } from "@/lib/chat.functions";
import { checkAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/chats/")({
  head: () => ({ meta: [{ title: "Чаты — Админка" }] }),
  component: AdminChats,
});

type Filter = "all" | "orders" | "escalated" | "active";

function AdminChats() {
  const fetchList = useServerFn(adminListChats);
  const fetchAdmin = useServerFn(checkAdmin);
  const { data: a } = useQuery({ queryKey: ["isAdmin"], queryFn: () => fetchAdmin() });
  const { data: chats, refetch } = useQuery({
    queryKey: ["adminChats"],
    queryFn: () => fetchList(),
    enabled: !!a?.isAdmin,
  });

  const [filter, setFilter] = useState<Filter>("all");

  // Realtime refresh
  useEffect(() => {
    if (!a?.isAdmin) return;
    const channel = supabase
      .channel("admin-chats")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_tickets" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [a?.isAdmin, refetch]);

  if (a && !a.isAdmin) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center"><h1 className="text-2xl font-bold">Только для администратора</h1></div>;
  }

  const filtered = (chats ?? []).filter((c) => {
    if (filter === "all") return true;
    if (filter === "orders") return c.tickets.some((t) => t.kind === "order");
    if (filter === "escalated") return c.status === "escalated" || c.tickets.some((t) => t.kind === "operator_request");
    if (filter === "active") return c.status === "active";
    return true;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Чаты с сайта</h1>
      <p className="text-muted-foreground">Все диалоги, заявки и эскалации к оператору.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "Все"],
            ["escalated", "Нужен оператор"],
            ["orders", "С заявкой"],
            ["active", "Активные"],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-lg px-3 py-1.5 text-sm ${filter === k ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        {filtered.length === 0 && <p className="text-muted-foreground">Пока пусто.</p>}
        {filtered.map((c) => (
          <Link
            key={c.id}
            to="/admin/chats/$id"
            params={{ id: c.id }}
            className="glass flex items-start justify-between gap-4 rounded-2xl p-4 hover:bg-secondary/40"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{c.visitor?.name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{c.visitor?.phone}</span>
                <StatusBadge status={c.status} />
                {c.tickets.map((t) => (
                  <TicketBadge key={t.id} kind={t.kind} status={t.status} />
                ))}
              </div>
              {c.last_message && (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  <span className="text-xs uppercase">{c.last_message.role}:</span> {c.last_message.content}
                </p>
              )}
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">
              {new Date(c.last_message_at).toLocaleString("ru-RU")}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "активный", variant: "secondary" },
    escalated: { label: "оператор", variant: "destructive" },
    ordered: { label: "заявка", variant: "default" },
    closed: { label: "закрыт", variant: "outline" },
  };
  const x = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={x.variant}>{x.label}</Badge>;
}

function TicketBadge({ kind, status }: { kind: string; status: string }) {
  const label = kind === "order" ? "📝 заявка" : "🆘 оператор";
  return (
    <Badge variant={status === "done" ? "outline" : "secondary"} className="text-xs">
      {label} · {status}
    </Badge>
  );
}
