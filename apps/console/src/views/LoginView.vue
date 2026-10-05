<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const pending = ref(false);
const error = ref<string | null>(null);

/** Base URL of the marketing site, used for the legal links. */
const siteBase = import.meta.env.VITE_SITE_URL || "https://www.zonatic.id";

async function continueWithGoogle() {
  pending.value = true;
  error.value = null;
  try {
    await auth.signInWithGoogle();
    // The browser navigates to Google, so this only runs on failure.
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Gagal masuk dengan Google. Coba lagi.";
    pending.value = false;
  }
}
</script>

<template>
  <main class="login">
    <div class="login__card">
      <div class="login__brand">
        <img
          src="/assets/brand/zonatic-logo-full-light.webp"
          alt="Zonatic"
          class="login_logo"
          loading="eager"
          decoding="async"
        />
      </div>

      <h1 class="login__title">Welcome to Zonatic</h1>
      <p class="login__subtitle">
        Sign in to manage your workspace and API keys.
      </p>

      <button
        type="button"
        class="google-btn"
        :disabled="pending"
        @click="continueWithGoogle"
      >
        <svg class="google-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
          />
        </svg>
        {{ pending ? "Menghubungkan…" : "Continue with Google" }}
      </button>

      <p v-if="error" class="login__error" role="alert">{{ error }}</p>

      <p class="login__legal">
        By continuing, you agree to our
        <a
          :href="`${siteBase}/en/terms/`"
          target="_blank"
          rel="noopener noreferrer"
          >Terms of Service</a
        >
        and
        <a
          :href="`${siteBase}/en/privacy/`"
          target="_blank"
          rel="noopener noreferrer"
          >Privacy Policy</a
        >.
      </p>
    </div>
  </main>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
}

.login__card {
  width: 100%;
  max-width: 25rem;
  text-align: center;
}

.login__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.75rem;
}

.login_logo {
  height: 3.8rem;
  width: auto;
  object-fit: contain;
}

.login__mark {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: #10b981;
  color: #04211a;
  font-weight: 700;
  font-size: 1.05rem;
}

.login__wordmark {
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.login__title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.login__subtitle {
  color: var(--muted);
  font-size: 0.9rem;
  margin-bottom: 1.75rem;
}

.google-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 0.7rem 1rem;
  font-size: 0.925rem;
  font-weight: 600;
  color: var(--fg);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.google-btn:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.google-btn:disabled {
  opacity: 0.6;
  cursor: progress;
}

.google-btn__icon {
  width: 1.05rem;
  height: 1.05rem;
  flex: none;
}

.login__error {
  margin-top: 1rem;
  color: #fca5a5;
  font-size: 0.85rem;
}

.login__legal {
  margin-top: 1.5rem;
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--muted);
}

.login__legal a {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.login__legal a:hover {
  color: var(--fg);
}
</style>
