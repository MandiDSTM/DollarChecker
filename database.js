const Database = require('better-sqlite3')
const db = Database('user.db')


db.exec(`
      CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT
  );`)


// db.exec(`DELETE FROM tether
// `)


db.exec(`
    CREATE TABLE IF NOT EXISTS tether (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        current_usdt_buy_price REAL NOT NULL DEFAULT 0,
        current_usdt_sell_price REAL NOT NULL DEFAULT 0,
        modified_by INTEGER,
        time_changed DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);


// افزودن رکورد با مقادیر اولیه (اگر جدول خالی است)
const existingRecord = db.prepare('SELECT COUNT(*) AS count FROM tether').get();
if (existingRecord.count === 0) {
    db.prepare(`
        INSERT INTO tether (current_usdt_buy_price, current_usdt_sell_price)
        VALUES (0, 0)
    `).run();
}



function userExists(chatId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(chatId)
    return user !== undefined
}

function addUser(chatId, name) {
    db.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(chatId, name)
}

function findingUserName(chatId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(chatId)
    return user.name
}

function getAllUsers() {
    return db.prepare('SELECT * FROM users').all();
}

function getTetherPrices() {
    const row = db.prepare('SELECT current_usdt_buy_price, current_usdt_sell_price FROM tether ORDER BY time_changed DESC LIMIT 1').get();
    return row || { current_usdt_buy_price: 0, current_usdt_sell_price: 0 }; // مقدار پیش‌فرض در صورت نبود داده
}

function insertTetherPrice(buyPrice, sellPrice, modifiedBy) {
    db.prepare('INSERT INTO tether (current_usdt_buy_price, current_usdt_sell_price, modified_by, time_changed) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run(buyPrice, sellPrice, modifiedBy);
}

module.exports = {
    userExists,
    addUser,
    findingUserName,
    getAllUsers,
    getTetherPrices,
    insertTetherPrice
}
