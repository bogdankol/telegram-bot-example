import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

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

export async function GET(req: NextRequest) {
  return NextResponse.json({ hiThere: "hello there" });
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

    let aiText: string;

    try {
      // Try to get response from OpenAI
      const response = await fetch(OPENROUTER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{ role: "user", content: userText }],
        }),
      })

      const data = await response.json()

      aiText = data.choices[0].message?.content || "Sorry, I have no answer.";
    } catch (err) {
      console.error("OpenAI error:", err);
      // Fallback message when quota is exceeded or API is unavailable
      aiText = "⚡ Sorry, my AI brain is offline right now!";
    }

    // Always reply back (AI or fallback)
    await sendMessage(chatId, aiText);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: false, error: String(error) });
  }
}
