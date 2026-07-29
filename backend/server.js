const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

// CORS Middleware Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['*'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Allow for production cross-domain web clients
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        shop: config.SHOP_NAME,
        timestamp: new Date().toISOString(),
        deliveryFee: config.STATIC_DELIVERY_FEE
    });
});

// Fallback static serving if frontend files exist alongside backend
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API 404 handler for unknown endpoints
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('🍗 Chicken Dinner REST API Server is Running!');
    }
});

// Start Server
const PORT = process.env.PORT || config.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
=====================================================
🍗 CHICKEN DINNER BACKEND API SERVER (HOSTINGER READY) 🍗
=====================================================
🚀 Server is running on: http://localhost:${PORT}
💳 Payment Mode: Cash on Delivery (COD) Only
🚚 Static Delivery Fee: ₹${config.STATIC_DELIVERY_FEE}
📁 Database: ${path.join(__dirname, 'data', 'db.json')}
=====================================================
        `);
    });
}

module.exports = app;
