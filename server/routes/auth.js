const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db');

// Send OTP API
router.post('/send-otp', (req, res) => {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Invalid 10-digit mobile number' });
    }

    return res.json({
        success: true,
        message: 'OTP sent successfully to +91 ' + phone,
        demoOtp: config.OTP_DEMO
    });
});

// Verify OTP API
router.post('/verify-otp', (req, res) => {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) {
        return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    if (otp !== config.OTP_DEMO) {
        return res.status(401).json({ success: false, message: `Incorrect OTP. Try ${config.OTP_DEMO}` });
    }

    const user = db.saveUser({
        phone,
        name: name || 'Guest Customer',
        lastLogin: new Date().toISOString()
    });

    return res.json({
        success: true,
        message: 'OTP verified successfully!',
        user,
        token: 'token_' + Date.now() + '_' + phone
    });
});

module.exports = router;
