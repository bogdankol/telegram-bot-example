import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Send a message to Telegram (native API call)
async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

// Handle Telegram updates
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract chat info
    const chatId = body.message?.chat?.id;
    const userText = body.message?.text;

    if (!chatId || !userText) {
      return NextResponse.json({ ok: false, error: "No message received" });
    }

    // Ask OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: userText }],
    });

    const aiText =
      response.choices[0].message?.content || "Sorry, I have no answer.";

    // Reply back
    await sendMessage(chatId, aiText);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: false, error });
  }
}
