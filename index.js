const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');

// 1. Initialize Groq API with your key
const groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY 
});

let activeModel = 'llama-3.3-70b-versatile';

// Helper function to auto-detect and select an active Groq model if needed
async function detectAvailableModel() {
    try {
        const modelsList = await groq.models.list();
        const availableModels = modelsList.data.map(m => m.id);

        const priorityList = [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'llama3-70b-8192',
            'llama3-8b-8192',
            'mixtral-8x7b-32768'
        ];

        for (const model of priorityList) {
            if (availableModels.includes(model)) {
                return model;
            }
        }
        return availableModels[0] || activeModel;
    } catch (err) {
        return activeModel;
    }
}

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
client.on('ready', async () => {
    activeModel = await detectAvailableModel();
    console.log(`✅ WhatsApp Groq Bot is online and ready! Using active model: ${activeModel}`);
});

// 5. Handle incoming messages
client.on('message', async (message) => {
    // Ignore group chats, status updates, and broadcast channels
    if (message.from.endsWith('@g.us') || message.isStatus || message.from.includes('newsletter')) return;

    // Ignore your own sent messages
    if (message.fromMe) return;

    try {
        console.log(`\n📩 Incoming from ${message.from}: "${message.body}"`);

        // System prompt guiding AI language and persona
        const systemInstruction = `
        You are an AI personal assistant replying on Allan's WhatsApp account.
        Automatically detect whether the incoming text is written in English, Kiswahili, or Sheng.
        Reply warmly, naturally, and concisely in the exact same language used by the sender.
        Keep replies conversational and friendly, matching standard text message length.
        `;

        // Generate response using Groq
        const chatCompletion = await groq.chat.completions.create({
            model: activeModel,
            messages: [
                { role: 'system', content: systemInstruction },
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