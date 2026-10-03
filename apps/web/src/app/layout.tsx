import "./globals.css";

/**
 * Root layout is intentionally minimal.
 *
 * The actual `<html lang>` and `<body>` tags live in
 * `app/[locale]/layout.tsx` so they can be set dynamically per
 * locale. Next.js 16 allows this pattern when the root layout does
 * not contain `<html>` or `<body>` and a nested dynamic layout
 * owns them instead.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}