# 🚀 Hostinger Production Deployment Guide
## Chicken Location / Chicken Dinner Madurai — Full-Stack Web Application

This project is completely separated into a **Decoupled Frontend Client** (`frontend/`) and a **Node.js Express REST API Backend** (`backend/`), making it 100% ready for deployment on **Hostinger**.

---

## 📂 Project Structure Overview

```
c:\Users\Vishal\Food\
├── frontend/                     <-- Pure Static Web Application (For Hostinger public_html)
│   ├── index.html                <-- Main website HTML
│   ├── order.css                 <-- Luxury styling & animations
│   ├── order.js                  <-- Client REST API controller
│   ├── config.js                 <-- ⚙️ Hostinger API Target URL config
│   ├── .htaccess                 <-- Apache CORS & caching header rules
│   └── [images...]               <-- All media assets (pizza.png, burger.jpg, etc.)
│
├── backend/                      <-- Node.js Express REST API Server (For Hostinger Node.js App / VPS)
│   ├── server.js                 <-- Server entry point
│   ├── package.json              <-- Dependencies (Express, Cors, Nodemailer, Dotenv)
│   ├── .env                      <-- Environment configuration
│   ├── .env.example              <-- Template for production environment variables
│   ├── config/config.js          <-- Shop constants, coupons & static delivery fee
│   ├── db/db.js                  <-- JSON File Database manager
│   ├── data/db.json              <-- Persisted orders & menu database
│   ├── routes/                   <-- API Routes (/api/auth, /api/menu, /api/cart, /api/orders)
│   └── services/                 <-- Server services (email & WhatsApp link generators)
│
└── HOSTINGER_DEPLOYMENT.md       <-- This deployment guide
```

---

## 🌐 Step 1: Deploy Frontend to Hostinger Shared Hosting (`public_html`)

1. Log in to your **Hostinger hPanel** dashboard.
2. Go to **Websites** → Select your domain → Click **File Manager**.
3. Open the `public_html` directory.
4. Upload **ALL contents of the `frontend/` folder** directly into `public_html`:
   - `index.html`
   - `order.css`
   - `order.js`
   - `config.js`
   - `.htaccess`
   - All image files (`pizza.png`, `burger.jpg`, `grill.jpg`, etc.)

---

## ⚙️ Step 2: Deploy Backend to Hostinger Node.js Application Manager (or VPS / Render)

### Option A: Hostinger hPanel Node.js Application Manager
1. In Hostinger hPanel, search for **Setup Node.js App** (available on Hostinger Business / Cloud hosting or cPanel).
2. Click **Create Application**:
   - **Node.js Version**: Select `18.x`, `20.x`, or `22.x`.
   - **Application Mode**: `Production`.
   - **Application Root**: `backend` (or root path where backend files are uploaded).
   - **Application URL**: `https://api.yourdomain.com` (or your domain).
   - **Application Startup File**: `server.js`.
3. Upload the contents of the `backend/` directory to your Node.js application directory.
4. In Hostinger Node.js App Manager, click **Run npm install**.
5. Add Environment Variables in the app settings:
   - `PORT=3000`
   - `SHOP_NAME="Chicken Dinner Madurai"`
   - `STATIC_DELIVERY_FEE=20`
   - `SHOP_OWNER_EMAIL="orders@chickendinner.com"`
   - `SMTP_HOST="smtp.gmail.com"`
   - `SMTP_USER="orders@chickendinner.com"`
   - `SMTP_PASS="your_email_app_password"`
6. Click **Start Application**.

### Option B: Free Cloud Backend Deployment (Render / Railway / Fly.io)
If using standard Hostinger Web Hosting without Node.js root access, you can host the backend for free on **Render.com**:
1. Push your project repository to GitHub.
2. Log in to [Render.com](https://render.com) and click **New Web Service**.
3. Connect your GitHub repository.
4. Set **Root Directory**: `backend`.
5. Set **Build Command**: `npm install`.
6. Set **Start Command**: `node server.js`.
7. Add Environment Variables (`PORT=3000`, `STATIC_DELIVERY_FEE=20`, etc.).
8. Click **Create Web Service**. Copy the generated live backend URL (e.g. `https://chicken-dinner-api.onrender.com`).

---

## 🔗 Step 3: Link Frontend to Production Backend URL

1. In Hostinger File Manager (`public_html`), edit `config.js`:
```javascript
window.APP_CONFIG = {
    API_BASE: 'https://chicken-dinner-api.onrender.com' // Replace with your live backend API URL
};
```
2. Save changes.

---

## ✅ Step 4: Verify Your Production App

1. Open `https://yourdomain.com` in your browser.
2. **Menu & Offers**: Loaded directly from server backend.
3. **Cart Calculations**: Server verifies prices & applies static ₹20 delivery fee.
4. **OTP Verification**: Server authenticates 10-digit Indian phone number (Demo OTP: `123456`).
5. **Order Placement (COD)**:
   - Order stored permanently in `backend/data/db.json`.
   - Pre-formatted WhatsApp order message opens automatically.
   - Invoice email dispatched to shop owner via Nodemailer.
