<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

async function handleSignOut() {
  await auth.signOut();
  await router.replace({ name: "login" });
}

function isActive(name: string) {
  return route.name === name;
}
</script>

<template>
  <div class="shell">
    <header class="shell__bar">
      <div class="shell__inner">
        <RouterLink to="/" class="shell__brand">
          <img
            src="/assets/brand/zonatic-logo-full-light.webp"
            alt="Zonatic"
            class="shell__logo"
            loading="eager"
            decoding="async"
          />
        </RouterLink>

        <nav class="shell__nav" aria-label="Console">
          <RouterLink
            to="/"
            :class="['shell__link', { active: isActive('overview') }]"
          >
            Overview
          </RouterLink>
          <RouterLink
            to="/data"
            :class="['shell__link', { active: isActive('data') }]"
          >
            Data
          </RouterLink>
          <RouterLink
            to="/zona"
            :class="['shell__link', { active: isActive('zona') }]"
          >
            Zona
          </RouterLink>
          <RouterLink
            to="/rules"
            :class="['shell__link', { active: isActive('rules') }]"
          >
            Rules
          </RouterLink>
          <RouterLink
            to="/api"
            :class="['shell__link', { active: isActive('api') }]"
          >
            API
          </RouterLink>
          <RouterLink
            to="/settings"
            :class="['shell__link', { active: isActive('settings') }]"
          >
            Settings
          </RouterLink>
        </nav>

        <div class="shell__account">
          <span class="shell__user">
            <img
              v-if="auth.avatarUrl"
              :src="auth.avatarUrl"
              alt=""
              class="shell__avatar"
            />
            <span
              v-else
              class="shell__avatar shell__avatar--initial"
              aria-hidden="true"
            >
              {{ auth.displayName.slice(0, 1).toUpperCase() }}
            </span>
            <span class="shell__email">{{ auth.email }}</span>
          </span>
          <button type="button" class="shell__signout" @click="handleSignOut">
            Sign out
          </button>
        </div>
      </div>
    </header>

    <main class="shell__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell__bar {
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.shell__inner {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0.875rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.75rem;
}

.shell__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--fg);
  text-decoration: none;
  font-weight: 600;
  height: 2.25rem;
}

.shell__logo {
  height: 2.25rem;
  width: auto;
  object-fit: contain;
}

.shell__nav {
  display: flex;
  gap: 0.25rem;
  flex: 1;
}

.shell__link {
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--muted);
  text-decoration: none;
}

.shell__link:hover {
  color: var(--fg);
  background: var(--surface-hover);
}

.shell__link.active {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.12);
}

.shell__account {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.shell__user {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.shell__avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  flex: none;
  object-fit: cover;
}

.shell__avatar--initial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-hover);
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.shell__email {
  font-size: 0.8125rem;
  color: var(--muted);
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shell__signout {
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}

.shell__signout:hover {
  color: var(--fg);
  border-color: var(--border-strong);
}

.shell__main {
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

@media (max-width: 40rem) {
  .shell__email {
    display: none;
  }
}
</style>
