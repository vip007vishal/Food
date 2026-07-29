const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db');
const { sendOrderEmail } = require('../services/emailService');
const { generateWhatsAppPayload } = require('../services/whatsappService');

// Create Cash on Delivery Order API
router.post('/', async (req, res) => {
    const { items, coupon, user, address } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart items are required to place an order' });
    }
    if (!user || !user.phone) {
        return res.status(400).json({ success: false, message: 'Customer mobile number is required' });
    }
    if (!address || !address.street || !address.area) {
        return res.status(400).json({ success: false, message: 'Delivery address is required' });
    }

    // Server-side total calculation
    const menu = db.getMenu();
    let subtotal = 0;
    const validatedItems = items.map(item => {
        const menuItem = menu.find(m => m.id === item.id || m.name.toLowerCase() === item.name.toLowerCase());
        const officialPrice = menuItem ? menuItem.price : (item.price || 100);
        const qty = Math.max(1, parseInt(item.qty, 10) || 1);
        const lineTotal = officialPrice * qty;
        subtotal += lineTotal;

        return {
            id: item.id,
            name: item.name,
            price: officialPrice,
            emoji: item.emoji || (menuItem ? menuItem.emoji : '🍽️'),
            qty,
            lineTotal
        };
    });

    let discount = 0;
    let deliveryFee = config.STATIC_DELIVERY_FEE; // Static ₹20 delivery fee as requested

    if (coupon) {
        const codeUpper = coupon.toUpperCase();
        const cRule = config.COUPONS[codeUpper];
        if (cRule && subtotal >= cRule.minOrder) {
            if (cRule.type === 'percent') discount = Math.round((subtotal * cRule.value) / 100);
            else if (cRule.type === 'flat') discount = Math.min(cRule.value, subtotal);
            else if (cRule.type === 'delivery') deliveryFee = 0;
        }
    }

    const total = Math.max(0, subtotal - discount + deliveryFee);
    const orderId = 'CD' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).slice(2, 5).toUpperCase();
    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const assignedAgent = config.DELIVERY_AGENTS[Math.floor(Math.random() * config.DELIVERY_AGENTS.length)];

    const orderData = {
        orderId,
        items: validatedItems,
        totals: { subtotal, discount, deliveryFee, total },
        user: { phone: user.phone, name: user.name || 'Guest Customer' },
        address: {
            street: address.street,
            area: address.area,
            pincode: address.pincode,
            landmark: address.landmark || '',
            type: address.type || 'home'
        },
        paymentMethod: 'CASH_ON_DELIVERY',
        status: 'CONFIRMED',
        assignedAgent,
        timestamp,
        createdAt: new Date().toISOString()
    };

    // Save to Database
    db.saveOrder(orderData);

    // Generate WhatsApp Payload on Server
    const whatsappPayload = generateWhatsAppPayload(orderData);
    orderData.whatsappUrl = whatsappPayload.whatsappUrl;

    // Send Server Email Notification via Nodemailer asynchronously
    sendOrderEmail(orderData).then(result => {
        orderData.emailDispatched = result.success;
    });

    return res.status(201).json({
        success: true,
        message: 'Cash on Delivery Order Placed Successfully!',
        order: orderData
    });
});

// Get Order Details API (for tracking & invoice lookup)
router.get('/:id', (req, res) => {
    const order = db.getOrderById(req.params.id);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }
    return res.json({ success: true, order });
});

module.exports = router;
