import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

const InputSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(255),
});

export const notifyAdminNewSignup = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
    const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY || !ADMIN_CHAT_ID) {
      console.warn("[telegram] notification skipped: missing env vars");
      return { ok: false, skipped: true };
    }

    const escape = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const text =
      `🎉 <b>Новая регистрация на Умничка.AI</b>\n\n` +
      `👤 Имя: <b>${escape(data.name)}</b>\n` +
      `✉️ Email: <code>${escape(data.email)}</code>\n` +
      `🕒 ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (МСК)`;

    try {
      const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TELEGRAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`[telegram] sendMessage failed [${res.status}]:`, body);
        return { ok: false };
      }
      return { ok: true };
    } catch (err) {
      console.error("[telegram] sendMessage error:", err);
      return { ok: false };
    }
  });
