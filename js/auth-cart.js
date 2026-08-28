// Feane - Auth + Cart + Checkout (client-side with localStorage)

const STORAGE_USERS = 'feane_users';
const STORAGE_SESSION = 'feane_session';
const STORAGE_CART = 'feane_cart';
const STORAGE_REDIRECT = 'feane_login_redirect';

// ---------- Helpers ----------
function getUsers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]'); }
  catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_SESSION) || 'null'); }
  catch { return null; }
}
function clearLoginSession() {
  sessionStorage.removeItem(STORAGE_SESSION);
  sessionStorage.removeItem(STORAGE_REDIRECT);
}
function setSession(user) {
  if (user) {
    sessionStorage.setItem(STORAGE_SESSION, JSON.stringify({ email: user.email, name: user.name }));
  } else {
    clearLoginSession();
  }
}
function getCart() {
  try { return JSON.parse(localStorage.getItem(STORAGE_CART) || '[]'); }
  catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
  updateCartBadge();
}
function isLoggedIn() {
  return !!getSession();
}
function requireLogin() {
  if (!isLoggedIn()) {
    sessionStorage.setItem(STORAGE_REDIRECT, window.location.href || 'index.html');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// ---------- Auth ----------
function signup(name, email, password) {
  email = (email || '').trim().toLowerCase();
  name = (name || '').trim();
  if (!name || !email || !password) return { ok: false, msg: 'All fields are required.' };
  if (password.length < 4) return { ok: false, msg: 'Password must be at least 4 characters.' };
  const users = getUsers();
  if (users.some(u => u.email === email)) return { ok: false, msg: 'Email already registered.' };
  users.push({ name, email, password }); // plain for demo only
  saveUsers(users);
  setSession({ name, email });
  return { ok: true, msg: 'Account created! You are now logged in.' };
}
function login(email, password) {
  email = (email || '').trim().toLowerCase();
  const users = getUsers();

  if (!email || !password) return { ok: false, msg: 'Email and password are required.' };

  if (users.length === 0) {
    const firstUser = { name: email.split('@')[0] || 'User', email, password };
    users.push(firstUser);
    saveUsers(users);
    setSession(firstUser);
    return { ok: true, msg: 'No account found. Your account was created automatically and you are now logged in.' };
  }

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return { ok: false, msg: 'Invalid email or password.' };
  setSession(user);
  return { ok: true, msg: 'Welcome back, ' + user.name + '!' };
}
function logout() {
  setSession(null);
  updateAuthUI();
  window.location.href = 'login.html';
}

// ---------- Cart ----------
function addToCart(item) {
  if (!requireLogin()) return;
  const cart = getCart();
  const existing = cart.find(c => c.id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  saveCart(cart);
  showToast(item.name + ' added to cart!');
}
function removeFromCart(id) {
  let cart = getCart().filter(c => c.id !== id);
  saveCart(cart);
  renderCartPage();
}
function updateQty(id, delta) {
  const cart = getCart();
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) {
    saveCart(cart.filter(c => c.id !== id));
  } else {
    saveCart(cart);
  }
  renderCartPage();
}
function getCartTotal() {
  return getCart().reduce((sum, i) => sum + (i.price * i.qty), 0);
}
function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

// ---------- UI: Badge & Auth ----------
function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('.cart-count-badge').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-block' : 'none';
  });
}
function updateAuthUI() {
  const session = getSession();
  document.querySelectorAll('.auth-guest').forEach(el => {
    el.style.display = session ? 'none' : '';
  });
  document.querySelectorAll('.auth-user').forEach(el => {
    el.style.display = session ? '' : 'none';
  });
  document.querySelectorAll('.user-name-display').forEach(el => {
    el.textContent = session ? session.name : '';
  });
  updateCartBadge();
}

// ---------- Modals ----------
function openAuthModal(tab) {
  window.location.href = tab === 'signup' ? 'register.html' : 'login.html';
}
function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-pane').forEach(p => p.classList.remove('active'));
  const tabBtn = document.querySelector('.auth-tab[data-tab="' + tab + '"]');
  const pane = document.getElementById(tab + 'Pane');
  if (tabBtn) tabBtn.classList.add('active');
  if (pane) pane.classList.add('active');
  const msg = document.getElementById('authMsg');
  if (msg) { msg.textContent = ''; msg.className = 'auth-msg'; }
}

