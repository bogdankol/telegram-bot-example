import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions'

// Send a message to Telegram (native API call)
async function sendMessage(chatId: number, text: string) {
	await fetch(`${TELEGRAM_API}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			chat_id: chatId,
			text,
		}),
	})
}

export async function GET(req: NextRequest) {
	return NextResponse.json({ hiThere: 'hello there' })
}

// Handle Telegram updates
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id;
    const userText = body.message?.text;

    if (!chatId || !userText) {
      return NextResponse.json({ ok: false, error: "No message received" });
    }

    let aiText: string;

    try {
      const response = await fetch(OPENROUTER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{ role: "user", content: userText }],
          max_tokens: 100, // stay within free quota
        }),
      });

      const data = await response.json();

      // Handle quota exceeded
      if (data.error?.code === 402) {
        aiText = "⚡ Sorry, the AI can't respond because the free quota was exceeded.";
      } else {
        // Safe access to message content
        const messageObj = data.choices?.[0]?.message;
        aiText = messageObj?.content ?? "⚡ Sorry, I have no answer.";
      }
    } catch (err) {
      console.error("OpenRouter error:", err);
      aiText = "⚡ Sorry, my AI brain is offline right now!";
    }

    await sendMessage(chatId, aiText);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: false, error: String(error) });
  }
}
