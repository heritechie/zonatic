<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import ConsoleShell from '../components/ConsoleShell.vue';
import { client } from '../graphql/client';
import { ME_QUERY, API_KEYS_QUERY, RENAME_WORKSPACE_MUTATION, type Me, type ApiKey, type ApiKeysResult } from '../graphql/documents';

const me = ref<Me['me']>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const renaming = ref(false);
const editing = ref(false);
const editName = ref('');
const renameError = ref<string | null>(null);
const editInput = ref<HTMLInputElement | null>(null);
const apiKeys = ref<ApiKeysResult['apiKeys']>([]);

/**
 * Trailing mask appended to the stored, non-secret `keyPrefix`.
 *
 * The prefix (e.g. `zon_1f4c9a`) is the only readable part of a key, so showing
 * it plus a fixed mask is enough to recognise which key it is while revealing
 * nothing. The secret itself is never fetched here.
 */
const MASKED_TAIL = '••••••••••••••••••••';

const stats = computed(() => [
  { label: 'API keys', value: me.value?.apiKeyCount ?? 0 },
  { label: 'Active keys', value: me.value?.activeApiKeyCount ?? 0 },
  { label: 'API requests', value: me.value?.apiRequestsTotal ?? 0 },
]);

/**
 * Newest key first.
 *
 * The query happens to arrive newest-first, but the preview must not depend on
 * that — an ordering guarantee that lives in the query rather than in this
 * component would silently pick the wrong key the moment the query changed.
 * Sorted here so the choice is explicit and local.
 */
const keysByRecency = computed<ApiKey[]>(() =>
  [...apiKeys.value].sort((a, b) => {
    const at = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bt - at;
  }),
);

/**
 * The single key shown in the preview: the most recently created key that is
 * still usable.
 *
 * Falling back to the newest key overall when every key is revoked would show
 * an inert key as if it were the live one, so that case is left to
 * `hasRevokedOnly` and reported as its own state instead.
 */
const latestApiKey = computed<ApiKey | null>(
  () => keysByRecency.value.find((k) => !k.revokedAt) ?? null,
);

const hasKeys = computed(() => apiKeys.value.length > 0);

async function load() {
  loading.value = true;
  error.value = null;
  const [meResult, keysResult] = await Promise.all([
    client.query<Me>(ME_QUERY, {}).toPromise(),
    client.query<ApiKeysResult>(API_KEYS_QUERY, {}).toPromise(),
  ]);
  if (meResult.error) {
    error.value = meResult.error.message;
  } else {
    me.value = meResult.data?.me ?? null;
  }
  if (keysResult.error) {
    error.value = keysResult.error.message;
  } else {
    apiKeys.value = keysResult.data?.apiKeys ?? [];
  }
  loading.value = false;
}


function startEdit() {
  if (!me.value?.workspace) return;
  editing.value = true;
  editName.value = me.value.workspace.name;
  renameError.value = null;
}

function cancelEdit() {
  editing.value = false;
  editName.value = '';
  renameError.value = null;
}

function onBlur() {
  if (renaming.value) return;
  cancelEdit();
}

async function saveWorkspaceName() {
  const name = editName.value.trim();
  if (name.length === 0) {
    renameError.value = 'Workspace name is required';
    return;
  }
  renaming.value = true;
  renameError.value = null;
  try {
    const result = await client.mutation(RENAME_WORKSPACE_MUTATION, { name }).toPromise();
    if (result.error) {
      renameError.value = result.error.message;
      return;
    }
    if (me.value?.workspace) {
      me.value.workspace.name = name;
    }
    editing.value = false;
    editName.value = '';
  } catch (err) {
    renameError.value = err instanceof Error ? err.message : 'Failed to rename workspace';
  } finally {
    renaming.value = false;
  }
}
function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


watch(editing, (v) => {
  if (v) {
    nextTick(() => {
      editInput.value?.focus();
      editInput.value?.select();
    });
  }
});
onMounted(load);
</script>

