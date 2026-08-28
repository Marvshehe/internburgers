import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDZbkyi42Dvb-Ygoc9xnh5C7ZW_jXWx0G4",
  authDomain: "intern-7eb7d.firebaseapp.com",
  projectId: "intern-7eb7d",
  storageBucket: "intern-7eb7d.firebasestorage.app",
  messagingSenderId: "383384742204",
  appId: "1:383384742204:web:f4a9157c404bb8fca81639",
  measurementId: "G-CZ4K6WK2X1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.feaneFirebase = {
  app,
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendEmailVerification
};

function showAuthMessage(elementId, message, isError = false) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = message;
  el.style.display = message ? 'block' : 'none';
  el.style.color = isError ? '#d93025' : '#198754';
  el.style.marginBottom = '12px';
}

document.addEventListener('DOMContentLoaded', () => {
  const redirectTarget = sessionStorage.getItem('feane_login_redirect') || 'index.html';

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = document.getElementById('register-name')?.value?.trim() || '';
      const email = document.getElementById('register-email')?.value?.trim() || '';
      const password = document.getElementById('register-password')?.value || '';
      const confirmPassword = document.getElementById('register-confirm-password')?.value || '';

      if (!name || !email || !password || !confirmPassword) {
        showAuthMessage('register-error', 'Please fill in all fields.', true);
        return;
      }

      if (password.length < 6) {
        showAuthMessage('register-error', 'Password must be at least 6 characters long.', true);
        return;
      }

      if (password !== confirmPassword) {
        showAuthMessage('register-error', 'Passwords do not match.', true);
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);
        await signOut(auth);

        sessionStorage.removeItem('feane_session');

        showAuthMessage(
          'register-error',
          'Account created! We sent a verification link to your Gmail. Please click it before logging in.',
          false
        );

        registerForm.reset();
      } catch (error) {
        const message = error?.message || 'Registration failed.';
        showAuthMessage('register-error', message.replace('Firebase: ', ''), true);
      }
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('login-email')?.value?.trim() || '';
      const password = document.getElementById('login-password')?.value || '';

      if (!email || !password) {
        showAuthMessage('login-error', 'Email and password are required.', true);
        return;
      }

      try {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
          if (error?.code === 'auth/user-not-found') {
            const created = await createUserWithEmailAndPassword(auth, email, password);
            userCredential = created;
            await sendEmailVerification(created.user);
            await signOut(auth);
            sessionStorage.removeItem('feane_session');
            showAuthMessage(
              'login-error',
              'No account was found, so a new account was created. Please check your Gmail and verify the link before logging in again.',
              false
            );
            sessionStorage.setItem('feane_login_redirect', redirectTarget);
            return;
          }
          throw error;
        }

        const user = userCredential.user;

        if (!user.emailVerified) {
          await signOut(auth);
          sessionStorage.removeItem('feane_session');
          showAuthMessage(
            'login-error',
            'Please verify your Gmail address first. Check the verification link sent to your inbox before logging in.',
            true
          );
          return;
        }

        if (user && user.email) {
          sessionStorage.setItem('feane_session', JSON.stringify({
            email: user.email,
            name: user.displayName || user.email.split('@')[0]
          }));
        }

        showAuthMessage('login-error', 'Login successful. Redirecting...', false);
        setTimeout(() => {
          sessionStorage.removeItem('feane_login_redirect');
          window.location.href = redirectTarget;
        }, 800);
      } catch (error) {
        const message = error?.message || 'Login failed.';
        showAuthMessage('login-error', message.replace('Firebase: ', ''), true);
      }
    });
  }

  onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
      sessionStorage.setItem('feane_session', JSON.stringify({
        email: user.email,
        name: user.displayName || user.email.split('@')[0]
      }));
    } else {
      sessionStorage.removeItem('feane_session');
    }
  });
});
