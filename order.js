/* ================================================
   ORDER SYSTEM JS — Chicken Dinner
   Cart, OTP Login, Location, Offers, Confirmation
================================================ */

(function () {
    'use strict';

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

    const COUPONS = {
        'WELCOME20': { type: 'percent', value: 20, desc: '20% off your first order', minOrder: 100 },
        'FIRST50':   { type: 'flat',    value: 50, desc: '₹50 off on orders above ₹250', minOrder: 250 },
        'FREESHIP':  { type: 'delivery',value: 0,  desc: 'Free Delivery on this order', minOrder: 0 },
        'DINNER15':  { type: 'percent', value: 15, desc: '15% off on all items', minOrder: 150 },
    };

    const DELIVERY_FEE = 40;
    const FREE_DELIVERY_THRESHOLD = 400;

    const DELIVERY_AGENTS = ['Ramesh K.', 'Suresh P.', 'Arjun M.', 'Karthik V.', 'Dinesh R.'];
    const OTP_DEMO = '123456';

    /* ============================================
       MENU ITEMS DATA (for cart emoji/name lookup)
    ============================================ */
    const MENU_DATA = {};

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
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fadeout');
            setTimeout(() => toast.remove(), 350);
        }, 2800);
    }

    function generateOrderId() {
        return 'CD' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).slice(2,5).toUpperCase();
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
    function closeAllOverlays() {
        document.querySelectorAll('.order-overlay').forEach(o => o.classList.remove('open'));
        document.body.style.overflow = '';
    }

    /* Close on backdrop click */
    document.querySelectorAll('.order-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeOverlay(overlay.id);
        });
    });

    /* ============================================
       LOGIN / OTP FLOW
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
        document.getElementById('phone-step').classList.remove('hidden');
        document.getElementById('otp-step').classList.remove('visible');
        document.getElementById('phone-input').value = '';
        document.querySelectorAll('.otp-box').forEach(b => b.value = '');
    }

    function runPendingFlow() {
        if (STATE.pendingFlow === 'location') {
            openLocationModal();
        } else if (STATE.pendingFlow === 'cart') {
            openCart();
        } else if (STATE.pendingFlow === 'checkout') {
            openCart();
        }
        STATE.pendingFlow = null;
    }

    // Send OTP
    document.getElementById('send-otp-btn')?.addEventListener('click', () => {
        const phone = document.getElementById('phone-input').value.trim();
        if (!/^[6-9]\d{9}$/.test(phone)) {
            document.getElementById('phone-input').classList.add('invalid');
            showToast('Enter a valid 10-digit mobile number', '⚠️');
            return;
        }
        document.getElementById('phone-input').classList.remove('invalid');
        otpPhone = phone;
        sendOTP();
    });

    function sendOTP() {
        const btn = document.getElementById('send-otp-btn');
        btn.disabled = true;
        btn.textContent = 'Sending…';
        setTimeout(() => {
            btn.textContent = 'OTP Sent!';
            // Switch to OTP step
            document.getElementById('phone-step').classList.add('hidden');
            const otpStep = document.getElementById('otp-step');
            otpStep.classList.add('visible');
            document.getElementById('otp-phone-display').textContent = '+91 ' + otpPhone;
            // Auto-fill demo OTP hint
            document.getElementById('otp-demo-hint').textContent = `(Demo OTP: ${OTP_DEMO})`;
            startOtpTimer();
            document.querySelector('.otp-box')?.focus();
            btn.disabled = false;
            btn.textContent = 'Send OTP';
        }, 1400);
    }

    function startOtpTimer() {
        let seconds = 30;
        const timerEl = document.getElementById('otp-countdown');
        const resendBtn = document.getElementById('resend-otp-btn');
        timerEl.textContent = `Resend in ${seconds}s`;
        resendBtn.style.display = 'none';
        clearInterval(otpResendTimer);
        otpResendTimer = setInterval(() => {
            seconds--;
            timerEl.textContent = seconds > 0 ? `Resend in ${seconds}s` : '';
            if (seconds <= 0) {
                clearInterval(otpResendTimer);
                timerEl.textContent = '';
                resendBtn.style.display = 'inline';
            }
        }, 1000);
    }

    document.getElementById('resend-otp-btn')?.addEventListener('click', () => {
        document.querySelectorAll('.otp-box').forEach(b => b.value = '');
        sendOTP();
        showToast('OTP resent!', '📱');
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

    // Verify OTP
    document.getElementById('verify-otp-btn')?.addEventListener('click', verifyOTP);

    function verifyOTP() {
        const entered = Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
        if (entered.length < 6) { showToast('Enter complete 6-digit OTP', '⚠️'); return; }

        const btn = document.getElementById('verify-otp-btn');
        btn.disabled = true;
        btn.textContent = 'Verifying…';

        setTimeout(() => {
            if (entered === OTP_DEMO) {
                STATE.user = { phone: otpPhone, name: 'Guest User' };
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
                document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; b.classList.remove('filled'); });
                document.querySelector('.otp-box')?.focus();
            }
            btn.disabled = false;
            btn.textContent = 'Verify & Proceed';
        }, 1000);
    }

    document.getElementById('back-to-phone-btn')?.addEventListener('click', () => {
        document.getElementById('otp-step').classList.remove('visible');
        document.getElementById('phone-step').classList.remove('hidden');
        clearInterval(otpResendTimer);
    });

    // Login modal close
    document.getElementById('close-login-btn')?.addEventListener('click', () => closeOverlay('login-overlay'));

    /* ============================================
       LOCATION MODAL
    ============================================ */
    function openLocationModal() {
        if (STATE.address) {
            prefillLocation();
        }
        openOverlay('location-overlay');
        document.getElementById('loc-street').focus();
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
            // Fallback demo
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
       CART
    ============================================ */
    function openCart() {
        renderCart();
        document.getElementById('cart-drawer').classList.add('open');
        document.getElementById('cart-overlay').classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeCart() {
        document.getElementById('cart-drawer').classList.remove('open');
        document.getElementById('cart-overlay').classList.remove('open');
        document.body.style.overflow = '';
    }

    document.getElementById('close-cart-btn')?.addEventListener('click', closeCart);
    document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
    document.getElementById('nav-cart-btn')?.addEventListener('click', () => {
        if (!STATE.user) { openLogin('cart'); return; }
        if (!STATE.address) { openLocationModal(); STATE.pendingFlow = 'cart'; return; }
        openCart();
    });

    // Cart address display
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

    function getCartSubtotal() {
        return STATE.cart.reduce((s, i) => s + i.price * i.qty, 0);
    }

    function getCartTotals() {
        const subtotal = getCartSubtotal();
        let discount = 0;
        let deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        if (STATE.coupon) {
            const c = COUPONS[STATE.coupon];
            if (c) {
                if (c.type === 'percent') discount = Math.round(subtotal * c.value / 100);
                else if (c.type === 'flat') discount = Math.min(c.value, subtotal);
                else if (c.type === 'delivery') deliveryFee = 0;
            }
        }
        const total = subtotal - discount + deliveryFee;
        return { subtotal, discount, deliveryFee, total };
    }

    function renderCart() {
        const listEl = document.getElementById('cart-items-list');
        const emptyEl = document.getElementById('cart-empty-state');
        const billEl = document.getElementById('cart-bill-section');
        const couponEl = document.getElementById('cart-coupon-section');
        const footerEl = document.getElementById('cart-footer');
        const countPill = document.getElementById('cart-count-pill');

        const totalItems = STATE.cart.reduce((s, i) => s + i.qty, 0);
        if (countPill) countPill.textContent = totalItems;

        updateCartAddressDisplay();

        if (STATE.cart.length === 0) {
            listEl.innerHTML = '';
            emptyEl.style.display = 'flex';
            billEl.style.display = 'none';
            couponEl.style.display = 'none';
            footerEl.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        billEl.style.display = 'block';
        couponEl.style.display = 'block';
        footerEl.style.display = 'block';

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

        // Bill
        const { subtotal, discount, deliveryFee, total } = getCartTotals();
        document.getElementById('bill-subtotal').textContent = formatINR(subtotal);
        document.getElementById('bill-delivery').textContent = deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee);
        document.getElementById('bill-delivery').className = deliveryFee === 0 ? 'free-tag' : '';
        document.getElementById('bill-discount-row').style.display = discount > 0 ? 'flex' : 'none';
        document.getElementById('bill-discount').textContent = '−' + formatINR(discount);
        document.getElementById('bill-total').textContent = formatINR(total);
        document.getElementById('checkout-total-display').textContent = formatINR(total);

        // Coupon input current value
        if (STATE.coupon) {
            document.getElementById('coupon-input').value = STATE.coupon;
            showCouponResult(true, '✅ Coupon ' + STATE.coupon + ' applied!');
        }
    }

    function applyCoupon(code) {
        const c = COUPONS[code.toUpperCase()];
        if (!c) { showCouponResult(false, '❌ Invalid coupon code'); return false; }
        const subtotal = getCartSubtotal();
        if (subtotal < c.minOrder) { showCouponResult(false, `Minimum order ₹${c.minOrder} required`); return false; }
        STATE.coupon = code.toUpperCase();
        saveState();
        renderCart();
        showCouponResult(true, '✅ ' + c.desc);
        return true;
    }

    function showCouponResult(success, msg) {
        const el = document.getElementById('coupon-result');
        if (!el) return;
        el.textContent = msg;
        el.className = 'coupon-result ' + (success ? 'success' : 'error');
    }

    document.getElementById('apply-coupon-btn')?.addEventListener('click', () => {
        const code = document.getElementById('coupon-input').value.trim();
        if (!code) { showCouponResult(false, 'Enter a coupon code'); return; }
        const ok = applyCoupon(code);
        if (ok) showToast('Coupon applied!', '🏷️');
    });

    document.getElementById('btn-checkout')?.addEventListener('click', () => {
        if (STATE.cart.length === 0) { showToast('Your cart is empty', '🛒'); return; }
        if (!STATE.address) { showToast('Please add delivery address', '📍'); closeCart(); setTimeout(() => openLocationModal(), 300); return; }
        closeCart();
        setTimeout(() => openPaymentModal(), 350);
    });

    // Add to cart from menu
    document.addEventListener('click', e => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (!btn) return;
        e.preventDefault();
        if (!STATE.user) { openLogin('cart'); return; }
        if (!STATE.address) { openLocationModal(); STATE.pendingFlow = 'cart'; return; }
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const price = parseInt(btn.dataset.price);
        const emoji = btn.dataset.emoji;
        addToCart(id, name, price, emoji);
        btn.classList.add('added');
        btn.textContent = '✓ Added';
        setTimeout(() => { btn.classList.remove('added'); btn.textContent = '+ Add'; }, 2000);
    });

    /* Browse menu link from empty cart */
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

    document.getElementById('floating-cart-btn')?.addEventListener('click', () => {
        if (!STATE.user) { openLogin('cart'); return; }
        openCart();
    });

    /* ============================================
       PAYMENT MODAL
    ============================================ */
    function openPaymentModal() {
        const { subtotal, discount, deliveryFee, total } = getCartTotals();
        document.getElementById('pay-subtotal').textContent = formatINR(subtotal);
        document.getElementById('pay-delivery').textContent = deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee);
        document.getElementById('pay-discount-row').style.display = discount > 0 ? 'flex' : 'none';
        document.getElementById('pay-discount').textContent = '−' + formatINR(discount);
        document.getElementById('pay-total').textContent = formatINR(total);
        // Default select Cash on Delivery
        document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
        document.querySelector('.payment-option[data-method="cod"]')?.classList.add('selected');
        openOverlay('payment-overlay');
    }

    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });

    document.getElementById('close-payment-btn')?.addEventListener('click', () => closeOverlay('payment-overlay'));

    document.getElementById('place-order-btn')?.addEventListener('click', () => {
        const method = document.querySelector('.payment-option.selected')?.dataset.method || 'cod';
        const btn = document.getElementById('place-order-btn');
        btn.disabled = true;
        btn.textContent = method === 'cod' ? 'Placing Order…' : 'Processing Payment…';

        setTimeout(() => {
            closeOverlay('payment-overlay');
            const orderId = generateOrderId();
            showConfirmation(orderId);
            STATE.cart = [];
            STATE.coupon = null;
            saveState();
            updateCartCountUI();
            btn.disabled = false;
            btn.textContent = '🛵 Place Order';
        }, method === 'cod' ? 1200 : 2200);
    });

    /* ============================================
       ORDER CONFIRMATION & TRACKING
    ============================================ */
    const TRACKING_STEPS_DATA = [
        { icon: '✅', title: 'Order Confirmed', desc: 'We received your order', delay: 0 },
        { icon: '👨‍🍳', title: 'Preparing Your Food', desc: 'Our chefs are cooking your meal', delay: 8000 },
        { icon: '🛵', title: 'Out for Delivery', desc: 'Your order is on the way!', delay: 20000 },
        { icon: '🏠', title: 'Delivered', desc: 'Enjoy your meal! Rate us on Google ⭐', delay: 38000 },
    ];

    function showConfirmation(orderId) {
        const overlay = document.getElementById('confirmation-overlay');
        const agent = DELIVERY_AGENTS[Math.floor(Math.random() * DELIVERY_AGENTS.length)];
        document.getElementById('confirm-order-id').textContent = orderId;
        document.getElementById('confirm-agent-name').textContent = agent;
        const itemCount = STATE.cart.length; // already cleared — use a snapshot before

        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

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
        document.body.style.overflow = '';
        showToast('Thank you for ordering! 🙏', '🍗');
    });

    document.getElementById('order-again-btn')?.addEventListener('click', () => {
        document.getElementById('confirmation-overlay').classList.remove('open');
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