<template>
  <ConsoleShell>
    <p v-if="loading" class="muted">Loading workspace…</p>

    <p v-else-if="error" class="error" role="alert">{{ error }}</p>

    <template v-else-if="me">
      <div class="page-title-group">
        <template v-if="!editing">
          <h1
            class="page-title workspace-name"
            tabindex="0"
            role="button"
            aria-label="Rename workspace"
            @click="startEdit"
            @keydown.enter.prevent="startEdit"
            @keydown.space.prevent="startEdit"
          >
            <span class="workspace-name__text">{{ me.workspace?.name ?? 'Your workspace' }}</span>
            <span class="pencil" aria-hidden="true">✎</span>
          </h1>
        </template>
        <template v-else>
          <div class="inline-edit">
            <input
              ref="editInput"
              v-model="editName"
              type="text"
              class="edit-input"
              :disabled="renaming"
              @keyup.enter="saveWorkspaceName"
              @keyup.esc="cancelEdit"
              @blur="onBlur"
            />
            <button type="button" class="icon-btn icon-btn--success" :disabled="renaming || editName.trim().length === 0" aria-label="Save" @mousedown.prevent @click.stop.prevent="saveWorkspaceName">✓</button>
            <button type="button" class="icon-btn" :disabled="renaming" aria-label="Cancel" @mousedown.prevent @click="cancelEdit">×</button>
            <span v-if="renameError" class="rename-error">{{ renameError }}</span>
          </div>
        </template>
      </div>
      <p class="page-subtitle">
        Geographic infrastructure for Indonesia
      </p>

      <section class="stats" aria-label="Usage summary">
        <div v-for="stat in stats" :key="stat.label" class="stat">
          <span class="stat__value">{{ stat.value.toLocaleString('en-US') }}</span>
          <span class="stat__label">{{ stat.label }}</span>
        </div>
      </section>

      <section class="panel">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">Workspace</h2>
            <p class="panel__hint">Identity and workspace details</p>
          </div>
          
        </div>

        <dl class="rows">
          <div class="row">
            <dt>Signed in as</dt>
            <dd>{{ me.fullName || me.email }}</dd>
          </div>
          <div class="row">
            <dt>Email</dt>
            <dd>{{ me.email }}</dd>
          </div>
          <div class="row">
            <dt>Workspace</dt>
            <dd>{{ me.workspace?.name ?? '—' }}</dd>
          </div>
          <div class="row">
            <dt>Role</dt>
            <dd>{{ me.workspace?.role ?? '—' }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">API Keys</h2>
            <p class="panel__hint">
              Keys authenticate requests to the Zonatic public API.
            </p>
          </div>
          <RouterLink to="/api" class="btn">Manage keys</RouterLink>
        </div>

        <!-- This panel is a summary only. The full list, plus create and
             revoke, lives on the API page. -->
        <div v-if="!hasKeys" class="muted">
          0 keys in this workspace.
        </div>
        <div v-else-if="!latestApiKey" class="muted">
          No active keys. All {{ apiKeys.length }} key{{ apiKeys.length === 1 ? '' : 's' }}
          in this workspace {{ apiKeys.length === 1 ? 'has' : 'have' }} been revoked.
        </div>
        <div v-else class="api-key-preview">
          <div class="api-key-preview__row">
            <div class="api-key-preview__name">
              <span class="api-key-preview__label">Latest key</span>
              {{ latestApiKey.name }}
            </div>
            <div class="api-key-preview__mask">{{ latestApiKey.keyPrefix }}{{ MASKED_TAIL }}</div>
          </div>
          <div class="api-key-preview__meta">
            Created {{ formatDate(latestApiKey.createdAt) }} · Last used {{ formatDate(latestApiKey.lastUsedAt) }}
          </div>
        </div>
      </section>
    </template>
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

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.75rem;
  margin: 1.75rem 0;
}

.stat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat__value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.stat__label {
  font-size: 0.8125rem;
  color: var(--muted);
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel__title {
  font-size: 0.975rem;
  font-weight: 600;
}

.panel__hint {
  font-size: 0.8125rem;
  color: var(--muted);
  margin-top: 0.125rem;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.875rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid var(--border);
}

.row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.row dt {
  color: var(--muted);
}

.row dd {
  text-align: right;
  word-break: break-all;
}

.muted {
  color: var(--muted);
  font-size: 0.875rem;
}

.error {
  color: #fca5a5;
  font-size: 0.875rem;
}

.page-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.workspace-name {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.workspace-name .pencil {
  opacity: 0;
  font-size: 0.875rem;
  color: var(--muted);
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.workspace-name:hover .pencil,
.workspace-name:focus .pencil {
  opacity: 0.6;
}

.workspace-name__text {
  line-height: 1.2;
}

.inline-edit {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.edit-input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--fg);
  font-size: 1.25rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  height: 2rem;
  min-width: 12rem;
}

.edit-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
}

.edit-input:disabled {
  opacity: 0.6;
}

.icon-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  border-radius: 0.375rem;
  width: 1.75rem;
  height: 1.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.icon-btn:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--border-strong);
  color: var(--fg);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn--success:hover:not(:disabled) {
  color: #10b981;
}

.rename-error {
  font-size: 0.75rem;
  color: #fca5a5;
  width: 100%;
}

.api-key-preview {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.875rem 1rem;
}

.api-key-preview__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.api-key-preview__name {
  font-weight: 600;
  font-size: 0.9rem;
}

/* Small caption clarifying this is one key, not the whole list. Matches the
   uppercase field-label treatment already used on the API page. */
.api-key-preview__label {
  display: block;
  margin-bottom: 0.1875rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.api-key-preview__mask {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  color: var(--muted);
}

.api-key-preview__meta {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: var(--muted);
}

</style>