<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import ConsoleShell from '../components/ConsoleShell.vue';
import { client } from '../graphql/client';
import {
  API_KEYS_QUERY,
  CREATE_API_KEY_MUTATION,
  RENAME_API_KEY_MUTATION,
  REVOKE_API_KEY_MUTATION,
  ROTATE_API_KEY_MUTATION,
  type ApiKey,
  type ApiKeysResult,
  type CreateApiKeyResult,
  type RenameApiKeyResult,
  type RevokeApiKeyResult,
  type RotateApiKeyResult,
} from '../graphql/documents';

type Environment = 'production' | 'development';

const KEY_PREFIX = 'zon';

/**
 * Shows the just-created key exactly once, then is cleared for good.
 *
 * `revealedKey` is the only place the raw secret lives after the create
 * mutation returns. Nothing is written to localStorage, sessionStorage, or any
 * persistent store, and nothing is fetched back from the backend — the same
 * value is replayed into the clipboard each time Copy is clicked.
 */
const revealedKey = ref<string | null>(null);
const revealedName = ref<string | null>(null);
const revealedEnv = ref<Environment | null>(null);
const copied = ref(false);

/** Handle for the "Copied" indicator, so a previous copy cannot leak into a
 *  later state if Done is clicked before the timeout fires. */
let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

const keys = ref<ApiKeysResult['apiKeys']>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const revokingId = ref<string | null>(null);

const createModalOpen = ref(false);
const creating = ref(false);
const formName = ref('');
const formEnvironment = ref<Environment>('production');

/*
 * Inline rename state.
 *
 * At most one key is edited at a time, so a single set of fields is shared
 * across the list rather than duplicated per card.
 */
const editingId = ref<string | null>(null);
const editName = ref('');
const renameError = ref<string | null>(null);
const renamingId = ref<string | null>(null);
const editInput = ref<HTMLInputElement | null>(null);

const isRenaming = computed(() => renamingId.value !== null);

/*
 * Rotate state.
 *
 * `confirmRotateId` is the key currently shown in the confirmation modal;
 * `rotatingId` is the key whose rotate mutation is in flight; both are
 * separate from `revealedKey`, which is the key (after a successful rotate
 * or create) whose raw secret is in the one-time card.
 */
const confirmRotateId = ref<string | null>(null);
const rotatingId = ref<string | null>(null);
const rotateError = ref<string | null>(null);
const isRotating = computed(() => rotatingId.value !== null);

/** Resolve the row currently in the rotate confirmation modal, if any. */
const confirmRotateKey = computed<ApiKey | null>(
  () => keys.value.find((k) => k.id === confirmRotateId.value) ?? null,
);

async function load() {
  loading.value = true;
  error.value = null;
  const result = await client.query<ApiKeysResult>(API_KEYS_QUERY, {}).toPromise();
  if (result.error) {
    error.value = result.error.message;
  } else {
    keys.value = result.data?.apiKeys ?? [];
  }
  loading.value = false;
}

function openCreateModal() {
  const suggested = `Key ${keys.value.filter((k) => !k.revokedAt).length + 1}`;
  formName.value = suggested;
  formEnvironment.value = 'production';
  createModalOpen.value = true;
  error.value = null;
}

function closeCreateModal() {
  if (creating.value) return;
  createModalOpen.value = false;
  formName.value = '';
  formEnvironment.value = 'production';
}

async function submitCreate() {
  const name = formName.value.trim();
  if (name.length === 0) {
    error.value = 'Name is required';
    return;
  }

  creating.value = true;
  error.value = null;
  const result = await client
    .mutation<CreateApiKeyResult>(CREATE_API_KEY_MUTATION, {
      name,
    })
    .toPromise();

  if (result.error) {
    error.value = result.error.message;
  } else if (result.data?.createApiKey) {
    const created = result.data.createApiKey;
    createModalOpen.value = false;
    revealedKey.value = created.rawKey;
    revealedName.value = created.name;
    revealedEnv.value = formEnvironment.value;
    copied.value = false;

    // Splice the new row to the top of the local list. The server returns
    // `createdAt = now()`, putting the just-created row first in the same
    // order the backend would have returned from a refetch. The list is
    // patched locally rather than refetched so the user does not see a
    // flicker (and so urql's cache-first policy cannot serve us a stale
    // snapshot of the previous list).
    keys.value = [
      {
        id: created.id,
        name: created.name,
        keyPrefix: created.keyPrefix,
        environment: created.environment,
        createdAt: created.createdAt,
        lastUsedAt: null,
        revokedAt: null,
      },
      ...keys.value.filter((k) => k.id !== created.id),
    ];
  }
  creating.value = false;
}

