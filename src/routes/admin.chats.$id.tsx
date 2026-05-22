import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  adminGetChat,
  adminSendOperatorMessage,
  adminUpdateTicketStatus,
} from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/chats/$id")({
  head: () => ({ meta: [{ title: "Чат — Админка" }] }),
  component: AdminChatDetail,
});

function AdminChatDetail() {
  const { id } = Route.useParams();
  const fetchChat = useServerFn(adminGetChat);
  const sendOp = useServerFn(adminSendOperatorMessage);
  const setTicketStatus = useServerFn(adminUpdateTicketStatus);

  const { data, refetch } = useQuery({
    queryKey: ["adminChat", id],
    queryFn: () => fetchChat({ data: { conversationId: id } }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`admin-chat-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${id}` },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_tickets", filter: `conversation_id=eq.${id}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetch]);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [data?.messages?.length]);

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await sendOp({ data: { conversationId: id, content: reply.trim() } });
      setReply("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSending(false);
    }
  }

  async function handleStatus(ticketId: string, status: "new" | "in_progress" | "done") {
    try {
      await setTicketStatus({ data: { ticketId, status } });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    }
  }

  if (!data) return <div className="mx-auto max-w-4xl px-4 py-10">Загрузка…</div>;

  return (
    <section className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/admin/chats" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> К списку чатов
      </Link>

      <div className="mt-4 glass rounded-2xl p-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold">{data.visitor?.name ?? "—"}</h1>
          <span className="text-muted-foreground">{data.visitor?.phone}</span>
          <Badge variant="outline">{data.conversation.status}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Начат: {new Date(data.conversation.created_at).toLocaleString("ru-RU")}
        </p>
      </div>

      {data.tickets.length > 0 && (
        <div className="mt-4 space-y-2">
          {data.tickets.map((t) => (
            <div key={t.id} className="glass flex items-center justify-between rounded-xl p-3 text-sm">
              <div>
                <span className="font-semibold">{t.kind === "order" ? "📝 Заявка на урок" : "🆘 Запрос оператора"}</span>
                {t.note && <span className="ml-2 text-muted-foreground">{t.note}</span>}
              </div>
              <div className="flex gap-1">
                {(["new", "in_progress", "done"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatus(t.id, s)}
                    className={`rounded px-2 py-1 text-xs ${t.status === s ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="glass mt-4 h-[500px] overflow-y-auto rounded-2xl p-4">
        <div className="space-y-3">
          {data.messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-secondary"
                    : m.role === "operator"
                    ? "bg-accent text-accent-foreground"
                    : m.role === "system"
                    ? "bg-muted text-xs text-muted-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <div className="mb-0.5 text-[10px] uppercase opacity-70">{m.role}</div>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 glass rounded-2xl p-3">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Ответ как оператор (после ответа ИИ больше не отвечает автоматически)"
          rows={3}
          maxLength={4000}
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={handleSend} disabled={!reply.trim() || sending}>
            <Send className="mr-2 h-4 w-4" /> Отправить
          </Button>
        </div>
      </div>
    </section>
  );
}