// ---------- Cart Modal / Page ----------
function openCartModal() {
  if (!requireLogin()) return;
  const modal = document.getElementById('cartModal');
  if (!modal) {
    window.location.href = 'cart.html';
    return;
  }
  renderCartModal();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeCartModal() {
  const modal = document.getElementById('cartModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}
function renderCartModal() {
  const container = document.getElementById('cartItemsList');
  const totalEl = document.getElementById('cartTotalAmount');
  if (!container) return;
  const cart = getCart();
  if (cart.length === 0) {
    container.innerHTML = '<p class="text-center text-muted py-4">Your cart is empty.</p>';
    if (totalEl) totalEl.textContent = '₱0.00';
    return;
  }
  container.innerHTML = cart.map(item => `
    <div class="cart-item d-flex align-items-center mb-3 p-2 border rounded">
      <img src="${item.img}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
      <div class="flex-grow-1 ml-3">
        <strong>${item.name}</strong><br>
        <small>₱${item.price.toFixed(2)} each</small>
      </div>
      <div class="d-flex align-items-center">
        <button class="btn btn-sm btn-outline-secondary" onclick="updateQty('${item.id}', -1)">−</button>
        <span class="mx-2">${item.qty}</span>
        <button class="btn btn-sm btn-outline-secondary" onclick="updateQty('${item.id}', 1)">+</button>
        <button class="btn btn-sm btn-danger ml-2" onclick="removeFromCart('${item.id}')">&times;</button>
      </div>
      <div class="ml-3 font-weight-bold">₱${(item.price * item.qty).toFixed(2)}</div>
    </div>
  `).join('');
  if (totalEl) totalEl.textContent = '₱' + getCartTotal().toFixed(2);
}

// For dedicated cart page
function renderCartPage() {
  const container = document.getElementById('cartPageItems');
  const totalEl = document.getElementById('cartPageTotal');
  if (!container) {
    // if modal is open, refresh it
    if (document.getElementById('cartModal') && document.getElementById('cartModal').style.display === 'flex') {
      renderCartModal();
    }
    return;
  }
  const cart = getCart();
  if (cart.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="text-center py-5">Your cart is empty. <a href="menu.html">Browse menu</a></td></tr>';
    if (totalEl) totalEl.textContent = '₱0.00';
    return;
  }
  container.innerHTML = cart.map(item => `
    <tr>
      <td><img src="${item.img}" alt="" width="50" height="50" style="object-fit:cover;border-radius:6px;"> ${item.name}</td>
      <td>₱${item.price.toFixed(2)}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary" onclick="updateQty('${item.id}', -1)">−</button>
        <span class="mx-2">${item.qty}</span>
        <button class="btn btn-sm btn-outline-secondary" onclick="updateQty('${item.id}', 1)">+</button>
      </td>
      <td>₱${(item.price * item.qty).toFixed(2)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="removeFromCart('${item.id}')">Remove</button></td>
    </tr>
  `).join('');
  if (totalEl) totalEl.textContent = '₱' + getCartTotal().toFixed(2);
}

// ---------- Checkout / E-Wallet ----------
function openCheckout() {
  if (!requireLogin()) return;
  const cart = getCart();
  if (cart.length === 0) {
    alert('Your cart is empty.');
    return;
  }
  closeCartModal();
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  document.getElementById('checkoutTotal').textContent = '₱' + getCartTotal().toFixed(2);
  document.getElementById('ewalletChoice').style.display = 'block';
  document.getElementById('qrSection').style.display = 'none';
  document.getElementById('successSection').style.display = 'none';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}
function selectEwallet(wallet) {
  document.getElementById('ewalletChoice').style.display = 'none';
  document.getElementById('qrSection').style.display = 'block';
  document.getElementById('successSection').style.display = 'none';
  const title = document.getElementById('qrWalletTitle');
  const img = document.getElementById('qrImage');
  const note = document.getElementById('qrNote');
  if (wallet === 'gcash') {
    title.textContent = 'GCash Payment';
    img.src = 'images/Gcash.jfif';
    img.alt = 'GCash QR Code';
    note.textContent = 'Scan this QR with your GCash app to pay. Transfer fees may apply.';
  } else if (wallet === 'paymaya') {
    title.textContent = 'PayMaya / Maya Payment';
    // fallback demo QR (same image for demo, or placeholder)
    img.src = 'images/Gcash.jfif';
    img.alt = 'PayMaya QR (demo)';
    note.textContent = 'Demo: using provided QR. In production, show PayMaya QR here.';
  } else {
    title.textContent = wallet.charAt(0).toUpperCase() + wallet.slice(1) + ' Payment';
    img.src = 'images/Gcash.jfif';
    img.alt = wallet + ' QR (demo)';
    note.textContent = 'Demo QR. Connect real payment gateway in production.';
  }
}
function confirmPayment() {
  document.getElementById('qrSection').style.display = 'none';
  document.getElementById('successSection').style.display = 'block';
  // Clear cart after successful "payment"
  saveCart([]);
  updateCartBadge();
}
function finishCheckout() {
  closeCheckoutModal();
  // Optionally redirect
  // window.location.href = 'index.html';
}

// ---------- Toast ----------
function showToast(msg) {
  let toast = document.getElementById('feaneToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'feaneToast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#222;color:#fff;padding:12px 20px;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.3);transition:opacity .3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ---------- Bind food cards "Add to Cart" ----------
function bindAddToCartButtons() {
  // Menu / Index food items use structure: .box with h5 name, h6 price, img
  document.querySelectorAll('.food_section .box, .filters-content .box').forEach((box, idx) => {
    const nameEl = box.querySelector('h5');
    const priceEl = box.querySelector('.options h6');
    const imgEl = box.querySelector('.img-box img');
    const link = box.querySelector('.options a');
    if (!nameEl || !priceEl || !link) return;
    const name = nameEl.textContent.trim();
    const priceText = priceEl.textContent.replace(/[^0-9.]/g, '');
    const price = parseFloat(priceText) || 0;
    const img = imgEl ? imgEl.getAttribute('src') : '';
    const id = 'item-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + idx;

    // Replace cart SVG link with button behavior
    link.href = 'javascript:void(0)';
    link.onclick = function (e) {
      e.preventDefault();
      addToCart({ id, name, price, img });
    };
    // Also make whole options clickable-friendly
  });
}

// ---------- Inject common HTML (modals + header extras) ----------
function injectUI() {
  // Auth Modal
  if (!document.getElementById('authModal')) {
    const authHtml = `
    <div id="authModal" class="feane-modal" style="display:none;">
      <div class="feane-modal-content" style="max-width:420px;">
        <span class="feane-modal-close" onclick="closeAuthModal()">&times;</span>
        <div class="auth-tabs mb-3">
          <button class="auth-tab active" data-tab="login" onclick="switchAuthTab('login')">Login</button>
          <button class="auth-tab" data-tab="signup" onclick="switchAuthTab('signup')">Sign Up</button>
        </div>
        <div id="authMsg" class="auth-msg"></div>
        <div id="loginPane" class="auth-pane active">
          <div class="form-group">
            <input type="email" id="loginEmail" class="form-control" placeholder="Email">
          </div>
          <div class="form-group">
            <input type="password" id="loginPassword" class="form-control" placeholder="Password">
          </div>
          <button class="btn btn-warning btn-block" onclick="handleLogin()">Login</button>
        </div>
        <div id="signupPane" class="auth-pane">
          <div class="form-group">
            <input type="text" id="signupName" class="form-control" placeholder="Full Name">
          </div>
          <div class="form-group">
            <input type="email" id="signupEmail" class="form-control" placeholder="Email">
          </div>
          <div class="form-group">
            <input type="password" id="signupPassword" class="form-control" placeholder="Password (min 4 chars)">
          </div>
          <button class="btn btn-warning btn-block" onclick="handleSignup()">Create Account</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', authHtml);
  }

  // Cart Modal
  if (!document.getElementById('cartModal')) {
    const cartHtml = `
    <div id="cartModal" class="feane-modal" style="display:none;">
      <div class="feane-modal-content" style="max-width:560px;">
        <span class="feane-modal-close" onclick="closeCartModal()">&times;</span>
        <h4 class="mb-3">Your Cart</h4>
        <div id="cartItemsList"></div>
        <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
          <strong>Total: <span id="cartTotalAmount">₱0.00</span></strong>
          <button class="btn btn-warning" onclick="openCheckout()">Checkout</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', cartHtml);
  }

  // Checkout Modal
  if (!document.getElementById('checkoutModal')) {
    const checkoutHtml = `
    <div id="checkoutModal" class="feane-modal" style="display:none;">
      <div class="feane-modal-content" style="max-width:480px;text-align:center;">
        <span class="feane-modal-close" onclick="closeCheckoutModal()">&times;</span>
        <h4>Checkout</h4>
        <p class="mb-3">Total: <strong id="checkoutTotal">₱0.00</strong></p>

        <div id="ewalletChoice">
          <p class="mb-3">Choose e-Wallet:</p>
          <div class="ewallet-grid">
            <button class="ewallet-btn" onclick="selectEwallet('gcash')">
              <span style="font-size:28px;">💙</span><br>GCash
            </button>
            <button class="ewallet-btn" onclick="selectEwallet('paymaya')">
              <span style="font-size:28px;">💚</span><br>PayMaya
            </button>
            <button class="ewallet-btn" onclick="selectEwallet('grabpay')">
              <span style="font-size:28px;">🟢</span><br>GrabPay
            </button>
            <button class="ewallet-btn" onclick="selectEwallet('other')">
              <span style="font-size:28px;">📱</span><br>Other
            </button>
          </div>
        </div>

        <div id="qrSection" style="display:none;">
          <h5 id="qrWalletTitle" class="mb-2">GCash Payment</h5>
          <img id="qrImage" src="images/Gcash.jfif" alt="QR Code" style="max-width:260px;width:100%;border-radius:12px;border:1px solid #eee;">
          <p id="qrNote" class="text-muted small mt-2">Scan this QR with your GCash app to pay.</p>
          <button class="btn btn-success btn-lg mt-3" onclick="confirmPayment()">I've Paid – Confirm</button>
          <button class="btn btn-link btn-sm d-block mx-auto mt-2" onclick="document.getElementById('qrSection').style.display='none';document.getElementById('ewalletChoice').style.display='block';">← Change e-Wallet</button>
        </div>

        <div id="successSection" style="display:none;">
          <div style="font-size:64px;color:#28a745;">✓</div>
          <h4 class="text-success">Payment Successful!</h4>
          <p>Thank you for your order. Your purchase has been validated and confirmed.</p>
          <p class="small text-muted">A confirmation has been recorded (demo).</p>
          <button class="btn btn-warning mt-2" onclick="finishCheckout()">Done</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', checkoutHtml);
  }

  // Styles for modals
  if (!document.getElementById('feaneAuthCartStyles')) {
    const style = document.createElement('style');
    style.id = 'feaneAuthCartStyles';
    style.textContent = `
      .feane-modal {
        position: fixed; inset: 0; background: rgba(0,0,0,.55);
        display: flex; align-items: center; justify-content: center;
        z-index: 10000; padding: 16px;
      }
      .feane-modal-content {
        background: #fff; border-radius: 12px; padding: 24px;
        width: 100%; max-height: 90vh; overflow-y: auto; position: relative;
        box-shadow: 0 12px 40px rgba(0,0,0,.25);
      }
      .feane-modal-close {
        position: absolute; top: 10px; right: 16px; font-size: 28px;
        cursor: pointer; line-height: 1; color: #666;
      }
      .auth-tabs { display: flex; gap: 8px; }
      .auth-tab {
        flex: 1; padding: 10px; border: 1px solid #ddd; background: #f8f8f8;
        border-radius: 6px; cursor: pointer; font-weight: 600;
      }
      .auth-tab.active { background: #ffbe33; border-color: #ffbe33; color: #222; }
      .auth-pane { display: none; }
      .auth-pane.active { display: block; }
      .auth-msg { margin-bottom: 12px; padding: 8px 12px; border-radius: 6px; display: none; }
      .auth-msg.show { display: block; }
      .auth-msg.ok { background: #d4edda; color: #155724; }
      .auth-msg.err { background: #f8d7da; color: #721c24; }
      .form-group { margin-bottom: 12px; }
      .form-group .form-control { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; }
      .btn-block { width: 100%; padding: 12px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
      .ewallet-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
      }
      .ewallet-btn {
        padding: 16px 8px; border: 2px solid #eee; border-radius: 12px;
        background: #fafafa; cursor: pointer; font-weight: 600; transition: .2s;
      }
      .ewallet-btn:hover { border-color: #ffbe33; background: #fff8e6; }
      .cart-count-badge {
        position: absolute; top: -6px; right: -8px; background: #ffbe33; color: #222;
        font-size: 11px; font-weight: 700; min-width: 18px; height: 18px;
        border-radius: 50%; display: none; align-items: center; justify-content: center;
        line-height: 18px; text-align: center;
      }
      .user_option .cart_link { position: relative; }
      .header-auth-btn {
        color: #fff; margin-left: 8px; font-size: 14px; cursor: pointer;
        border: 1px solid rgba(255,255,255,.5); padding: 4px 10px; border-radius: 4px;
      }
      .header-auth-btn:hover { background: rgba(255,255,255,.15); text-decoration: none; color: #fff; }
      .sub_page .header-auth-btn { color: #222; border-color: #ccc; }
      .sub_page .header-auth-btn:hover { background: #f0f0f0; color: #222; }
    `;
    document.head.appendChild(style);
  }
}

function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const res = login(email, password);
  const msg = document.getElementById('authMsg');
  msg.textContent = res.msg;
  msg.className = 'auth-msg show ' + (res.ok ? 'ok' : 'err');
  if (res.ok) {
    updateAuthUI();
    setTimeout(closeAuthModal, 800);
  }
}
function handleSignup() {
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const res = signup(name, email, password);
  const msg = document.getElementById('authMsg');
  msg.textContent = res.msg;
  msg.className = 'auth-msg show ' + (res.ok ? 'ok' : 'err');
  if (res.ok) {
    updateAuthUI();
    setTimeout(closeAuthModal, 800);
  }
}

// ---------- Enhance header on every page ----------
function enhanceHeader() {
  const userOption = document.querySelector('.user_option');
  if (!userOption) return;

  // Make cart icon open cart
  const cartLink = userOption.querySelector('.cart_link');
  if (cartLink) {
    cartLink.href = 'javascript:void(0)';
    cartLink.onclick = function (e) { e.preventDefault(); openCartModal(); };
    if (!cartLink.querySelector('.cart-count-badge')) {
      const badge = document.createElement('span');
      badge.className = 'cart-count-badge';
      cartLink.appendChild(badge);
    }
  }

  // Add login / user + logout links to dedicated pages
  if (!userOption.querySelector('.feane-auth-area')) {
    const area = document.createElement('span');
    area.className = 'feane-auth-area';
    area.innerHTML = `
      <span class="auth-guest">
        <a href="login.html" class="header-auth-btn">Login</a>
        <a href="register.html" class="header-auth-btn">Sign Up</a>
      </span>
      <span class="auth-user" style="display:none;">
        <span class="header-auth-btn" style="cursor:default;">Hi, <span class="user-name-display"></span></span>
        <a href="javascript:void(0)" class="header-auth-btn" onclick="logout()">Logout</a>
      </span>
    `;
    const orderBtn = userOption.querySelector('.order_online');
    if (orderBtn) userOption.insertBefore(area, orderBtn);
    else userOption.appendChild(area);
  }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', function () {
  injectUI();
  enhanceHeader();
  updateAuthUI();
  bindAddToCartButtons();
  renderCartPage(); // if on cart page

  // close modals on backdrop click
  ['authModal', 'cartModal', 'checkoutModal'].forEach(id => {
    const m = document.getElementById(id);
    if (m) m.addEventListener('click', function (e) {
      if (e.target === m) {
        if (id === 'authModal') closeAuthModal();
        if (id === 'cartModal') closeCartModal();
        if (id === 'checkoutModal') closeCheckoutModal();
      }
    });
  });
});
