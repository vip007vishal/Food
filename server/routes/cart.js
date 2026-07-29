const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db');

// Calculate Cart Totals & Validate Coupons on Server
router.post('/calculate', (req, res) => {
    const { cart, coupon } = req.body;

    if (!Array.isArray(cart)) {
        return res.status(400).json({ success: false, message: 'Cart must be an array of items' });
    }

    const menu = db.getMenu();

    // Verify item prices from official menu database on server
    let subtotal = 0;
    const validatedItems = cart.map(item => {
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
    let appliedCoupon = null;
    let deliveryFee = config.STATIC_DELIVERY_FEE; // Static ₹20 delivery fee as requested

    if (coupon) {
        const codeUpper = coupon.toUpperCase();
        const cRule = config.COUPONS[codeUpper];
        if (cRule) {
            if (subtotal >= cRule.minOrder) {
                appliedCoupon = { code: codeUpper, ...cRule };
                if (cRule.type === 'percent') {
                    discount = Math.round((subtotal * cRule.value) / 100);
                } else if (cRule.type === 'flat') {
                    discount = Math.min(cRule.value, subtotal);
                } else if (cRule.type === 'delivery') {
                    deliveryFee = 0;
                }
            }
        }
    }

    const grandTotal = Math.max(0, subtotal - discount + deliveryFee);

    return res.json({
        success: true,
        totals: {
            subtotal,
            discount,
            deliveryFee,
            grandTotal,
            appliedCoupon
        },
        items: validatedItems
    });
});

module.exports = router;
