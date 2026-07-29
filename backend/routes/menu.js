const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db');

// Get Menu API
router.get('/', (req, res) => {
    const menu = db.getMenu();
    return res.json({ success: true, menu });
});

// Get Coupons API
router.get('/coupons', (req, res) => {
    return res.json({ success: true, coupons: config.COUPONS });
});

module.exports = router;
