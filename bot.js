const { Telegraf } = require('telegraf');
const { checkPassword, requestName } = require('./auth');
const { userExists, addUser, findingUserName } = require('./database');
const { usdtAbanTetherFetch, checkPriceChange, handleInlineButton } = require('./price');
const schedule = require('node-schedule');

const bot = new Telegraf("7182990304:AAH0sU4VDT8nyX0jc5uehBAL7xjlYfw1VBo");

const userState = {};

const keyboard = [
    ['قیمت لحظه ای تتر']
];

const fetchUsdtPrice = async () => {
    try {
        const result = await usdtAbanTetherFetch();
        return result;
    } catch (error) {
        console.error('Error fetching USDT price:', error);
        return { priceBuy: 'Error', priceSell: 'Error' }; // مقدار پیش‌فرض در صورت بروز خطا
    }
};

bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    try {
        await ctx.reply('Please enter your password 🔑');
        userState[chatId] = { awaitingPassword: true };
    } catch (error) {
        console.error('Error in /start handler:', error);
    }
});

bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const message = ctx.message.text;

    if (userState[chatId]?.awaitingPassword) {
        try {
            const isValid = checkPassword(message);
            if (isValid) {
                const exists = userExists(chatId);
                if (!exists) {
                    await ctx.reply('لطفا نام خود را وارد کنید 😊');
                    userState[chatId] = { awaitingName: true };
                } else {
                    const name = findingUserName(chatId);
                    await ctx.reply(`دوست بیت سوبیتی من <b>${name}</b> 😍 عزیز، خوش برگشتید!`, { parse_mode: 'HTML' });
                    const price = await fetchUsdtPrice();
                    await ctx.reply(`🔍 قیمت خرید تتر:  ${price.priceBuy}\n💰 قیمت فروش تتر: ${price.priceSell}`);
                }
            } else {
                await ctx.reply('رمز عبور نامعتبر است');
            }
            delete userState[chatId].awaitingPassword;
        } catch (error) {
            console.error('Error in /text handler while checking password:', error);
        }
    } else if (userState[chatId]?.awaitingName) {
        try {
            const name = message.trim();
            if (name) {
                console.log('fireeeeeeee');
                addUser(chatId, name);
                const price = await fetchUsdtPrice();
                await ctx.reply(`🌟 خوش آمدید، ${name}! 🎉 امیدواریم از بودن در کنار ما لذت ببرید.`);
                await ctx.reply(`💰 قیمت تتر در حال حاضر: ${price.priceBuy} USDT`);
            } else {
                await ctx.reply('لطفا نام خود را به درستی وارد کنید!!');
            }
            delete userState[chatId];
        } catch (error) {
            console.error('Error in /text handler while adding user:', error);
        }
    }
});

handleInlineButton(bot);

schedule.scheduleJob('*/1 * * * *', async () => {
    console.log('1min left');
    try {
        await checkPriceChange(bot);
    } catch (error) {
        console.error('Error in scheduled job for price change:', error);
    }
});

bot.launch().catch(error => {
    console.error('Error launching bot:', error);
})