function dismissReveal() {
  if (copyResetTimer) {
    clearTimeout(copyResetTimer);
    copyResetTimer = null;
  }
  revealedKey.value = null;
  revealedName.value = null;
  revealedEnv.value = null;
  copied.value = false;
}

/**
 * Re-copy the existing raw key to the clipboard.
 *
 * May be called any number of times while the one-time card is still open;
 * each click writes the same secret back to the clipboard. The raw key is
 * read from the local state set by `submitCreate` — nothing is refetched and
 * nothing is read from storage.
 */
async function copyKey() {
  if (!revealedKey.value) return;
  if (copyResetTimer) {
    clearTimeout(copyResetTimer);
    copyResetTimer = null;
  }
  try {
    await navigator.clipboard.writeText(revealedKey.value);
    copied.value = true;
    // Reset the label so the button reads as a normal "Copy" again, instead
    // of staying "Copied" forever after the first press.
    copyResetTimer = setTimeout(() => {
      copied.value = false;
      copyResetTimer = null;
    }, 1500);
  } catch {
    copied.value = false;
  }
}

async function revoke(id: string, name: string) {
  if (!window.confirm(`Revoke "${name}"? Requests using it will stop working.`)) {
    return;
  }
  revokingId.value = id;
  error.value = null;
  const result = await client
    .mutation<RevokeApiKeyResult>(REVOKE_API_KEY_MUTATION, { keyId: id })
    .toPromise();
  if (result.error) {
    error.value = result.error.message;
  } else {
    // The mutation response carries only `revokeApiKey: boolean`, so we
    // mark the row revoked locally. We mirror the server's `now()` so the
    // badge flips to "Revoked" immediately without waiting for a refetch
    // (which would otherwise come back from urql's cache-first exchange as
    // a stale snapshot).
    const target = keys.value.find((k) => k.id === id);
    if (target) {
      target.revokedAt = new Date().toISOString();
    }
  }
  revokingId.value = null;
}

/**
 * Open the rotate-confirmation modal for one key.
 *
 * The modal deliberately does not show any secret material: the user has to
 * commit explicitly before a new rawKey is minted, since rotating a key
 * instantly invalidates the previous one for every application using it.
 */
function openRotateConfirm(key: ApiKey) {
  if (key.revokedAt) return;
  confirmRotateId.value = key.id;
  rotateError.value = null;
}

function closeRotateConfirm() {
  if (isRotating.value) return;
  confirmRotateId.value = null;
  rotateError.value = null;
}

/**
 * Persist a rotation for one key.
 *
 * Only the row id is sent; the tenant comes from the verified session. On
 * success the response gives us:
 *   - the new row (new id, fresh keyPrefix/keyHash, createdAt = now, no
 *     lastUsedAt, no revokedAt) — spliced to the top of the local list.
 *   - the new rawKey — surfaced through the existing one-time reveal card
 *     and treated exactly like a create: never persisted, never refetched,
 *     cleared by Done.
 *
 * The old key keeps its id, its original `createdAt`, its original secret
 * material, and gains a `revokedAt`. The list is patched locally rather
 * than refetched so the user does not see a flicker.
 */
