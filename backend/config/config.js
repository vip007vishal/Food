require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    SHOP_NAME: process.env.SHOP_NAME || 'Chicken Dinner Madurai',
    SHOP_ADDRESS: '123 Main Food Street, Commercial Hub, Madurai - 625001',
    SHOP_PHONE: process.env.SHOP_PHONE || '+91 98765 43210',
    SHOP_WHATSAPP_NUMBER: process.env.SHOP_WHATSAPP_NUMBER || '919876543210',
    SHOP_OWNER_EMAIL: process.env.SHOP_OWNER_EMAIL || 'orders@chickendinner.com',
    STATIC_DELIVERY_FEE: parseInt(process.env.STATIC_DELIVERY_FEE, 10) || 20,
    DELIVERY_AGENTS: ['Ramesh K.', 'Suresh P.', 'Arjun M.', 'Karthik V.', 'Dinesh R.'],
    OTP_DEMO: '123456',
    COUPONS: {
        'WELCOME20': { type: 'percent', value: 20, desc: '20% off your first order', minOrder: 100 },
        'FIRST50':   { type: 'flat',    value: 50, desc: '₹50 off on orders above ₹250', minOrder: 250 },
        'FREESHIP':  { type: 'delivery',value: 0,  desc: 'Free Delivery on this order', minOrder: 0 },
        'DINNER15':  { type: 'percent', value: 15, desc: '15% off on all items', minOrder: 150 },
    }
};
