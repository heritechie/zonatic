<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import UserAvatar from "./UserAvatar.vue";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

/**
 * Primary navigation items.
 *
 * V1 ships only Overview and API. Data, Zona, Rules, and Settings still have
 * routes and `ComingSoonView` pages — they are hidden from the primary nav, not
 * removed, so their URLs keep working and they can be revealed again by
 * flipping `visible` rather than by re-adding markup.
 *
 * `visible: false` also means no active-state is computed for those items, so
 * landing directly on `/data` shows a page with no highlighted nav entry. That
 * is intentional: highlighting a destination the nav does not advertise would
 * be worse than showing nothing.
 */
const NAV_ITEMS = [
  { label: "Overview", to: "/", name: "overview", visible: true },
  { label: "Data", to: "/data", name: "data", visible: false },
  { label: "Zona", to: "/zona", name: "zona", visible: false },
  { label: "Rules", to: "/rules", name: "rules", visible: false },
  { label: "API", to: "/api", name: "api", visible: true },
  { label: "Settings", to: "/settings", name: "settings", visible: false },
] as const;

const visibleNavItems = NAV_ITEMS.filter((item) => item.visible);

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
            v-for="item in visibleNavItems"
            :key="item.name"
            :to="item.to"
            :class="['shell__link', { active: isActive(item.name) }]"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="shell__account">
          <span class="shell__user">
            <!--
              The avatar falls back to an initial whenever the Google image URL
              is missing, malformed, or fails to load, so the top bar can never
              render a broken image. Sized to match the previous inline avatar.
            -->
            <UserAvatar :src="auth.avatarUrl" :name="auth.displayName" size="1.75rem" />
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

/* Avatar geometry and the initial treatment live in UserAvatar.vue, so they
   apply identically wherever the control is reused. */

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