async function submitRotate(key: ApiKey) {
  rotatingId.value = key.id;
  rotateError.value = null;
  try {
    const result = await client
      .mutation<RotateApiKeyResult>(ROTATE_API_KEY_MUTATION, { id: key.id })
      .toPromise();

    if (result.error) {
      rotateError.value = result.error.message;
      return;
    }

    const rotated = result.data?.rotateApiKey;
    if (!rotated) {
      rotateError.value = 'Failed to rotate API key';
      return;
    }

    // Mark the old key revoked. We mirror the server's `now()` so the badge
    // flips to Revoked immediately without waiting for a refetch.
    const oldKey = keys.value.find((k) => k.id === key.id);
    if (oldKey) {
      oldKey.revokedAt = new Date().toISOString();
    }

    // Splice the new key to the top. The server returns `createdAt` set to
    // `now()` so the sort by recency puts it first; the list still renders
    // in the same order the backend would have returned from a refetch.
    keys.value = [
      {
        id: rotated.id,
        name: rotated.name,
        keyPrefix: rotated.keyPrefix,
        environment: rotated.environment,
        createdAt: rotated.createdAt,
        lastUsedAt: null,
        revokedAt: null,
      },
      ...keys.value.filter((k) => k.id !== rotated.id),
    ];

    // Hand the raw secret to the existing one-time reveal card. From here
    // Copy and Done behave identically to the create path.
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    revealedKey.value = rotated.rawKey;
    revealedName.value = rotated.name;
    revealedEnv.value = isKeyEnvironmentString(rotated.environment)
      ? rotated.environment
      : null;
    copied.value = false;

    confirmRotateId.value = null;
  } catch (err) {
    rotateError.value = err instanceof Error ? err.message : 'Failed to rotate API key';
  } finally {
    rotatingId.value = null;
  }
}

/**
 * Narrow a server-side environment string into the local `Environment` union.
 *
 * The server only ever persists `production` or `development`, so anything
 * else is treated as "unknown" and is not surfaced as the reveal-card env
 * label rather than poisoning state with an arbitrary string.
 */
function isKeyEnvironmentString(value: string): value is Environment {
  return value === 'production' || value === 'development';
}

function startRename(key: ApiKey) {
  editingId.value = key.id;
  editName.value = key.name;
  renameError.value = null;
}

function cancelRename() {
  editingId.value = null;
  editName.value = '';
  renameError.value = null;
}

/**
 * Blur dismisses the editor, the same as the workspace rename.
 *
 * Suppressed while a save is in flight so the input unmounting mid-request
 * cannot be read as a cancel.
 */
function onRenameBlur() {
  if (isRenaming.value) return;
  cancelRename();
}

/**
 * Persist a new display name for one key.
 *
 * Only `name` is sent. The key is addressed by its existing id, so the secret,
 * masked prefix, creation time, last-used time, and revoke state are untouched,
 * and no new key is created. On success the row returned by the mutation is
 * written straight into the local list, which updates the card in place with no
 * refetch and no page reload.
 */
async function saveRename(key: ApiKey) {
  const name = editName.value.trim();
  if (name.length === 0) {
    renameError.value = 'Name is required';
    return;
  }

  renamingId.value = key.id;
  renameError.value = null;
  try {
    const result = await client
      .mutation<RenameApiKeyResult>(RENAME_API_KEY_MUTATION, { id: key.id, name })
      .toPromise();

    if (result.error) {
      // Stay in edit mode so the typed value is not lost and the cause is visible.
      renameError.value = result.error.message;
      return;
    }

    const target = keys.value.find((k) => k.id === key.id);
    const updated = result.data?.renameApiKey;
    if (target && updated) {
      target.name = updated.name;
    }
    cancelRename();
  } catch (err) {
    renameError.value = err instanceof Error ? err.message : 'Failed to rename API key';
  } finally {
    renamingId.value = null;
  }
}

/**
 * Capture the editor element for the card being renamed.
 *
 * A function ref is used because a string ref inside `v-for` would collect an
 * array of elements rather than the single active input.
 */
function captureEditInput(el: unknown, id: string) {
  editInput.value = el instanceof HTMLInputElement ? el : null;
  void id;
}

watch(editingId, (id) => {
  if (id) {
    nextTick(() => {
      editInput.value?.focus();
      editInput.value?.select();
    });
  }
});

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

onMounted(load);
</script>

