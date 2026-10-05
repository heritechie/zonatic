<script setup lang="ts">
import { computed, ref, watch } from 'vue';

/**
 * Circular profile image with a guaranteed initial fallback.
 *
 * The Google avatar URL is best-effort: `user_metadata.avatar_url` can be
 * absent, can be a non-HTTP value from a provider we do not control, and it can
 * 404 or fail to decode in the browser even when it is present. Any of those
 * used to render the browser's broken-image glyph in the top bar, which reads
 * as a rendering bug rather than a missing avatar.
 *
 * This component collapses all of those cases into one of two states:
 *   - a real image, when a usable URL has loaded successfully;
 *   - the initial, otherwise.
 *
 * It only reads the URL it is given. No profile image data is fetched,
 * transformed, cached, or persisted, and the authentication flow is untouched.
 */

const props = withDefaults(
  defineProps<{
    /** Candidate image URL. Empty, null, or malformed values fall back. */
    src?: string | null;
    /** Full name used to derive the initial, e.g. "Heriyanto" → "H". */
    name?: string | null;
    /** Rendered size, matching the existing `1.75rem` avatar in the shell. */
    size?: string;
  }>(),
  { src: null, name: null, size: '1.75rem' },
);

/**
 * Flipped on an `error` event, and reset whenever `src` changes.
 *
 * Reset matters: the same component instance can be reused for a new session
 * (sign out then sign in as someone else). Without the reset, a previously
 * failed URL would keep the fallback permanently for the next user.
 */
const imageFailed = ref(false);

watch(
  () => props.src,
  () => {
    imageFailed.value = false;
  },
);

/**
 * Whether the URL is worth handing to `<img>`.
 *
 * `new URL` throws on anything that is not an absolute URL, which rules out
 * empty strings, bare hostnames, `null`/`undefined`, and protocol-relative
 * `//host/path` values that resolve against the current page rather than a
 * real image source. Only `http:` and `https:` survive.
 */
const usableSrc = computed<string | null>(() => {
  const raw = props.src?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? raw : null;
  } catch {
    return null;
  }
});

const showImage = computed(() => usableSrc.value !== null && !imageFailed.value);

/**
 * First character of the display name, uppercased.
 *
 * Falls back to a neutral glyph when no name is supplied, so the circle is
 * never empty. Whitespace is trimmed first so a name that is only spaces does
 * not render an invisible initial.
 *
 * Note that the caller supplies the name already resolved (the auth store
 * falls back to the email address, then to a generic label); this component
 * only adds the empty-string guard.
 */
const initial = computed(() => {
  const source = (props.name ?? '').trim();
  if (!source) return '?';
  // Spread iterates code points; `charAt` iterates UTF-16 code units. A name
  // starting with an emoji stores that glyph as a surrogate pair, so `charAt`
  // would return the high surrogate alone and the browser would paint a
  // replacement character — the same broken glyph this component exists to
  // prevent, just in text form instead of image form.
  const [first] = [...source];
  return first.toUpperCase();
});
</script>

<template>
  <img
    v-if="showImage"
    :src="usableSrc ?? undefined"
    :alt="''"
    class="user-avatar"
    :style="{ width: size, height: size }"
    loading="lazy"
    decoding="async"
    referrerpolicy="no-referrer"
    @error="imageFailed = true"
  />
  <span
    v-else
    class="user-avatar user-avatar--initial"
    :style="{ width: size, height: size }"
    aria-hidden="true"
  >
    {{ initial }}
  </span>
</template>

<style scoped>
.user-avatar {
  border-radius: 9999px;
  flex: none;
  object-fit: cover;
  background: var(--surface);
}

/*
 * The initial keeps the `--surface-hover` fill and muted colour that the
 * previous inline fallback used, so the two render identically and the control
 * still reads as an avatar when no photo loaded. `user-select: none` keeps a
 * double-click in the header from selecting the letter.
 */
.user-avatar--initial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-hover);
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
  user-select: none;
}
</style>