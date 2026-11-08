require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');

const systemPrompt = `You are an AI personal assistant representing Allan Brian on WhatsApp. 
Your job is to reply to messages when Allan is away or busy. 
Automatically detect whether the incoming text is written in English, Kiswahili, or Sheng. 
Reply warmly, naturally, and concisely in the exact same language used by the sender. 
Keep your tone casual, friendly, and natural. 
If someone asks where Allan is or what he's doing, let them know naturally that he has stepped out or gone somewhere, but he'll be back later. 
Do not pretend to be Allan in real-time if they ask for details you don't know, but always speak on his behalf as his automated assistant.`;

// 1. Initialize Groq API with your key
const groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY
});

// 2. Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth()
});

// 3. Display QR Code in your terminal
client.on('qr', (qr) => {
    console.log('\n--- SCAN THIS QR CODE WITH YOUR WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

// 4. Log when connection is successful
client.on('ready', () => {
    console.log(`✅ WhatsApp Groq Bot is online and ready! Using active model: llama-3.3-70b-versatile`);
});

// 5. Handle incoming messages
client.on('message', async (message) => {
    // Ignore group chats, status updates, and broadcast channels
    if (message.from.endsWith('@g.us') || message.isStatus || message.from.includes('newsletter')) return;

    // Ignore your own sent messages
    if (message.fromMe) return;

    try {
        console.log(`\n📩 Incoming from ${message.from}: "${message.body}"`);

        // Generate response using Groq with your away assistant persona and stable model
        const chatCompletion = await groq.chat.completions.create({
            model: 'openai/gpt-oss-safeguard-20b',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message.body }
            ],
            temperature: 0.7,
            max_completion_tokens: 300,
        });

        const replyText = chatCompletion.choices[0]?.message?.content;

        if (replyText) {
            // Send reply back to the chat
            await message.reply(replyText);
            console.log(`📤 Replied: "${replyText}"`);
        }

    } catch (error) {
        console.error('❌ Error generating AI response:', error);
    }
});

// 6. Start the bot
client.initialize();
