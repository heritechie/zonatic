import { DEFAULT_LOCALE, LOCALES, type Content, type Locale } from "./types";
import { id } from "./id";
import { en } from "./en";

/**
 * Content map indexed by locale.
 *
 * Every locale that the build emits MUST be a key here. Adding a new
 * locale requires (1) registering it in LOCALES, (2) writing the content
 * file, and (3) importing it below.
 */
const CONTENT: Record<Locale, Content> = { id, en };

/**
 * Resolve the content tree for a given locale string.
 *
 * Falls back to the default locale when the value is not one of the
 * registered locales. The function never throws; callers can rely on
 * a non-null Content return.
 */
export function getContent(locale: string | undefined | null): Content {
  if (locale && (locale as Locale) in CONTENT) {
    return CONTENT[locale as Locale];
  }
  return CONTENT[DEFAULT_LOCALE];
}

export { LOCALES, DEFAULT_LOCALE };
export type { Content, Locale };
export * from "./types";