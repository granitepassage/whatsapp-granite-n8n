import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

// ===== CONFIG =====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "unicom2004";
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v21.0";

// ===== VERIFY ENDPOINT (GET) =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    return res.status(200).send(challenge);
  } else {
    console.warn("❌ Verification failed.");
    return res.sendStatus(403);
  }
});

// ===== RECEIVE & REPLY (POST) =====
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("📩 Incoming:", JSON.stringify(body, null, 2));

    // Check if the webhook is from a message
    if (body.object) {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.from) {
        const from = message.from; // user phone
        const text = message.text?.body?.trim() || "";

        // Simple auto-response
        const replyText =
          text.toLowerCase().includes("привіт") ||
          text.toLowerCase().includes("hello")
            ? "Привіт! Це Granite Passage. Надішліть слово 'каталог', щоб отримати перелік продукції."
            : text.toLowerCase().includes("каталог")
            ? "🧱 Каталог:\n1️⃣ Бруківка — від 320 грн/м²\n2️⃣ Плитка — від 540 грн/м²\n3️⃣ Бордюри — від 250 грн/пог.м"
            : "Дякуємо за повідомлення! З вами зв'яжеться менеджер. 📞";

        await axios.post(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: replyText },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ACCESS_TOKEN}`,
            },
          }
        );

        console.log("✅ Replied to", from);
      }
      return res.sendStatus(200);
    } else {
      return res.sendStatus(404);
    }
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    return res.sendStatus(500);
  }
});

// ===== ROOT INFO =====
app.get("/", (req, res) => {
  res.send("✅ WhatsApp Granite webhook is running.");
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
