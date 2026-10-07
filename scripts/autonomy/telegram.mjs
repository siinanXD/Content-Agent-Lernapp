/**
 * Telegram-Nachricht für rote Alarme des Loop-Status (SIN-332). Das Tages-Update nutzt `sendTelegram` in digest.mjs.
 * Ohne TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID passiert nichts (false). Nie Token oder Chat-ID ausgeben.
 */
export async function sendTelegramPlain(text, env = process.env, fetchImpl = fetch) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  const res = await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
  });
  if (!res.ok) throw new Error(`Telegram: ${res.status}`);
  return true;
}
