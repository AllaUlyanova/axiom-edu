import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { MessageCircle, X, Send, User2, Loader2, Headphones, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  startChatConversation,
  sendChatMessage,
  getChatMessages,
  requestOperator,
  submitChatOrder,
} from "@/lib/chat.functions";
import { toast } from "sonner";

type Msg = { id?: string; role: string; content: string; created_at?: string };

const LS_KEY = "umnichka_chat_conv_id";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  const start = useServerFn(startChatConversation);
  const send = useServerFn(sendChatMessage);
  const fetchMessages = useServerFn(getChatMessages);
  const callOperator = useServerFn(requestOperator);
  const placeOrder = useServerFn(submitChatOrder);

  // Restore session
  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (id) setConversationId(id);
  }, []);

  // Load messages when chat opens with existing conv
  useEffect(() => {
    if (open && conversationId && messages.length === 0) {
      fetchMessages({ data: { conversationId } })
        .then((r) => setMessages(r.messages as Msg[]))
        .catch(() => {
          localStorage.removeItem(LS_KEY);
          setConversationId(null);
        });
    }
  }, [open, conversationId]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleStart(name: string, phone: string) {
    setLoading(true);
    try {
      const r = await start({ data: { name, phone, consent: true } });
      localStorage.setItem(LS_KEY, r.conversationId);
      setConversationId(r.conversationId);
      const m = await fetchMessages({ data: { conversationId: r.conversationId } });
      setMessages(m.messages as Msg[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось начать чат");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(text: string) {
    if (!conversationId || !text.trim()) return;
    const optimistic: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, optimistic]);
    setLoading(true);
    try {
      const r = await send({ data: { conversationId, content: text } });
      if (r.assistantMessage) {
        setMessages((prev) => [...prev, r.assistantMessage as Msg]);
      } else if (r.escalated) {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: "Сообщение передано оператору. Он скоро ответит здесь." },
        ]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setLoading(false);
    }
  }

  async function handleOperator() {
    if (!conversationId) return;
    try {
      const r = await callOperator({ data: { conversationId } });
      setMessages((prev) => [...prev, { role: "system", content: r.systemMessage }]);
      toast.success("Оператор уведомлён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    }
  }

  async function handleOrder(note: string) {
    if (!conversationId) return;
    try {
      const r = await placeOrder({ data: { conversationId, note } });
      setMessages((prev) => [...prev, { role: "system", content: r.systemMessage }]);
      toast.success("Заявка отправлена!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Открыть чат"
          className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.70_0.15_230)] text-primary-foreground shadow-[var(--shadow-soft)] transition hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 sm:bottom-5 sm:right-5 sm:left-auto sm:w-[380px]">
          <div className="glass-strong flex h-[80vh] flex-col rounded-t-2xl border sm:h-[600px] sm:rounded-2xl">
            <header className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Помощник Умничка.AI</div>
                <div className="text-xs text-muted-foreground">Подберём урок и оформим заявку</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {!conversationId ? (
              <IntroForm loading={loading} onStart={handleStart} />
            ) : (
              <ChatBody
                messages={messages}
                loading={loading}
                scrollRef={scrollRef}
                onSend={handleSend}
                onOperator={handleOperator}
                onOrder={handleOrder}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function IntroForm({
  loading,
  onStart,
}: {
  loading: boolean;
  onStart: (name: string, phone: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const valid = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10 && consent;

  return (
    <form
      className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onStart(name.trim(), phone.trim());
      }}
    >
      <p className="text-sm text-muted-foreground">
        Оставьте имя и телефон — и ассистент поможет выбрать урок.
      </p>
      <Input
        placeholder="Ваше имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={80}
      />
      <Input
        placeholder="+7 999 123 45 67"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        inputMode="tel"
        maxLength={40}
      />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Соглашаюсь с{" "}
          <Link to="/privacy" target="_blank" className="text-primary underline">
            политикой конфиденциальности
          </Link>{" "}
          и обработкой персональных данных.
        </span>
      </label>
      <Button type="submit" disabled={!valid || loading} className="mt-auto rounded-xl">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Начать чат"}
      </Button>
    </form>
  );
}

function ChatBody({
  messages,
  loading,
  scrollRef,
  onSend,
  onOperator,
  onOrder,
}: {
  messages: Msg[];
  loading: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  onSend: (t: string) => void;
  onOperator: () => void;
  onOrder: (note: string) => void;
}) {
  const [text, setText] = useState("");
  const [showOrder, setShowOrder] = useState(false);
  const [orderNote, setOrderNote] = useState("");

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <Bubble key={m.id ?? i} m={m} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Печатает…
          </div>
        )}
      </div>

      {showOrder ? (
        <div className="border-t p-3">
          <Textarea
            placeholder="Что хотите заказать? (например: Урок 2 по математике, 3 класс)"
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            rows={2}
            maxLength={500}
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              className="flex-1 rounded-lg"
              disabled={!orderNote.trim()}
              onClick={() => {
                onOrder(orderNote.trim());
                setOrderNote("");
                setShowOrder(false);
              }}
            >
              Отправить заявку
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setShowOrder(false)}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2 border-t px-3 py-2">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 rounded-lg text-xs"
              onClick={onOperator}
            >
              <Headphones className="mr-1 h-3 w-3" /> Оператор
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 rounded-lg text-xs"
              onClick={() => setShowOrder(true)}
            >
              <ShoppingBag className="mr-1 h-3 w-3" /> Оформить заявку
            </Button>
          </div>
          <form
            className="flex gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) {
                onSend(text.trim());
                setText("");
              }
            }}
          >
            <Input
              placeholder="Напишите сообщение…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={4000}
              disabled={loading}
            />
            <Button type="submit" size="icon" className="rounded-lg" disabled={loading || !text.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}
    </>
  );
}

function Bubble({ m }: { m: Msg }) {
  if (m.role === "system") {
    return (
      <div className="mx-auto max-w-[90%] rounded-lg bg-secondary px-3 py-2 text-center text-xs text-muted-foreground">
        {m.content}
      </div>
    );
  }
  const isUser = m.role === "user";
  const isOperator = m.role === "operator";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          {isOperator ? <Headphones className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
        </div>
      )}
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : isOperator
            ? "bg-accent text-accent-foreground"
            : "bg-secondary text-foreground"
        }`}
      >
        {m.content}
      </div>
      {isUser && (
        <div className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted">
          <User2 className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
