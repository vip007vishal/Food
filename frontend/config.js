/* ========================================================
   FRONTEND API CONFIGURATION — Hostinger / Production
======================================================== */
window.APP_CONFIG = {
    // Production Backend API Base URL
    // When hosting backend on Hostinger Node.js App Manager / VPS / Render:
    // Change this URL to your live API domain, e.g.: 'https://api.yourdomain.com' or 'https://your-backend.onrender.com'
    API_BASE: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
        ? 'http://localhost:3000'
        : 'http://localhost:3000' // REPLACE THIS WITH YOUR LIVE HOSTINGER BACKEND URL
};
