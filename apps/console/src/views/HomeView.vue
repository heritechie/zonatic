<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { client } from '../graphql/client';

const graphqlStatus = ref<string>('checking...');

const HEALTH_QUERY = `
  query {
    health
  }
`;

onMounted(async () => {
  try {
    const result = await client.query(HEALTH_QUERY, {}).toPromise();
    graphqlStatus.value = result.data?.health || 'error';
  } catch {
    graphqlStatus.value = 'unreachable';
  }
});
</script>

<template>
  <div class="home">
    <h1>Zonatic Console</h1>
    <p class="subtitle">Location Intelligence Platform</p>
    <div class="status">
      <span class="label">GraphQL API:</span>
      <span :class="['badge', graphqlStatus === 'ok' ? 'ok' : 'err']">{{ graphqlStatus }}</span>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0a0e1a;
  color: #e2e8f0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home {
  text-align: center;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #94a3b8;
  margin-bottom: 2rem;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  color: #94a3b8;
  font-size: 0.875rem;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.badge.ok {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.badge.err {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
</style>
