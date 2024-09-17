const axios = require('axios');
const { getAllUsers, getTetherPrices, insertTetherPrice } = require('./database');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDA3MjgzIiwiaWF0IjoxNzI2MzEwNzE0LjQ0MzAyMTMsImV4cCI6MTc1Nzg0NjcxNCwic2Vzc2lvbl9pZCI6IjY5MjE5OTc1LWI4NmUtNDM5OC1hOTQ0LTA0MzgzZjRiYjM2ZCIsInR5cGUiOiJBUEkiLCJyZXF1aXJlZF9sYXllcnMiOnsicGFuZWwiOnsiZGlmZiI6W10sInVzZV9wb2xpY3kiOiJBTFdBWVMiLCJhY3RpdmUiOnt9fSwid2l0aGRyYXdhbCI6eyJkaWZmIjpbImF1dGhlbnRpY2F0b3IiXSwidXNlX3BvbGljeSI6IlJFU0VUIiwiYWN0aXZlIjp7fX0sIndoaXRlYWRkcmVzcyI6eyJkaWZmIjpbImF1dGhlbnRpY2F0b3IiLCJlbWFpbC1vdHAiXSwidXNlX3BvbGljeSI6IkVYUElSRSIsImFjdGl2ZSI6e319fX0.Oy6_9A0dTtseYkzYqmDiuOBen6GZsJO0QMnhFOGcUXo';

const userMessageIds = {}; // دیکشنری برای ذخیره شناسه پیام‌ها

async function usdtAbanTetherFetch() {
    try {
        const response = await axios.get('https://abantether.com/api/v1/otc/coin-price/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const json = response.data;
        const priceBuy = Math.floor(json.USDT.irtPriceBuy) + 250;
        const priceSell = Math.floor(json.USDT.irtPriceSell) - 250;
        const usdtPrice = { priceBuy, priceSell };
        return usdtPrice;
    } catch (error) {
        console.error('Request error:', error);
    }
}

async function sendPriceUpdateToUser(bot, userId, messageText, options = {}) {
    try {
        // ارسال پیام و ذخیره شناسه پیام
        const message = await bot.telegram.sendMessage(userId, messageText, {
            ...options,
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: '✅ من قبول مسئولیت تغییر قیمت را انجام می‌دهم 🔧', callback_data: 'click_me'
                    }]
                ]
            }
        });

        userMessageIds[userId] = message.message_id;
    } catch (error) {
        console.error(`Error sending message to user ${userId}:`, error);
    }
}

async function sendPriceUpdatedMessageToAllUsers(bot, updatedBy) {
    const users = getAllUsers();
    for (const user of users) {
        try {
            const messageText = `📊 قیمت‌ها توسط کاربر 👤 ${updatedBy} به‌روزرسانی شد ✨`;
            await bot.telegram.sendMessage(user.id, messageText);
        } catch (error) {
            console.error(`Error sending update message to user ${user.id}:`, error);
        }
    }
}



async function removeButtonsFromAllMessages(bot) {
    const users = getAllUsers(); // از ماژول database استفاده می‌کنیم
    for (const user of users) {
        try {
            const messageId = userMessageIds[user.id];
            if (messageId) {
                try {
                    // حذف دکمه‌ها از پیام
                    await bot.telegram.editMessageReplyMarkup(user.id, messageId, null, {
                        inline_keyboard: []
                    });
                    // حذف شناسه پیام بعد از ویرایش
                    delete userMessageIds[user.id];
                } catch (error) {
                    console.error(`Error editing message for user ${user.id}:`, error);
                }
            }
        } catch (error) {
            console.error(`Error processing user ${user.id}:`, error);
        }
    }
}



async function checkPriceChange(bot) {
    const currentPrice = await usdtAbanTetherFetch();
    if (!currentPrice) return;

    const tetherPrices = getTetherPrices();
    if (!tetherPrices) return;

    const priceDifferenceBuy = Math.abs(tetherPrices.current_usdt_buy_price - currentPrice.priceBuy);
    const priceDifferenceSell = Math.abs(tetherPrices.current_usdt_sell_price - currentPrice.priceSell);

    if (priceDifferenceBuy >= 1 || priceDifferenceSell >= 1) {
        // حذف دکمه‌های پیام‌های قبلی
        await removeButtonsFromAllMessages(bot);

        const users = getAllUsers();
        users.forEach(user => {
            sendPriceUpdateToUser(bot, user.id, `🔄 قیمت تتر تغییر کرد. قیمت‌های جدید به شرح زیر است:\n💵 خرید: <code>${currentPrice.priceBuy}</code>\n💸 فروش: <code>${currentPrice.priceSell}</code>`, {
                parse_mode: 'HTML'
            });
        });
    }
}


async function handleInlineButton(bot) {
    bot.on('callback_query', async (ctx) => {
        try {
            if (ctx.update.callback_query.data === 'click_me') {
                const userId = ctx.update.callback_query.from.id;

                // به‌روزرسانی دیتابیس برای تغییر قیمت بر اساس قیمت‌های جدید
                const currentPrice = await usdtAbanTetherFetch();
                if (!currentPrice) return;

                // استفاده از تابع جدید برای درج قیمت‌ها
                insertTetherPrice(currentPrice.priceBuy, currentPrice.priceSell, userId);

                // حذف دکمه‌ها از پیام‌های موجود
                await removeButtonsFromAllMessages(bot);

                // ارسال پیام "Prices updated by user" به همه کاربران
                await sendPriceUpdatedMessageToAllUsers(bot, ctx.update.callback_query.from.first_name);

                // حذف دکمه‌ها از پیام‌های جدید
                await ctx.editMessageReplyMarkup({
                    inline_keyboard: [] // این بخش کیبورد را خالی می‌کند و دکمه حذف می‌شود
                });

                await ctx.answerCbQuery('Price updated!');
            }
        } catch (error) {
            console.log('Error in handle inline button function', error);
        }
    });
}


module.exports = {
    usdtAbanTetherFetch,
    checkPriceChange,
    handleInlineButton
};
