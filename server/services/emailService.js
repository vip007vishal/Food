const nodemailer = require('nodemailer');
const config = require('../config');

// Configure Nodemailer Transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || config.SHOP_OWNER_EMAIL,
        pass: process.env.SMTP_PASS || 'demo_password'
    }
});

function buildHTMLInvoice(orderData) {
    const addr = orderData.address;
    const addrStr = `${addr.street}, ${addr.area} - ${addr.pincode}${addr.landmark ? ' (Near ' + addr.landmark + ')' : ''} [${(addr.type || 'home').toUpperCase()}]`;

    const itemsRows = orderData.items.map(i => `
        <tr>
            <td style="padding:10px;border-bottom:1px solid #eee;font-weight:600;">${i.name}</td>
            <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
            <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">₹${i.price}</td>
            <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:#e87a0c;">₹${i.price * i.qty}</td>
        </tr>
    `).join('');

    return `
        <div style="font-family: 'Outfit', Arial, sans-serif; max-width:600px; margin:0 auto; border:2px solid #F7931E; border-radius:20px; padding:28px; background:#ffffff;">
            <div style="text-align:center; border-bottom:2px solid #FFF0E0; padding-bottom:16px; margin-bottom:20px;">
                <h2 style="color:#E63946; margin:0; font-size:24px;">🍗 CHICKEN DINNER MADURAI</h2>
                <p style="color:#666; font-size:12px; margin:4px 0 0 0;">Official Order Invoice — Cash on Delivery</p>
            </div>
            
            <div style="background:#FFF8F0; padding:16px; border-radius:14px; margin-bottom:20px;">
                <p style="margin:4px 0; font-size:14px;"><strong>Order ID:</strong> <span style="color:#e87a0c; font-family:monospace; font-weight:bold;">${orderData.orderId}</span></p>
                <p style="margin:4px 0; font-size:14px;"><strong>Date & Time:</strong> ${orderData.timestamp}</p>
                <p style="margin:4px 0; font-size:14px;"><strong>Customer Mobile:</strong> +91 ${orderData.user.phone}</p>
                <p style="margin:4px 0; font-size:14px;"><strong>Delivery Address:</strong> ${addrStr}</p>
                <p style="margin:4px 0; font-size:14px;"><strong>Payment Method:</strong> Cash on Delivery (COD)</p>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:14px;">
                <thead>
                    <tr style="background:#FFE0C0; color:#1E0F05;">
                        <th style="padding:10px; text-align:left;">Item</th>
                        <th style="padding:10px; text-align:center;">Qty</th>
                        <th style="padding:10px; text-align:right;">Rate</th>
                        <th style="padding:10px; text-align:right;">Total</th>
                    </tr>
                </thead>
                <tbody>${itemsRows}</tbody>
            </table>

            <div style="background:#FFF0E0; padding:16px; border-radius:14px; text-align:right; font-size:14px;">
                <p style="margin:4px 0;">Subtotal: ₹${orderData.totals.subtotal}</p>
                ${orderData.totals.discount > 0 ? `<p style="margin:4px 0; color:#15803d;">Coupon Discount: −₹${orderData.totals.discount}</p>` : ''}
                <p style="margin:4px 0;">Delivery Fee (Static): ₹${orderData.totals.deliveryFee}</p>
                <h3 style="margin:8px 0 0 0; color:#E63946; font-size:18px;">Grand Total: ₹${orderData.totals.total} (Cash)</h3>
            </div>
            
            <p style="text-align:center; font-size:12px; color:#8C6E5B; margin-top:24px;">Thank you for ordering with Chicken Dinner Madurai! 🍗</p>
        </div>
    `;
}

async function sendOrderEmail(orderData) {
    const html = buildHTMLInvoice(orderData);
    const mailOptions = {
        from: `"Chicken Dinner Server" <${config.SHOP_OWNER_EMAIL}>`,
        to: config.SHOP_OWNER_EMAIL,
        subject: `🍗 New Order #${orderData.orderId} from +91 ${orderData.user.phone}`,
        html: html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Server Email Dispatched:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.warn('⚠️ SMTP Email warning (falling back to client mailto link):', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { sendOrderEmail, buildHTMLInvoice };
