const config = require('../config');

function generateWhatsAppPayload(orderData) {
    const addr = orderData.address;
    const addrStr = `${addr.street}, ${addr.area} - ${addr.pincode}${addr.landmark ? ' (Near ' + addr.landmark + ')' : ''} [${(addr.type || 'home').toUpperCase()}]`;

    const itemsText = orderData.items.map(i => `• ${i.qty}x ${i.name} — ₹${i.price * i.qty}`).join('\n');

    const message = `🍗 *NEW ORDER RECEIVED - CHICKEN DINNER* 🍗
--------------------------------
*Order ID:* ${orderData.orderId}
*Date & Time:* ${orderData.timestamp}
*Customer Mobile:* +91 ${orderData.user.phone}
*Delivery Address:* ${addrStr}

📋 *ITEMS ORDERED:*
${itemsText}

--------------------------------
*Items Subtotal:* ₹${orderData.totals.subtotal}
${orderData.totals.discount > 0 ? `*Coupon Discount:* −₹${orderData.totals.discount}\n` : ''}*Delivery Fee (Static):* ₹${orderData.totals.deliveryFee}
*GRAND TOTAL:* ₹${orderData.totals.total}
*PAYMENT METHOD:* CASH ON DELIVERY (COD)
--------------------------------
Please accept & start preparing this order! 🙏`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${config.SHOP_WHATSAPP_NUMBER}&text=${encodedText}`;

    return { message, whatsappUrl };
}

module.exports = { generateWhatsAppPayload };
