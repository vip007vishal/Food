const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// Ensure data folder exists
if (!fs.existsSync(path.join(__dirname, '..', 'data'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
}

// Initial Database Template
const initialDb = {
    orders: [],
    users: [],
    menu: [
        { id: 'item_1', name: 'Location Chicken Filled Burger', category: 'burgers', price: 150, emoji: '🍔', badge: '🔥 Hot' },
        { id: 'item_2', name: 'Classic Chicken Burger', category: 'burgers', price: 140, emoji: '🍔' },
        { id: 'item_3', name: 'Classic Grilled Chicken Burger', category: 'burgers', price: 140, emoji: '🍔' },
        { id: 'item_4', name: 'Juicy Cheesy Stuffed Burger', category: 'burgers', price: 180, emoji: '🍔' },
        { id: 'item_5', name: 'Sky Storm TNT Burger', category: 'burgers', price: 160, emoji: '🍔' },
        { id: 'item_6', name: 'Sky Scraper Burger (Tower)', category: 'burgers', price: 320, emoji: '🍔', badge: '⭐ Best' },
        { id: 'item_7', name: 'Double Town Chicken Burger', category: 'burgers', price: 200, emoji: '🍔' },
        { id: 'item_8', name: 'Original Grilled Chicken (Half)', category: 'fried', price: 240, emoji: '🍗', badge: '⭐ Top Rated' },
        { id: 'item_9', name: 'Original Grilled Chicken (Full)', category: 'fried', price: 460, emoji: '🍗' },
        { id: 'item_10', name: 'Crispy Fried Chicken (2 Pcs)', category: 'fried', price: 180, emoji: '🍗' },
        { id: 'item_11', name: 'Crispy Fried Chicken (4 Pcs)', category: 'fried', price: 340, emoji: '🍗' },
        { id: 'item_12', name: 'Classic Chicken Shawarma Roll', category: 'shawarma', price: 120, emoji: '🌯' },
        { id: 'item_13', name: 'Special Peri Peri Shawarma', category: 'shawarma', price: 150, emoji: '🌯', badge: '🔥 Hot' },
        { id: 'item_14', name: 'Mexican Cheese Shawarma', category: 'shawarma', price: 160, emoji: '🌯' },
        { id: 'item_15', name: 'Chicken Cheese Pizza (Medium)', category: 'pizza', price: 280, emoji: '🍕' },
        { id: 'item_16', name: 'Supreme Meat Feast Pizza (Large)', category: 'pizza', price: 450, emoji: '🍕', badge: '⭐ Best' }
    ]
};

// Read DB
function readDb() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2));
            return initialDb;
        }
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading database:', err);
        return initialDb;
    }
}

// Write DB
function writeDb(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error writing database:', err);
    }
}

module.exports = {
    getOrders: () => readDb().orders,
    getOrderById: (id) => readDb().orders.find(o => o.orderId === id),
    saveOrder: (order) => {
        const db = readDb();
        db.orders.unshift(order);
        writeDb(db);
        return order;
    },
    getMenu: () => readDb().menu,
    getUsers: () => readDb().users,
    saveUser: (user) => {
        const db = readDb();
        const existingIdx = db.users.findIndex(u => u.phone === user.phone);
        if (existingIdx >= 0) db.users[existingIdx] = user;
        else db.users.push(user);
        writeDb(db);
        return user;
    }
};
