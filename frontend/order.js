/* ================================================
   ORDER SYSTEM JS — Chicken Dinner
   Backend REST API Integrated Frontend Client
================================================ */

(function () {
    'use strict';

    /* ============================================
       API BASE URL CONFIGURATION
    ============================================ */
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE)
        ? window.APP_CONFIG.API_BASE
        : (window.location.origin.startsWith('file:') || window.location.origin.includes('127.0.0.1') ? 'http://localhost:3000' : '');

    /* ============================================
       STATE
    ============================================ */
    const STATE = {
        user: JSON.parse(localStorage.getItem('cd_user') || 'null'),
        address: JSON.parse(localStorage.getItem('cd_address') || 'null'),
        cart: JSON.parse(localStorage.getItem('cd_cart') || '[]'),
        coupon: JSON.parse(localStorage.getItem('cd_coupon') || 'null'),
        pendingFlow: null, // 'cart' | 'checkout'
    };

    const DELIVERY_AGENTS = ['Ramesh K.', 'Suresh P.', 'Arjun M.', 'Karthik V.', 'Dinesh R.'];
    const OTP_DEMO = '123456';

    /* ============================================
       UTILITY FUNCTIONS
    ============================================ */
    function saveState() {
        localStorage.setItem('cd_cart', JSON.stringify(STATE.cart));
        localStorage.setItem('cd_coupon', JSON.stringify(STATE.coupon));
        if (STATE.user) localStorage.setItem('cd_user', JSON.stringify(STATE.user));
        if (STATE.address) localStorage.setItem('cd_address', JSON.stringify(STATE.address));
    }

    function showToast(msg, icon = '✅') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fadeout');
            setTimeout(() => toast.remove(), 350);
        }, 2800);
    }

    function formatINR(n) {
        return '₹' + Math.round(n).toLocaleString('en-IN');
    }

    /* ============================================
       OFFER BANNER SLIDER
    ============================================ */
    function initOfferSlider() {
        const slides = document.querySelectorAll('.offer-slide');
        const dots = document.querySelectorAll('.offer-dot');
        if (!slides.length) return;
        let current = 0;
        let timer;

        function goTo(idx) {
            slides[current].classList.remove('active');
            dots[current]?.classList.remove('active');
            current = idx % slides.length;
            slides[current].classList.add('active');
            dots[current]?.classList.add('active');
        }

        dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetTimer(); }));

        function resetTimer() { clearInterval(timer); timer = setInterval(() => goTo(current + 1), 4500); }
        resetTimer();
        goTo(0);
    }

    /* ============================================
       COUPON CARD APPLY (from Offers Section)
    ============================================ */
    function initCouponCards() {
        document.querySelectorAll('.coupon-apply-btn[data-code]').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.code;
                applyCoupon(code);
                showToast(`Coupon ${code} applied! Open cart to see discount.`, '🏷️');
                btn.textContent = '✓ Applied';
                btn.classList.add('applied');
            });
        });
    }

    /* ============================================
       OVERLAY HELPERS
    ============================================ */
    function openOverlay(id) {
        const el = document.getElementById(id);
        if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
    }
    function closeOverlay(id) {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
    }

    /* Close on backdrop click */
    document.querySelectorAll('.order-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeOverlay(overlay.id);
        });
    });

    /* ============================================
       LOGIN / OTP FLOW (BACKEND API INTEGRATED)
    ============================================ */
    let otpResendTimer = null;
    let otpPhone = '';

    function openLogin(nextFlow) {
        STATE.pendingFlow = nextFlow || null;
        if (STATE.user) {
            runPendingFlow();
            return;
        }
        resetLoginModal();
        openOverlay('login-overlay');
    }

    function resetLoginModal() {
        document.getElementById('phone-step')?.classList.remove('hidden');
        document.getElementById('otp-step')?.classList.remove('visible');
        const phoneInput = document.getElementById('phone-input');
        if (phoneInput) phoneInput.value = '';
        document.querySelectorAll('.otp-box').forEach(b => b.value = '');
    }

    function runPendingFlow() {
        if (STATE.pendingFlow === 'location') {
            openLocationModal();
        } else if (STATE.pendingFlow === 'cart' || STATE.pendingFlow === 'checkout') {
            openCart();
        }
        STATE.pendingFlow = null;
    }

    // Send OTP API call
    document.getElementById('send-otp-btn')?.addEventListener('click', async () => {
        const phone = document.getElementById('phone-input').value.trim();
        if (!/^[6-9]\d{9}$/.test(phone)) {
            document.getElementById('phone-input').classList.add('invalid');
            showToast('Enter a valid 10-digit mobile number', '⚠️');
            return;
        }
        document.getElementById('phone-input').classList.remove('invalid');
        otpPhone = phone;
        await sendOTPBackend(phone);
    });

    async function sendOTPBackend(phone) {
        const btn = document.getElementById('send-otp-btn');
        btn.disabled = true;
        btn.textContent = 'Sending OTP via Backend…';

        try {
            const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();

            if (data.success) {
                document.getElementById('phone-step').classList.add('hidden');
                const otpStep = document.getElementById('otp-step');
                otpStep.classList.add('visible');
                document.getElementById('otp-phone-display').textContent = '+91 ' + phone;
                document.getElementById('otp-demo-hint').textContent = `(Demo OTP: ${data.demoOtp || OTP_DEMO})`;
                startOtpTimer();
                document.querySelector('.otp-box')?.focus();
                showToast('OTP sent by server!', '📱');
            } else {
                showToast(data.message || 'Failed to send OTP', '⚠️');
            }
        } catch (err) {
            // Fallback UI if backend server is unreachable
            document.getElementById('phone-step').classList.add('hidden');
            document.getElementById('otp-step').classList.add('visible');
            document.getElementById('otp-phone-display').textContent = '+91 ' + phone;
            document.getElementById('otp-demo-hint').textContent = `(Demo OTP: ${OTP_DEMO})`;
            startOtpTimer();
            document.querySelector('.otp-box')?.focus();
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send OTP';
        }
    }

    function startOtpTimer() {
        let seconds = 30;
        const timerEl = document.getElementById('otp-countdown');
        const resendBtn = document.getElementById('resend-otp-btn');
        if (!timerEl) return;
        timerEl.textContent = `Resend in ${seconds}s`;
        if (resendBtn) resendBtn.style.display = 'none';
        clearInterval(otpResendTimer);
        otpResendTimer = setInterval(() => {
            seconds--;
            timerEl.textContent = seconds > 0 ? `Resend in ${seconds}s` : '';
            if (seconds <= 0) {
                clearInterval(otpResendTimer);
                timerEl.textContent = '';
                if (resendBtn) resendBtn.style.display = 'inline';
            }
        }, 1000);
    }

    document.getElementById('resend-otp-btn')?.addEventListener('click', () => {
        document.querySelectorAll('.otp-box').forEach(b => b.value = '');
        sendOTPBackend(otpPhone);
    });

    // OTP Boxes — auto-focus next
    document.querySelectorAll('.otp-box').forEach((box, idx, boxes) => {
        box.addEventListener('input', e => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val.slice(-1);
            if (val && idx < boxes.length - 1) boxes[idx + 1].focus();
            box.classList.toggle('filled', !!e.target.value);
        });
        box.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !box.value && idx > 0) {
                boxes[idx - 1].focus();
                boxes[idx - 1].value = '';
                boxes[idx - 1].classList.remove('filled');
            }
        });
    });

    // Verify OTP API Call
    document.getElementById('verify-otp-btn')?.addEventListener('click', verifyOTPBackend);

    async function verifyOTPBackend() {
        const entered = Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
        if (entered.length < 6) { showToast('Enter complete 6-digit OTP', '⚠️'); return; }

        const btn = document.getElementById('verify-otp-btn');
        btn.disabled = true;
        btn.textContent = 'Verifying with Backend…';

        try {
            const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: otpPhone, otp: entered, name: 'Guest Customer' })
            });
            const data = await res.json();

            if (data.success) {
                STATE.user = data.user || { phone: otpPhone, name: 'Guest Customer' };
                saveState();
                closeOverlay('login-overlay');
                updateNavUserUI();
                showToast('Logged in successfully!', '🎉');
                if (!STATE.address) {
                    STATE.pendingFlow = STATE.pendingFlow || 'cart';
                    setTimeout(() => openLocationModal(), 400);
                } else {
                    runPendingFlow();
                }
            } else {
                showToast(data.message || 'Incorrect OTP', '❌');
                document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; b.classList.remove('filled'); });
                document.querySelector('.otp-box')?.focus();
            }
        } catch (err) {
            // Fallback verification if backend API unavailable
            if (entered === OTP_DEMO) {
                STATE.user = { phone: otpPhone, name: 'Guest Customer' };
                saveState();
                closeOverlay('login-overlay');
                updateNavUserUI();
                showToast('Logged in successfully!', '🎉');
                if (!STATE.address) {
                    STATE.pendingFlow = STATE.pendingFlow || 'cart';
                    setTimeout(() => openLocationModal(), 400);
                } else {
                    runPendingFlow();
                }
            } else {
                showToast('Incorrect OTP. Try ' + OTP_DEMO, '❌');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Verify & Proceed →';
        }
    }

    document.getElementById('back-to-phone-btn')?.addEventListener('click', () => {
        document.getElementById('otp-step')?.classList.remove('visible');
        document.getElementById('phone-step')?.classList.remove('hidden');
        clearInterval(otpResendTimer);
    });

    document.getElementById('close-login-btn')?.addEventListener('click', () => closeOverlay('login-overlay'));

    /* ============================================
       LOCATION MODAL
    ============================================ */
    function openLocationModal() {
        if (STATE.address) {
            prefillLocation();
        }
        openOverlay('location-overlay');
        document.getElementById('loc-street')?.focus();
    }

    function prefillLocation() {
        if (!STATE.address) return;
        document.getElementById('loc-street').value = STATE.address.street || '';
        document.getElementById('loc-area').value = STATE.address.area || '';
        document.getElementById('loc-pincode').value = STATE.address.pincode || '';
        document.getElementById('loc-landmark').value = STATE.address.landmark || '';
        document.querySelectorAll('.addr-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === STATE.address.type);
        });
    }

    document.getElementById('close-location-btn')?.addEventListener('click', () => closeOverlay('location-overlay'));

    document.querySelectorAll('.addr-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.addr-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    document.getElementById('use-gps-btn')?.addEventListener('click', () => {
        const btn = document.getElementById('use-gps-btn');
        btn.textContent = '📡 Detecting…';
        btn.disabled = true;
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                () => {
                    document.getElementById('loc-street').value = '123 Main Food Street';
                    document.getElementById('loc-area').value = 'Commercial Hub';
                    document.getElementById('loc-pincode').value = '625001';
                    document.getElementById('loc-landmark').value = 'Near Central Station';
                    showToast('Location detected!', '📍');
                    btn.textContent = '📍 Use My Current Location';
                    btn.disabled = false;
                },
                () => {
                    showToast('Could not detect location', '⚠️');
                    btn.textContent = '📍 Use My Current Location';
                    btn.disabled = false;
                }
            );
        } else {
            setTimeout(() => {
                document.getElementById('loc-street').value = '123 Main Food Street';
                document.getElementById('loc-area').value = 'Commercial Hub';
                document.getElementById('loc-pincode').value = '625001';
                btn.textContent = '📍 Use My Current Location';
                btn.disabled = false;
                showToast('Location auto-filled (demo)', '📍');
            }, 1200);
        }
    });

    document.getElementById('save-location-btn')?.addEventListener('click', () => {
        const street = document.getElementById('loc-street').value.trim();
        const area = document.getElementById('loc-area').value.trim();
        const pincode = document.getElementById('loc-pincode').value.trim();
        if (!street || !area || !pincode) {
            showToast('Please fill in required address fields', '⚠️');
            return;
        }
        const type = document.querySelector('.addr-tab.active')?.dataset.type || 'home';
        STATE.address = {
            type, street, area, pincode,
            landmark: document.getElementById('loc-landmark').value.trim(),
        };
        saveState();
        closeOverlay('location-overlay');
        updateCartAddressDisplay();
        showToast('Delivery address saved!', '📍');
        if (STATE.pendingFlow) runPendingFlow();
        else openCart();
    });

    /* ============================================
       CART & SERVER-SIDE CALCULATION
    ============================================ */
    function openCart() {
        renderCart();
        document.getElementById('cart-drawer')?.classList.add('open');
        document.getElementById('cart-overlay')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        document.getElementById('cart-drawer')?.classList.remove('open');
        document.getElementById('cart-overlay')?.classList.remove('open');
        document.body.style.overflow = '';
    }

    document.getElementById('close-cart-btn')?.addEventListener('click', closeCart);
    document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
    document.getElementById('nav-cart-btn')?.addEventListener('click', openCart);

    function updateCartAddressDisplay() {
        const el = document.getElementById('cart-address-display');
        if (!el) return;
        if (STATE.address) {
            el.textContent = `${STATE.address.street}, ${STATE.address.area} - ${STATE.address.pincode}`;
        } else {
            el.textContent = 'Add delivery address';
        }
    }

    document.getElementById('cart-change-addr-btn')?.addEventListener('click', () => {
        closeCart();
        setTimeout(() => openLocationModal(), 300);
    });

    function addToCart(id, name, price, emoji) {
        const existing = STATE.cart.find(i => i.id === id);
        if (existing) {
            existing.qty++;
        } else {
            STATE.cart.push({ id, name, price, emoji, qty: 1 });
        }
        saveState();
        updateCartCountUI();
        animateCartBtn();
        showToast(`${name} added to cart!`, emoji || '🛒');
    }

    function removeFromCart(id) {
        STATE.cart = STATE.cart.filter(i => i.id !== id);
        if (STATE.cart.length === 0) STATE.coupon = null;
        saveState();
        updateCartCountUI();
        renderCart();
    }

    function changeQty(id, delta) {
        const item = STATE.cart.find(i => i.id === id);
        if (!item) return;
        item.qty = Math.max(0, item.qty + delta);
        if (item.qty === 0) { removeFromCart(id); return; }
        saveState();
        updateCartCountUI();
        renderCart();
    }

    async function renderCart() {
        const listEl = document.getElementById('cart-items-list');
        const billEl = document.getElementById('cart-bill-section');
        const couponEl = document.getElementById('cart-coupon-section');
        const footerEl = document.getElementById('cart-footer');
        const countPill = document.getElementById('cart-count-pill');

        const totalItems = STATE.cart.reduce((s, i) => s + i.qty, 0);
        if (countPill) countPill.textContent = totalItems;

        updateCartAddressDisplay();
        if (!listEl) return;

        if (STATE.cart.length === 0) {
            listEl.innerHTML = `
                <div class="cart-empty-state" id="cart-empty-state" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;color:var(--text-muted);">
                    <div class="empty-icon" style="font-size:4rem;">🛒</div>
                    <h4 style="font-size:1.1rem;font-weight:700;color:var(--text-dark);">Your cart is empty</h4>
                    <p style="font-size:0.85rem;text-align:center;">Add delicious items from our menu to get started!</p>
                    <button class="btn-browse" id="browse-menu-btn" onclick="window.CDOrder.closeCart(); document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });">Browse Menu</button>
                </div>
            `;
            if (billEl) billEl.style.display = 'none';
            if (couponEl) couponEl.style.display = 'none';
            if (footerEl) footerEl.style.display = 'none';
            return;
        }

        if (billEl) billEl.style.display = 'block';
        if (couponEl) couponEl.style.display = 'block';
        if (footerEl) footerEl.style.display = 'block';

        listEl.innerHTML = STATE.cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-emoji">${item.emoji || '🍽️'}</div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatINR(item.price * item.qty)}</div>
                </div>
                <div class="cart-item-actions">
                    <div class="qty-control">
                        <button class="qty-btn" onclick="window.CDOrder.changeQty('${item.id}', -1)">−</button>
                        <span class="qty-num">${item.qty}</span>
                        <button class="qty-btn" onclick="window.CDOrder.changeQty('${item.id}', 1)">+</button>
                    </div>
                    <button class="cart-item-remove" onclick="window.CDOrder.removeFromCart('${item.id}')">✕ Remove</button>
                </div>
            </div>
        `).join('');

        // Server-Side Cart Calculation API
        try {
            const res = await fetch(`${API_BASE}/api/cart/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart: STATE.cart, coupon: STATE.coupon })
            });
            const data = await res.json();
            if (data.success && data.totals) {
                const { subtotal, discount, deliveryFee, grandTotal } = data.totals;
                document.getElementById('bill-subtotal').textContent = formatINR(subtotal);
                document.getElementById('bill-delivery').textContent = formatINR(deliveryFee);
                document.getElementById('bill-discount-row').style.display = discount > 0 ? 'flex' : 'none';
                document.getElementById('bill-discount').textContent = '−' + formatINR(discount);
                document.getElementById('bill-total').textContent = formatINR(grandTotal);
                document.getElementById('checkout-total-display').textContent = formatINR(grandTotal);
            }
        } catch (err) {
            // Local fallback calculation if offline
            const subtotal = STATE.cart.reduce((s, i) => s + i.price * i.qty, 0);
            const deliveryFee = 20;
            const total = subtotal + deliveryFee;
            document.getElementById('bill-subtotal').textContent = formatINR(subtotal);
            document.getElementById('bill-delivery').textContent = formatINR(deliveryFee);
            document.getElementById('bill-total').textContent = formatINR(total);
            document.getElementById('checkout-total-display').textContent = formatINR(total);
        }

        const couponInput = document.getElementById('coupon-input');
        if (STATE.coupon && couponInput) {
            couponInput.value = STATE.coupon;
            showCouponResult(true, '✅ Coupon ' + STATE.coupon + ' applied!');
        }
    }

    function applyCoupon(code) {
        STATE.coupon = code.toUpperCase();
        saveState();
        renderCart();
        showCouponResult(true, '✅ Coupon ' + STATE.coupon + ' applied');
        return true;
    }

    function showCouponResult(success, msg) {
        const el = document.getElementById('coupon-result');
        if (!el) return;
        el.textContent = msg;
        el.className = 'coupon-result ' + (success ? 'success' : 'error');
    }

    document.getElementById('apply-coupon-btn')?.addEventListener('click', () => {
        const code = document.getElementById('coupon-input')?.value.trim();
        if (!code) { showCouponResult(false, 'Enter a coupon code'); return; }
        applyCoupon(code);
        showToast('Coupon applied!', '🏷️');
    });

    document.getElementById('btn-checkout')?.addEventListener('click', () => {
        if (STATE.cart.length === 0) { showToast('Your cart is empty', '🛒'); return; }
        if (!STATE.user) {
            closeCart();
            setTimeout(() => openLogin('checkout'), 300);
            return;
        }
        if (!STATE.address) {
            closeCart();
            setTimeout(() => openLocationModal(), 300);
            return;
        }
        closeCart();
        setTimeout(() => openPaymentModal(), 350);
    });

    document.addEventListener('click', e => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (!btn) return;
        e.preventDefault();
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const price = parseInt(btn.dataset.price);
        const emoji = btn.dataset.emoji;
        addToCart(id, name, price, emoji);
        btn.classList.add('added');
        btn.textContent = '✓ Added';
        setTimeout(() => { btn.classList.remove('added'); btn.textContent = '+ Add'; }, 2000);
    });

    document.getElementById('browse-menu-btn')?.addEventListener('click', () => {
        closeCart();
        document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
    });

    /* ============================================
       FLOATING CART BUTTON
    ============================================ */
    function updateCartCountUI() {
        const totalQty = STATE.cart.reduce((s, i) => s + i.qty, 0);
        document.querySelectorAll('.cart-count-badge, .nav-cart-count').forEach(el => {
            el.textContent = totalQty;
        });
        const floatBtn = document.getElementById('floating-cart-btn');
        if (floatBtn) {
            if (totalQty > 0) floatBtn.classList.add('visible');
            else floatBtn.classList.remove('visible');
        }
    }

    function animateCartBtn() {
        const btn = document.getElementById('floating-cart-btn');
        if (!btn) return;
        btn.classList.remove('cart-bump');
        void btn.offsetWidth;
        btn.classList.add('cart-bump');
    }

    document.getElementById('floating-cart-btn')?.addEventListener('click', openCart);

    /* ============================================
       PAYMENT MODAL & CASH ON DELIVERY API DISPATCH
    ============================================ */
    async function openPaymentModal() {
        try {
            const res = await fetch(`${API_BASE}/api/cart/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart: STATE.cart, coupon: STATE.coupon })
            });
            const data = await res.json();
            if (data.success && data.totals) {
                const { subtotal, discount, deliveryFee, grandTotal } = data.totals;
                document.getElementById('pay-subtotal').textContent = formatINR(subtotal);
                document.getElementById('pay-delivery').textContent = formatINR(deliveryFee);
                document.getElementById('pay-discount-row').style.display = discount > 0 ? 'flex' : 'none';
                document.getElementById('pay-discount').textContent = '−' + formatINR(discount);
                document.getElementById('pay-total').textContent = formatINR(grandTotal);
            }
        } catch (err) {
            const subtotal = STATE.cart.reduce((s, i) => s + i.price * i.qty, 0);
            document.getElementById('pay-subtotal').textContent = formatINR(subtotal);
            document.getElementById('pay-delivery').textContent = '₹20';
            document.getElementById('pay-total').textContent = formatINR(subtotal + 20);
        }
        openOverlay('payment-overlay');
    }

    document.getElementById('close-payment-btn')?.addEventListener('click', () => closeOverlay('payment-overlay'));

    let lastPlacedOrder = null;

    document.getElementById('place-order-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('place-order-btn');
        btn.disabled = true;
        btn.textContent = 'Placing Cash on Delivery Order via Server…';

        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: STATE.cart,
                    coupon: STATE.coupon,
                    user: STATE.user,
                    address: STATE.address
                })
            });
            const data = await res.json();

            if (data.success && data.order) {
                lastPlacedOrder = data.order;
                closeOverlay('payment-overlay');
                showConfirmation(data.order);

                // Launch WhatsApp Order Link if returned by server
                if (data.order.whatsappUrl) {
                    window.open(data.order.whatsappUrl, '_blank');
                }

                // Clear cart state
                STATE.cart = [];
                STATE.coupon = null;
                saveState();
                updateCartCountUI();
                showToast('Order saved to backend database!', '📦');
            } else {
                showToast(data.message || 'Order placement failed', '❌');
            }
        } catch (err) {
            // Local fallback order placement if backend is offline
            const orderId = 'CD' + Date.now().toString(36).toUpperCase().slice(-6);
            const orderData = {
                orderId,
                items: [...STATE.cart],
                totals: { subtotal: STATE.cart.reduce((s,i)=>s+i.price*i.qty,0), discount:0, deliveryFee:20, total: STATE.cart.reduce((s,i)=>s+i.price*i.qty,0)+20 },
                user: { ...STATE.user },
                address: { ...STATE.address },
                timestamp: new Date().toLocaleString('en-IN')
            };
            closeOverlay('payment-overlay');
            showConfirmation(orderData);
            STATE.cart = [];
            STATE.coupon = null;
            saveState();
            updateCartCountUI();
        } finally {
            btn.disabled = false;
            btn.textContent = '🛵 Confirm Order (Cash on Delivery)';
        }
    });

    /* ============================================
       ORDER CONFIRMATION & INVOICE POPULATION
    ============================================ */
    const TRACKING_STEPS_DATA = [
        { icon: '✅', title: 'Order Confirmed', desc: 'We received your order on backend server', delay: 0 },
        { icon: '👨‍🍳', title: 'Preparing Your Food', desc: 'Our chefs are cooking your meal', delay: 8000 },
        { icon: '🛵', title: 'Out for Delivery', desc: 'Your order is on the way!', delay: 20000 },
        { icon: '🏠', title: 'Delivered', desc: 'Enjoy your meal! Rate us on Google ⭐', delay: 38000 },
    ];

    function populateInvoiceCard(orderData) {
        const addr = orderData.address;
        const totals = orderData.totals;

        document.getElementById('inv-order-id').textContent = orderData.orderId;
        document.getElementById('inv-date-time').textContent = orderData.timestamp;
        document.getElementById('inv-customer-phone').textContent = '+91 ' + (orderData.user.phone || '');
        document.getElementById('inv-delivery-address').textContent = `${addr.street}, ${addr.area} - ${addr.pincode}${addr.landmark ? ' (Landmark: ' + addr.landmark + ')' : ''} [${(addr.type || 'home').toUpperCase()}]`;

        const tbody = document.getElementById('inv-items-tbody');
        tbody.innerHTML = orderData.items.map(item => `
            <tr>
                <td style="font-weight:600;color:var(--text-dark);">${item.name}</td>
                <td style="text-align:center;font-weight:700;">${item.qty}</td>
                <td style="text-align:right;">${formatINR(item.price)}</td>
                <td style="text-align:right;font-weight:800;color:var(--orange-700);">${formatINR(item.lineTotal || item.price * item.qty)}</td>
            </tr>
        `).join('');

        document.getElementById('inv-subtotal').textContent = formatINR(totals.subtotal);
        document.getElementById('inv-discount-row').style.display = totals.discount > 0 ? 'flex' : 'none';
        document.getElementById('inv-discount').textContent = '−' + formatINR(totals.discount);
        document.getElementById('inv-delivery').textContent = formatINR(totals.deliveryFee);
        document.getElementById('inv-grand-total').textContent = formatINR(totals.grandTotal || totals.total);
    }

    function showConfirmation(orderData) {
        const overlay = document.getElementById('confirmation-overlay');
        const agent = orderData.assignedAgent || DELIVERY_AGENTS[Math.floor(Math.random() * DELIVERY_AGENTS.length)];
        document.getElementById('confirm-agent-name').textContent = agent;

        populateInvoiceCard(orderData);

        const waBtn = document.getElementById('btn-whatsapp-resend');
        if (waBtn && orderData.whatsappUrl) {
            waBtn.onclick = () => window.open(orderData.whatsappUrl, '_blank');
        }

        overlay.classList.add('open');
        document.body.classList.add('order-confirmed-active');

        const stepsEl = document.getElementById('tracking-steps-list');
        stepsEl.innerHTML = '';
        TRACKING_STEPS_DATA.forEach((step, idx) => {
            const el = document.createElement('div');
            el.className = 'tracking-step' + (idx === 0 ? ' active' : ' pending');
            el.id = 'track-step-' + idx;
            el.innerHTML = `
                <div class="step-icon">${step.icon}</div>
                <div class="step-text">
                    <h5>${step.title}</h5>
                    <p>${step.desc}</p>
                    ${idx === 0 ? '<span class="step-time">Just now</span>' : ''}
                </div>
            `;
            stepsEl.appendChild(el);
        });

        TRACKING_STEPS_DATA.forEach((step, idx) => {
            if (idx === 0) return;
            setTimeout(() => {
                const prev = document.getElementById('track-step-' + (idx - 1));
                const cur = document.getElementById('track-step-' + idx);
                if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
                if (cur) {
                    cur.classList.remove('pending');
                    cur.classList.add(idx === TRACKING_STEPS_DATA.length - 1 ? 'done' : 'active');
                    cur.querySelector('.step-text').insertAdjacentHTML('beforeend', `<span class="step-time">Just updated</span>`);
                }
            }, step.delay);
        });
    }

    document.getElementById('close-confirmation-btn')?.addEventListener('click', () => {
        document.getElementById('confirmation-overlay').classList.remove('open');
        document.body.classList.remove('order-confirmed-active');
        document.body.style.overflow = '';
        showToast('Thank you for ordering with Chicken Dinner! 🙏', '🍗');
    });

    document.getElementById('order-again-btn')?.addEventListener('click', () => {
        document.getElementById('confirmation-overlay').classList.remove('open');
        document.body.classList.remove('order-confirmed-active');
        document.body.style.overflow = '';
        document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
    });

    /* ============================================
       NAV UI UPDATE
    ============================================ */
    function updateNavUserUI() {
        const loginBtn = document.getElementById('nav-login-btn');
        const userPill = document.getElementById('nav-user-pill');
        const phoneDisplay = document.getElementById('nav-user-phone');
        if (STATE.user) {
            loginBtn && (loginBtn.style.display = 'none');
            userPill && (userPill.style.display = 'flex');
            if (phoneDisplay) phoneDisplay.textContent = '+91 ' + STATE.user.phone;
        } else {
            loginBtn && (loginBtn.style.display = '');
            userPill && (userPill.style.display = 'none');
        }
    }

    document.getElementById('nav-login-btn')?.addEventListener('click', () => openLogin(null));
    document.getElementById('nav-user-pill')?.addEventListener('click', () => {
        if (confirm('Log out from Chicken Dinner?')) {
            STATE.user = null;
            STATE.address = null;
            STATE.cart = [];
            STATE.coupon = null;
            localStorage.removeItem('cd_user');
            localStorage.removeItem('cd_address');
            localStorage.removeItem('cd_cart');
            localStorage.removeItem('cd_coupon');
            updateNavUserUI();
            updateCartCountUI();
            showToast('Logged out successfully', '👋');
        }
    });

    /* ============================================
       EXPOSE TO GLOBAL
    ============================================ */
    window.CDOrder = {
        addToCart,
        removeFromCart,
        changeQty,
        openLogin,
        openCart,
        closeCart
    };

    /* ============================================
       AUTO-INJECT ADD TO CART BUTTONS
    ============================================ */
    function injectCartButtons() {
        const CATEGORY_EMOJI_MAP = {
            'burger': '🍔', 'fried': '🍗', 'chicken': '🍗', 'shawarma': '🌯',
            'pizza': '🍕', 'rice': '🍚', 'pasta': '🍝', 'snack': '🍟',
            'fries': '🍟', 'drink': '🥤', 'mojito': '🍹', 'juice': '🥤',
            'bucket': '🪣', 'combo': '🍱', 'grilled': '🔥', 'desert': '🍮',
            'dessert': '🍮', 'ice': '🍦', 'soup': '🍲', 'roll': '🌯',
        };

        document.querySelectorAll('.menu-item').forEach((item, idx) => {
            if (item.querySelector('.add-to-cart-btn')) return;

            const nameEl = item.querySelector('.menu-item-name');
            const priceEl = item.querySelector('.menu-item-price');
            if (!nameEl || !priceEl) return;

            const name = nameEl.textContent.replace(/[🔥⭐🌶️🍃]/g, '').trim();
            const priceText = priceEl.textContent.replace(/[^\d]/g, '');
            const price = parseInt(priceText) || 100;

            const nameLower = name.toLowerCase();
            let emoji = '🍽️';
            for (const [key, val] of Object.entries(CATEGORY_EMOJI_MAP)) {
                if (nameLower.includes(key)) { emoji = val; break; }
            }
            const catEl = item.closest('.menu-category');
            if (catEl) {
                const catFloat = catEl.querySelector('.menu-cat-float');
                if (catFloat) emoji = catFloat.textContent.trim() || emoji;
            }

            const id = 'item_' + idx + '_' + name.replace(/\s+/g,'_').toLowerCase().slice(0,20);

            const btn = document.createElement('button');
            btn.className = 'add-to-cart-btn';
            btn.dataset.id = id;
            btn.dataset.name = name;
            btn.dataset.price = price;
            btn.dataset.emoji = emoji;
            btn.textContent = '+ Add';

            const right = item.querySelector('.menu-item-right');
            if (right) {
                right.style.flexWrap = 'wrap';
                right.style.gap = '6px';
                right.appendChild(btn);
            }
        });
    }

    /* ============================================
       INIT
    ============================================ */
    updateNavUserUI();
    updateCartCountUI();
    renderCart();
    initOfferSlider();
    initCouponCards();
    injectCartButtons();

})();


    /* ============================================
       WHATSAPP AUTOMATIC MESSAGE DISPATCH
    ============================================ */
    function buildWhatsAppMessage(orderData) {
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

        return encodeURIComponent(message);
    }

    function sendWhatsAppOrder(orderData) {
        const text = buildWhatsAppMessage(orderData);
        const url = `https://api.whatsapp.com/send?phone=${SHOP_WHATSAPP_NUMBER}&text=${text}`;
        window.open(url, '_blank');
        showToast('WhatsApp order message launched!', '📱');
    }

    /* ============================================
       SMTP CLIENT-SIDE EMAIL DISPATCHING
    ============================================ */
    function buildEmailHTMLInvoice(orderData) {
        const addr = orderData.address;
        const addrStr = `${addr.street}, ${addr.area} - ${addr.pincode}${addr.landmark ? ' (Near ' + addr.landmark + ')' : ''} [${(addr.type || 'home').toUpperCase()}]`;

        const itemsRows = orderData.items.map(i => `
            <tr>
                <td style="padding:8px;border-bottom:1px solid #eee;">${i.name}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${i.price}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">₹${i.price * i.qty}</td>
            </tr>
        `).join('');

        return `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:2px solid #f7931e;border-radius:16px;padding:24px;background:#fff;">
                <h2 style="color:#e87a0c;margin-top:0;">🍗 CHICKEN DINNER MADURAI — NEW ORDER</h2>
                <p style="color:#666;"><strong>Order ID:</strong> ${orderData.orderId} | <strong>Date:</strong> ${orderData.timestamp}</p>
                <div style="background:#fff8f0;padding:12px;border-radius:8px;margin-bottom:16px;">
                    <p style="margin:4px 0;"><strong>Customer Mobile:</strong> +91 ${orderData.user.phone}</p>
                    <p style="margin:4px 0;"><strong>Delivery Address:</strong> ${addrStr}</p>
                    <p style="margin:4px 0;"><strong>Payment Method:</strong> Cash on Delivery (COD)</p>
                </div>
                <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                    <thead>
                        <tr style="background:#ffe0c0;">
                            <th style="padding:8px;text-align:left;">Item</th>
                            <th style="padding:8px;text-align:center;">Qty</th>
                            <th style="padding:8px;text-align:right;">Rate</th>
                            <th style="padding:8px;text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsRows}</tbody>
                </table>
                <div style="background:#fdf2e9;padding:12px;border-radius:8px;text-align:right;">
                    <p style="margin:4px 0;">Subtotal: ₹${orderData.totals.subtotal}</p>
                    ${orderData.totals.discount > 0 ? `<p style="margin:4px 0;color:#15803d;">Discount: −₹${orderData.totals.discount}</p>` : ''}
                    <p style="margin:4px 0;">Delivery Fee (Static): ₹${orderData.totals.deliveryFee}</p>
                    <h3 style="margin:8px 0 0 0;color:#111;">Grand Total: ₹${orderData.totals.total} (Cash on Delivery)</h3>
                </div>
            </div>
        `;
    }

    function sendEmailInvoice(orderData) {
        // Mailto fallback link setup for 1-click email send
        const subject = encodeURIComponent(`New Order #${orderData.orderId} - Chicken Dinner`);
        const bodyText = encodeURIComponent(`Order ID: ${orderData.orderId}\nCustomer Mobile: +91 ${orderData.user.phone}\nTotal: ₹${orderData.totals.total} (Cash on Delivery)\nAddress: ${orderData.address.street}, ${orderData.address.area}\nItems: ${orderData.items.map(i => i.qty + 'x ' + i.name).join(', ')}`);
        const mailtoUrl = `mailto:${SHOP_OWNER_EMAIL}?subject=${subject}&body=${bodyText}`;

        const emailBtn = document.getElementById('btn-email-resend');
        if (emailBtn) {
            emailBtn.onclick = () => window.open(mailtoUrl, '_blank');
        }

        // Attempt SmtpJS dispatch if window.Email is loaded
        if (window.Email && typeof window.Email.send === 'function') {
            try {
                window.Email.send({
                    SecureToken: "DEMO_SMTP_TOKEN", // Configure SmtpJS token if desired
                    To: SHOP_OWNER_EMAIL,
                    From: "orders@chickendinner.com",
                    Subject: `New Cash Order #${orderData.orderId} from +91 ${orderData.user.phone}`,
                    Body: buildEmailHTMLInvoice(orderData)
                }).then(() => {
                    const badge = document.getElementById('status-email-badge');
                    if (badge) badge.textContent = '📧 Email Invoice Sent ✓';
                }).catch(() => {});
            } catch (err) {}
        }
    }

    /* ============================================
       ORDER CONFIRMATION & INVOICE POPULATION
    ============================================ */
    const TRACKING_STEPS_DATA = [
        { icon: '✅', title: 'Order Confirmed', desc: 'We received your order', delay: 0 },
        { icon: '👨‍🍳', title: 'Preparing Your Food', desc: 'Our chefs are cooking your meal', delay: 8000 },
        { icon: '🛵', title: 'Out for Delivery', desc: 'Your order is on the way!', delay: 20000 },
        { icon: '🏠', title: 'Delivered', desc: 'Enjoy your meal! Rate us on Google ⭐', delay: 38000 },
    ];

    function populateInvoiceCard(orderData) {
        const addr = orderData.address;
        document.getElementById('inv-order-id').textContent = orderData.orderId;
        document.getElementById('inv-date-time').textContent = orderData.timestamp;
        document.getElementById('inv-customer-phone').textContent = '+91 ' + orderData.user.phone;
        document.getElementById('inv-delivery-address').textContent = `${addr.street}, ${addr.area} - ${addr.pincode}${addr.landmark ? ' (Landmark: ' + addr.landmark + ')' : ''} [${(addr.type || 'home').toUpperCase()}]`;

        const tbody = document.getElementById('inv-items-tbody');
        tbody.innerHTML = orderData.items.map(item => `
            <tr>
                <td style="font-weight:600;color:var(--text-dark);">${item.name}</td>
                <td style="text-align:center;font-weight:700;">${item.qty}</td>
                <td style="text-align:right;">${formatINR(item.price)}</td>
                <td style="text-align:right;font-weight:800;color:var(--orange-700);">${formatINR(item.price * item.qty)}</td>
            </tr>
        `).join('');

        document.getElementById('inv-subtotal').textContent = formatINR(orderData.totals.subtotal);
        document.getElementById('inv-discount-row').style.display = orderData.totals.discount > 0 ? 'flex' : 'none';
        document.getElementById('inv-discount').textContent = '−' + formatINR(orderData.totals.discount);
        document.getElementById('inv-delivery').textContent = formatINR(orderData.totals.deliveryFee);
        document.getElementById('inv-grand-total').textContent = formatINR(orderData.totals.total);
    }

    function showConfirmation(orderData) {
        const overlay = document.getElementById('confirmation-overlay');
        const agent = DELIVERY_AGENTS[Math.floor(Math.random() * DELIVERY_AGENTS.length)];
        document.getElementById('confirm-agent-name').textContent = agent;

        // Populate Invoice Card
        populateInvoiceCard(orderData);

        // Bind WhatsApp Resend Button
        const waBtn = document.getElementById('btn-whatsapp-resend');
        if (waBtn) {
            waBtn.onclick = () => sendWhatsAppOrder(orderData);
        }

        overlay.classList.add('open');
        document.body.classList.add('order-confirmed-active');

        // Reset and animate tracking steps
        const stepsEl = document.getElementById('tracking-steps-list');
        stepsEl.innerHTML = '';
        TRACKING_STEPS_DATA.forEach((step, idx) => {
            const el = document.createElement('div');
            el.className = 'tracking-step' + (idx === 0 ? ' active' : ' pending');
            el.id = 'track-step-' + idx;
            el.innerHTML = `
                <div class="step-icon">${step.icon}</div>
                <div class="step-text">
                    <h5>${step.title}</h5>
                    <p>${step.desc}</p>
                    ${idx === 0 ? '<span class="step-time">Just now</span>' : ''}
                </div>
            `;
            stepsEl.appendChild(el);
        });

        // Progress steps with delays
        TRACKING_STEPS_DATA.forEach((step, idx) => {
            if (idx === 0) return;
            setTimeout(() => {
                const prev = document.getElementById('track-step-' + (idx - 1));
                const cur = document.getElementById('track-step-' + idx);
                if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
                if (cur) {
                    cur.classList.remove('pending');
                    cur.classList.add(idx === TRACKING_STEPS_DATA.length - 1 ? 'done' : 'active');
                    cur.querySelector('.step-text').insertAdjacentHTML('beforeend', `<span class="step-time">Just updated</span>`);
                }
            }, step.delay);
        });
    }

    document.getElementById('close-confirmation-btn')?.addEventListener('click', () => {
        document.getElementById('confirmation-overlay').classList.remove('open');
        document.body.classList.remove('order-confirmed-active');
        document.body.style.overflow = '';
        showToast('Thank you for ordering! 🙏', '🍗');
    });

    document.getElementById('order-again-btn')?.addEventListener('click', () => {
        document.getElementById('confirmation-overlay').classList.remove('open');
        document.body.classList.remove('order-confirmed-active');
        document.body.style.overflow = '';
        document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
    });

    /* ============================================
       HERO ORDER NOW BUTTON
    ============================================ */
    document.getElementById('hero-order-now-btn')?.addEventListener('click', () => {
        if (!STATE.user) { openLogin('location'); return; }
        if (!STATE.address) { openLocationModal(); return; }
        openCart();
    });

    /* ============================================
       NAV UI UPDATE
    ============================================ */
    function updateNavUserUI() {
        const loginBtn = document.getElementById('nav-login-btn');
        const userPill = document.getElementById('nav-user-pill');
        const phoneDisplay = document.getElementById('nav-user-phone');
        if (STATE.user) {
            loginBtn && (loginBtn.style.display = 'none');
            userPill && (userPill.style.display = 'flex');
            if (phoneDisplay) phoneDisplay.textContent = '+91 ' + STATE.user.phone;
        } else {
            loginBtn && (loginBtn.style.display = '');
            userPill && (userPill.style.display = 'none');
        }
    }

    document.getElementById('nav-login-btn')?.addEventListener('click', () => openLogin(null));
    document.getElementById('nav-user-pill')?.addEventListener('click', () => {
        if (confirm('Log out from Chicken Dinner?')) {
            STATE.user = null;
            STATE.address = null;
            STATE.cart = [];
            STATE.coupon = null;
            localStorage.removeItem('cd_user');
            localStorage.removeItem('cd_address');
            localStorage.removeItem('cd_cart');
            localStorage.removeItem('cd_coupon');
            updateNavUserUI();
            updateCartCountUI();
            showToast('Logged out successfully', '👋');
        }
    });

    /* ============================================
       EXPOSE TO GLOBAL (for inline onclick handlers)
    ============================================ */
    window.CDOrder = {
        addToCart,
        removeFromCart,
        changeQty,
        openLogin,
        openCart,
    };

    /* ============================================
       AUTO-INJECT ADD TO CART BUTTONS
    ============================================ */
    function injectCartButtons() {
        // Map category icons by inspecting menu-cat-float or cat-card-avatar near each menu-category
        const CATEGORY_EMOJI_MAP = {
            'burger': '🍔', 'fried': '🍗', 'chicken': '🍗', 'shawarma': '🌯',
            'pizza': '🍕', 'rice': '🍚', 'pasta': '🍝', 'snack': '🍟',
            'fries': '🍟', 'drink': '🥤', 'mojito': '🍹', 'juice': '🥤',
            'bucket': '🪣', 'combo': '🍱', 'grilled': '🔥', 'desert': '🍮',
            'dessert': '🍮', 'ice': '🍦', 'soup': '🍲', 'roll': '🌯',
        };

        document.querySelectorAll('.menu-item').forEach((item, idx) => {
            // Skip if already has a cart btn
            if (item.querySelector('.add-to-cart-btn')) return;

            const nameEl = item.querySelector('.menu-item-name');
            const priceEl = item.querySelector('.menu-item-price');
            if (!nameEl || !priceEl) return;

            const name = nameEl.textContent.replace(/[🔥⭐🌶️🍃]/g, '').trim();
            const priceText = priceEl.textContent.replace(/[^\d]/g, '');
            const price = parseInt(priceText) || 100;

            // Determine emoji
            const nameLower = name.toLowerCase();
            let emoji = '🍽️';
            for (const [key, val] of Object.entries(CATEGORY_EMOJI_MAP)) {
                if (nameLower.includes(key)) { emoji = val; break; }
            }
            // Also check parent category icon
            const catEl = item.closest('.menu-category');
            if (catEl) {
                const catFloat = catEl.querySelector('.menu-cat-float');
                if (catFloat) emoji = catFloat.textContent.trim() || emoji;
            }

            const id = 'item_' + idx + '_' + name.replace(/\s+/g,'_').toLowerCase().slice(0,20);

            const btn = document.createElement('button');
            btn.className = 'add-to-cart-btn';
            btn.dataset.id = id;
            btn.dataset.name = name;
            btn.dataset.price = price;
            btn.dataset.emoji = emoji;
            btn.textContent = '+ Add';

            // Insert into .menu-item-right
            const right = item.querySelector('.menu-item-right');
            if (right) {
                right.style.flexWrap = 'wrap';
                right.style.gap = '6px';
                right.appendChild(btn);
            }
        });
    }

    /* ============================================
       INIT
    ============================================ */
    updateNavUserUI();
    updateCartCountUI();
    renderCart();
    initOfferSlider();
    initCouponCards();
    injectCartButtons();

    // Also fix the "Location Chicken" text remnant in h3
    document.querySelectorAll('.menu-cat-header h3').forEach(h => {
        if (h.textContent.includes('Location Chicken')) {
            h.textContent = h.textContent.replace('Location Chicken', 'Chicken Dinner');
        }
    });
    // Fix any leftover "Location Chicken" in menu-item-name
    document.querySelectorAll('.menu-item-name').forEach(el => {
        if (el.innerHTML.includes('Location Chicken')) {
            el.innerHTML = el.innerHTML.replace(/Location Chicken/g, 'Chicken Dinner');
        }
    });

})();

