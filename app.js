import TelegramBot from 'node-telegram-bot-api';
import {Configuration, OpenAIApi} from "openai";
import {promises as fs} from 'fs';

const telegram_token = 'YOUR TOKEN'
const openapi_key = 'YOUR KEY'

const bot = new TelegramBot(telegram_token, {polling: true});

const history = [];

const eventTarget = new EventTarget();

async function handleEvent(event) {
    await fs.writeFile('users.json', JSON.stringify(event.detail), 'utf8');

}

eventTarget.addEventListener('register', handleEvent)

bot.on('message', async (msg) => {

    const chatId = msg.chat.id;
    try {
        const configuration = new Configuration({
            apiKey: openapi_key,
        });
        const openai = new OpenAIApi(configuration);
        const messages = [];

        const user_input = msg.text;
        if (user_input === '/start') {

            eventTarget.dispatchEvent(
                new CustomEvent('register',
                    {
                        detail: JSON.stringify(msg.chat)
                    }
                )
            )
        }

        for (const [input_text, completion_text] of history) {
            messages.push({role: "user", content: input_text});
            messages.push({role: "assistant", content: completion_text});
        }
        messages.push({role: "user", content: user_input});
        try {
            const completion = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: messages,
            });

            const completion_text = completion.data.choices[0].message.content;

            await bot.sendMessage(chatId, completion_text);

            history.push([user_input, completion_text]);
            if (history.length === 20) {
                for (let i = 0; i < 10; i++) {
                    history.shift();
                }
            }

        } catch (error) {
            if (error.response) {
                console.log(error.response.status);
                console.log(error.response.data);
                await bot.sendMessage(chatId, 'Oops, something went wrong!');

            } else {
                console.log(error.message);
                await bot.sendMessage(chatId, 'Oops, something went wrong!');
            }
        }

    } catch (error) {
        console.log(error);
        await bot.sendMessage(chatId, 'Oops, something went wrong!');
    }
});

