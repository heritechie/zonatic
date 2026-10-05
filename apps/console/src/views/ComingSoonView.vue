<script setup lang="ts">
import ConsoleShell from '../components/ConsoleShell.vue';

defineProps<{
  title: string;
  summary: string;
}>();
</script>

<template>
  <ConsoleShell>
    <section class="placeholder">
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-subtitle">{{ summary }}</p>
      <div class="placeholder__card">
        <span class="placeholder__badge">Coming soon</span>
        <p class="placeholder__text">
          This section is intentionally not implemented in the V1 Console MVP. The
          existing functionality remains in the public codebase but will not ship
          here yet.
        </p>
      </div>
    </section>
  </ConsoleShell>
</template>

<style scoped>
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.page-subtitle {
  color: var(--muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.placeholder {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.placeholder__card {
  margin-top: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  padding: 1.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.placeholder__badge {
  align-self: flex-start;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  background: rgba(148, 163, 184, 0.16);
  color: var(--muted);
}

.placeholder__text {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.7;
}
</style>