<template>
  <ConsoleShell>
    <div class="page">
      <div class="head">
        <div class="head__text">
          <h1 class="page-title">API</h1>
          <p class="page-subtitle">
            Keys authenticate requests to the Zonatic public API.
          </p>
        </div>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="creating || !!revealedKey || createModalOpen"
          @click="openCreateModal"
        >
          Create API Key
        </button>
      </div>

      <!-- One-time reveal -->
      <section v-if="revealedKey" class="reveal" aria-live="polite">
        <h2 class="reveal__title">Copy your new key now</h2>
        <p class="reveal__warn">
          This is the only time the full secret will be shown. Store it somewhere
          safe — it cannot be retrieved again.
        </p>

        <div class="secret">
          <code class="secret__value">{{ revealedKey }}</code>
          <button type="button" class="btn" :class="{ 'btn--ok': copied }" @click="copyKey">
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
        </div>

        <div v-if="revealedName" class="reveal__meta">
          <span class="reveal__label">Name</span>
          <span class="reveal__value">{{ revealedName }}</span>
        </div>

        <div class="reveal__actions">
          <button type="button" class="btn btn--secondary" @click="dismissReveal">
            Done
          </button>
        </div>
      </section>

      <section aria-labelledby="api-keys-heading">
        <h2 id="api-keys-heading" class="section-title">API Keys</h2>

        <p v-if="loading" class="muted">Loading keys…</p>
        <p v-else-if="error" class="error" role="alert">{{ error }}</p>

        <div v-else-if="keys.length === 0" class="empty">
          <p class="empty__title">No API keys yet</p>
          <p class="empty__hint">
            Create a key to call the Zonatic API from your application.
          </p>
        </div>

        <div v-else class="keys">
          <article v-for="key in keys" :key="key.id" class="key-card">
            <div class="key-card__head">
              <h3
                v-if="editingId !== key.id"
                class="key-card__name key-name"
                tabindex="0"
                role="button"
                :aria-label="`Rename ${key.name}`"
                @click="startRename(key)"
                @keydown.enter.prevent="startRename(key)"
                @keydown.space.prevent="startRename(key)"
              >
                <span class="key-name__text">{{ key.name }}</span>
                <span class="pencil" aria-hidden="true">✎</span>
              </h3>
              <div v-else class="inline-edit">
                <input
                  :ref="(el) => captureEditInput(el, key.id)"
                  v-model="editName"
                  type="text"
                  class="edit-input"
                  maxlength="255"
                  :disabled="renamingId === key.id"
                  :aria-label="`Rename ${key.name}`"
                  @keyup.enter="saveRename(key)"
                  @keyup.esc="cancelRename"
                  @blur="onRenameBlur"
                />
                <button
                  type="button"
                  class="icon-btn icon-btn--success"
                  :disabled="renamingId === key.id || editName.trim().length === 0"
                  aria-label="Save"
                  @mousedown.prevent
                  @click.stop.prevent="saveRename(key)"
                >✓</button>
                <button
                  type="button"
                  class="icon-btn"
                  :disabled="renamingId === key.id"
                  aria-label="Cancel"
                  @mousedown.prevent
                  @click="cancelRename"
                >×</button>
                <span v-if="renameError" class="rename-error">{{ renameError }}</span>
              </div>
              <span v-if="key.revokedAt" class="badge badge--revoked">Revoked</span>
              <span v-else class="badge badge--active">Active</span>
            </div>

            <code class="key-card__mask">{{ key.keyPrefix }}••••••••••••••••••</code>

            <div class="key-card__foot">
              <div class="key-card__field">
                <span class="key-card__label">Created</span>
                <span class="key-card__value">{{ formatDate(key.createdAt) }}</span>
              </div>
              <div class="key-card__field">
                <span class="key-card__label">Last used</span>
                <span class="key-card__value">{{ formatDate(key.lastUsedAt) }}</span>
              </div>
              <div v-if="!key.revokedAt" class="key-card__actions">
                <button
                  type="button"
                  class="btn btn--secondary key-card__rotate"
                  :disabled="rotatingId === key.id || revokingId === key.id"
                  @click="openRotateConfirm(key)"
                >
                  Rotate
                </button>
                <button
                  type="button"
                  class="btn btn--danger key-card__revoke"
                  :disabled="revokingId === key.id || rotatingId === key.id"
                  @click="revoke(key.id, key.name)"
                >
                  {{ revokingId === key.id ? 'Revoking…' : 'Revoke' }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <!-- Create modal -->
    <Teleport to="body">
      <div v-if="createModalOpen" class="modal" role="dialog" aria-modal="true" aria-labelledby="create-key-title">
        <div class="modal__backdrop" @click="closeCreateModal" />
        <div class="modal__card" role="document">
          <div class="modal__head">
            <h2 id="create-key-title" class="modal__title">Create API Key</h2>
            <button type="button" class="modal__close" aria-label="Close" :disabled="creating" @click="closeCreateModal">
              ×
            </button>
          </div>
          <form class="modal__form" @submit.prevent="submitCreate">
            <div class="field">
              <label for="key-name" class="field__label">Name</label>
              <input id="key-name" v-model="formName" class="field__input" type="text" required :disabled="creating" maxlength="255" />
              <p class="field__hint">A short label to identify where this key is used.</p>
            </div>

            <p v-if="error" class="error" role="alert">{{ error }}</p>
            <div class="modal__actions">
              <button type="button" class="btn" :disabled="creating" @click="closeCreateModal">
                Cancel
              </button>
              <button type="submit" class="btn btn--primary" :disabled="creating">
                {{ creating ? 'Creating…' : 'Create Key' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Rotate confirmation modal -->
    <Teleport to="body">
      <div v-if="confirmRotateKey" class="modal" role="dialog" aria-modal="true" aria-labelledby="rotate-key-title">
        <div class="modal__backdrop" @click="closeRotateConfirm" />
        <div class="modal__card" role="document">
          <div class="modal__head">
            <h2 id="rotate-key-title" class="modal__title">Rotate this API key?</h2>
            <button type="button" class="modal__close" aria-label="Close" :disabled="isRotating" @click="closeRotateConfirm">
              ×
            </button>
          </div>
          <p class="rotate-confirm__body">
            Rotating this key will revoke the current key and generate a new
            secret. Applications using the current key will stop working.
          </p>

          <p v-if="rotateError" class="error" role="alert">{{ rotateError }}</p>
          <div class="modal__actions">
            <button type="button" class="btn" :disabled="isRotating" @click="closeRotateConfirm">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn--danger"
              :disabled="isRotating"
              @click="submitRotate(confirmRotateKey)"
            >
              {{ rotatingId ? 'Rotating…' : 'Rotate key' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </ConsoleShell>
</template>

<style scoped>
/**
 * Page container.
 *
 * The shell already caps the column at 64rem. This narrows the API page
 * further so cards do not stretch across a wide viewport, and keeps it left
 * aligned with the rest of the page content.
 */
.page {
  max-width: 60rem;
}

/* ── Page header ─────────────────────────────────────────────── */

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.75rem;
}

.head__text {
  min-width: 0;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.page-subtitle {
  color: var(--muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

/* ── One-time secret card ────────────────────────────────────── */

.reveal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.25rem 1.375rem 1rem;
  margin-bottom: 2rem;
}

.reveal__title {
  font-size: 1.3125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.reveal__warn {
  color: var(--muted);
  font-size: 0.875rem;
  line-height: 1.6;
  margin-top: 0.4375rem;
  max-width: 44rem;
}

.secret {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: 1rem;
}

/* Monospace, darker than the card so the secret reads as a distinct object. */
.secret__value {
  flex: 1;
  min-width: 0;
  display: block;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.625rem 0.875rem;
  color: var(--fg);
  font-size: 0.8125rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  -webkit-user-select: all;
  user-select: all;
}

.secret > .btn {
  flex: none;
}

/* Confirms the copy actually happened. */
.btn--ok {
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.35);
}

.btn--ok:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.5);
  color: #6ee7b7;
}

.reveal__meta {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  margin-top: 0.875rem;
}

.reveal__label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.reveal__value {
  font-size: 0.9375rem;
  font-weight: 600;
}

.reveal__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.reveal__actions > .btn {
  padding: 0.3125rem 0.75rem;
  font-size: 0.8125rem;
}

/* ── Key list ────────────────────────────────────────────────── */

.section-title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 0.875rem;
}

.keys {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.key-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.125rem 1.25rem;
}

.key-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.key-card__name {
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  min-width: 0;
  overflow-wrap: anywhere;
}

/*
 * Inline rename.
 *
 * The affordances mirror the workspace rename on the overview page: the pencil
 * is always in the layout and only fades in on hover or focus, so revealing it
 * causes no layout shift, and saving is reachable from Enter or ✓ alike.
 */
.key-name {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.key-name .pencil {
  opacity: 0;
  font-size: 0.8125rem;
  color: var(--muted);
  transition: opacity 0.15s ease;
  /* The whole name is the click target, so the icon must not swallow clicks. */
  pointer-events: none;
}

.key-name:hover .pencil,
.key-name:focus .pencil {
  opacity: 0.6;
}

.key-name__text {
  line-height: 1.2;
}

.inline-edit {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  min-width: 0;
}

/* Sized against .key-card__name rather than the larger page-title input the
   workspace rename uses, so the card does not grow while editing. */
.edit-input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--fg);
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  height: 1.75rem;
  min-width: 10rem;
  max-width: 18rem;
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
  flex: none;
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
  line-height: 1;
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
  flex-basis: 100%;
  font-size: 0.75rem;
  color: #fca5a5;
}

.badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.badge--active {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.28);
}

/* Deliberately low emphasis: a revoked key is inert, not alarming. */
.badge--revoked {
  color: var(--muted);
  background: rgba(148, 163, 184, 0.12);
  border-color: var(--border);
}

.key-card__mask {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: var(--muted);
  overflow-wrap: anywhere;
}

/* Divider keeps the metadata visibly separate from the key identity above. */
.key-card__foot {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  align-items: end;
  gap: 0.875rem 2rem;
  margin-top: 1rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--border);
}

