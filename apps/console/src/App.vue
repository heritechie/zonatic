<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();

// Read the persisted session before the first navigation so the router guard
// has an answer synchronously.
onMounted(() => {
  if (auth.initialising) {
    void auth.initialise();
  }
});
</script>

<template>
  <router-view />
</template>

<style>
/**
 * Console design tokens.
 *
 * The console has no component library, so brand values live here as custom
 * properties. Colours match the marketing site's navy/emerald identity; the
 * base pairs the landing page's ink (#0a1628) with its emerald accent.
 */
:root {
  --bg: #070d18;
  --surface: #0e1729;
  --surface-hover: #16213a;
  --border: #1e2b44;
  --border-strong: #2c3d5c;
  --fg: #e8eefb;
  --muted: #93a4c0;

  color-scheme: dark;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100vh;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica,
    Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/**
 * Shared button + code styles. These live unscoped (not inside `scoped`) so
 * every view shares one definition instead of repeating them.
 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.4375rem 0.8125rem;
  border-radius: 0.4375rem;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--fg);
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.btn:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--primary {
  background: #10b981;
  border-color: #10b981;
  color: #04211a;
  font-weight: 600;
}

.btn--primary:hover:not(:disabled) {
  background: #34d399;
  border-color: #34d399;
}

/* Neutral filled surface — the resting state of secondary actions, so it reads
   as clearly less prominent than the emerald primary above. */
.btn--secondary {
  background: var(--surface);
  border-color: var(--border-strong);
  color: var(--fg);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.btn--danger {
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.35);
}

.btn--danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.5);
}

code {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}
</style>