.key-card__field {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  min-width: 0;
}

.key-card__label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.key-card__value {
  font-size: 0.8125rem;
  font-weight: 500;
}

.key-card__revoke {
  justify-self: end;
  padding: 0.3125rem 0.625rem;
  font-size: 0.75rem;
}

/* Group Rotate + Revoke at the right edge of the foot row, with a gap that
   keeps them visually distinct without forcing the card to grow. */
.key-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.key-card__rotate {
  padding: 0.3125rem 0.625rem;
  font-size: 0.75rem;
}

/* ── Empty / status text ─────────────────────────────────────── */

.empty {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.75rem 1.375rem;
}

.empty__title {
  font-size: 0.9375rem;
  font-weight: 600;
}

.empty__hint {
  color: var(--muted);
  font-size: 0.875rem;
  line-height: 1.55;
  max-width: 34rem;
}

.muted {
  color: var(--muted);
  font-size: 0.875rem;
}

.error {
  color: #fca5a5;
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

/* ── Create modal ────────────────────────────────────────────── */

.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal__card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  padding: 1.5rem;
  max-width: 32rem;
  width: 100%;
  margin: 1rem;
}

.modal__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.modal__title {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.modal__close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--muted);
  font-size: 1.125rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.modal__close:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--border-strong);
  color: var(--fg);
}

.modal__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal__form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field__label {
  font-size: 0.875rem;
  font-weight: 600;
}

.field__input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  color: var(--fg);
  font-family: inherit;
  font-size: 0.875rem;
}

.field__input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
}

.field__input:disabled {
  opacity: 0.6;
}

.field__hint {
  font-size: 0.75rem;
  color: var(--muted);
  line-height: 1.5;
}

.rotate-confirm__body {
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--fg);
  margin: 0;
  max-width: 30rem;
}

/* ── Responsive ──────────────────────────────────────────────── */

@media (max-width: 40rem) {
  .reveal {
    padding: 1.125rem;
  }

  .key-card {
    padding: 1rem;
  }

  .secret {
    flex-direction: column;
    align-items: stretch;
  }

  .secret > .btn {
    align-self: flex-start;
  }

  .key-card__foot {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.875rem 1.25rem;
  }

  .key-card__actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  /* Keep compact buttons comfortably tappable on touch screens. */
  .key-card__rotate,
  .key-card__revoke,
  .reveal__actions > .btn {
    min-height: 2.25rem;
  }
}
</style>
