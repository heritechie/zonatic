import type { Content } from "./types";

/**
 * Bahasa Indonesia content for the Zonatic landing page.
 *
 * Terminology follows the project glossary:
 *   - "Location Intelligence", "Location-aware", "API", "GeoJSON", "KML",
 *     "polygon", dan "territory" dipertahankan dalam bentuk aslinya (Inggris)
 *     ketika translasi akan terdengar janggal di konteks teknologi modern.
 *   - "Data Lokasi", "Wilayah Administratif", "Polygon Custom",
 *     "Infrastruktur Geografis" dipakai secara konsisten.
 */
export const id: Content = {
  locale: "id",
  htmlLang: "id-ID",
  meta: {
    title: "Zonatic — Infrastruktur Location Intelligence untuk Indonesia",
    description:
      "Pahami lokasi, tentukan territory, dan bangun aplikasi yang sadar lokasi dengan infrastruktur geografis untuk Indonesia.",
    ogLocale: "id_ID",
    siteUrl: "https://www.zonatic.id",
  },
  common: {
    skipToContent: "Lewati ke konten",
    signIn: "Masuk",
    getStarted: "Mulai sekarang",
    viewDocumentation: "Lihat dokumentasi",
    placeholderRouteNote:
      "Rute placeholder akan kembali ke dashboard setelah dokumentasi dan playground tersedia.",
    illustrativeNumbers:
      "Angka-angka di atas bersifat illustratif untuk demonstrasi desain.",
    stepLabels: ["", "Langkah 1", "Langkah 2", "Langkah 3", "Langkah 4"],
    notFoundHeading: "Halaman tidak ditemukan",
    notFoundBody:
      "Halaman yang Anda cari tidak ada atau sudah dipindahkan.",
    notFoundCta: "Kembali ke beranda",
  },
  nav: {
    brand: "Zonatic",
    signIn: "Masuk",
    getStarted: "Mulai sekarang",
    mobileOpen: "Buka menu",
    mobileClose: "Tutup menu",
    links: [
      { label: "Produk", href: "#product" },
      { label: "Solusi", href: "#use-cases" },
      { label: "Harga", href: "#pricing" },
      { label: "Dokumentasi", href: "/docs" },
    ],
  },
  hero: {
    eyebrow: "LOCATION INTELLIGENCE UNTUK INDONESIA",
    headlineLine1: "Ubah data lokasi Anda",
    headlineLine2: "menjadi",
    headlineHighlight: "insight yang nyata.",
    description:
      "Pahami lokasi, tentukan territory, dan bangun aplikasi yang sadar lokasi dengan data geografis Indonesia yang akurat dan terpercaya.",
    primaryCta: "Mulai sekarang",
    secondaryCta: "Lihat dokumentasi",
    ctaFineprint: "Tanpa kartu kredit · Akses API langsung · Dokumentasi terbuka",
    pillars: [
      {
        label: "Data Lokasi",
        description:
          "Alamat, koordinat, dan data lokasi Anda.",
        iconKey: "database",
      },
      {
        label: "Geographic Intelligence",
        description:
          "Enrich, klarifikasi, dan pahami konteks Anda.",
        iconKey: "globe",
      },
      {
        label: "Territory",
        description:
          "Buat wilayah kerja dengan data administratif atau polygon custom.",
        iconKey: "map",
      },
      {
        label: "API",
        description:
          "Gunakan location intelligence di aplikasi Anda.",
        iconKey: "code",
      },
    ],
    map: {
      searchPlaceholder: "Cari lokasi...",
      zoomIn: "Perbesar",
      zoomOut: "Perkecil",
      reset: "Reset tampilan",
      areaTitle: "Kebayoran Baru",
      areaCountLabel: "lokasi",
      summaryCard: {
        totalLabel: "lokasi ditampilkan",
        legend: [
          { label: "Customer", count: 2421, dotClass: "bg-emerald-600" },
          { label: "Outlet", count: 312, dotClass: "bg-emerald-300" },
          { label: "Lainnya", count: 109, dotClass: "bg-slate-400" },
        ],
        disclaimer:
          "Angka-angka di atas bersifat ilustratif untuk demonstrasi desain.",
      },
    },
  },
  dataToIntel: {
    eyebrow: "DARI DATA KE LOCATION INTELLIGENCE",
    headline: "Bawa data Anda.",
    headlineHighlight: "Letakkan di peta.",
    description:
      "Upload data customer, outlet, atau lokasi lainnya. Zonatic membantu memvalidasi lokasi, memperkaya data dengan geografi Indonesia, lalu memvisualisasikan dan menganalisisnya.",
    steps: [
      {
        title: "Upload data lokasi",
        description:
          "Gunakan CSV, Excel, atau integrasi API untuk memasukkan data customer, outlet, atau titik lokasi Anda.",
        mockRows: [
          { id: "1", name: "Toko A", address: "Jl. Sudirman No. 1" },
          { id: "2", name: "Toko B", address: "Jl. Gatot Subroto..." },
          { id: "3", name: "Toko C", address: "Jl. Ahmad Yani..." },
        ],
      },
      {
        title: "Zonatic memvalidasi dan memperkaya",
        description:
          "Dapatkan koordinat, wilayah administratif, kode pos, dan atribusi lokasi untuk setiap record.",
        stats: {
          total: "12.431 record diproses",
          items: [
            { label: "Validasi alamat", iconKey: "check" },
            { label: "Enrichment lokasi", iconKey: "check" },
            { label: "Mapping wilayah", iconKey: "check" },
            { label: "Deteksi duplikat", iconKey: "check" },
          ],
        },
      },
      {
        title: "Visualisasikan dan analisis",
        description:
          "Lihat data di peta, analisis cakupan, dan temukan insight.",
        map: {
          areaName: "Area Analisis",
          insideLabel: "di dalam",
          outsideLabel: "di luar",
        },
      },
    ],
  },
  territories: {
    eyebrow: "KELOLA WILAYAH DENGAN MUDAH",
    headline: "Tentukan territory Anda.",
    description:
      "Buat wilayah kerja menggunakan wilayah administratif Indonesia atau gambar batas Anda sendiri.",
    createCta: "Buat territory",
    ctaFootnote:
      "Demonstrasi di landing page saja — pengelolaan territory sebenarnya ada di Console.",
    cards: [
      {
        title: "Wilayah Administratif",
        description:
          "Pilih provinsi, kota, kecamatan, atau desa dari data resmi Indonesia.",
      },
      {
        title: "Polygon Custom",
        description:
          "Gambar area sendiri atau import GeoJSON data tersebut.",
      },
      {
        title: "Gabungkan dan Kelola",
        description:
          "Kombinasikan beberapa area administratif dan polygon custom dalam satu territory.",
      },
    ],
    cardHelpers: [
      "Dari wilayah administratif resmi",
      "Polygon yang Anda gambar sendiri",
      "Gabungan keduanya dalam satu territory",
    ],
    polygonSupportedLabel: "GeoJSON / KML didukung",
    adminTree: {
      label: "Provinsi DKI Jakarta",
      children: {
        label: "Jakarta Pusat",
        grandchildren: [
          "Jakarta Pusat",
          "Jakarta Utara",
          "Jakarta Selatan",
          "Jakarta Timur",
        ],
      },
    },
    summary: {
      areaName: "Territory Area (3)",
      badge: "Aktif",
      areasLabel: "area",
      locationsLabel: "lokasi",
      items: [
        { name: "Jakarta Pusat", count: 128 },
        { name: "Jakarta Selatan", count: 342 },
        { name: "Custom Area 1", count: 76 },
      ],
    },
  },
  api: {
    eyebrow: "UNTUK DEVELOPER",
    headline: "Dibangun untuk aplikasi Anda.",
    description:
      "Gunakan API Zonatic untuk menemukan lokasi, memeriksa territory, dan memperkaya location intelligence ke dalam aplikasi Anda.",
    viewDocs: "Lihat dokumentasi",
    tryPlayground: "Coba di Playground",
    placeholderNote:
      "Endpoint di bawah adalah endpoint yang benar-benar berjalan di Zonatic saat ini.",
    codeTabs: [
      {
        label: "cURL",
        language: "bash",
        code: `# Reverse geocode
curl -X GET "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.2088&longitude=106.8456" \\
  -H "Authorization: Bearer YOUR_API_KEY"

{
  "latitude": -6.2088,
  "longitude": 106.8456,
  "matched": true,
  "address": {
    "province":    "DKI Jakarta",
    "city":        "Jakarta Pusat",
    "district":    "Tanah Abang",
    "postal_code": "10220"
  },
  "areas": [...]
}`,
      },
      {
        label: "JavaScript",
        language: "javascript",
        code: `const res = await fetch(
  "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.2088&longitude=106.8456",
  {
    headers: { Authorization: "Bearer YOUR_API_KEY" }
  }
);
const data = await res.json();
console.log(data.address.city); // Jakarta Pusat`,
      },
      {
        label: "Python",
        language: "python",
        code: `import requests

res = requests.get(
    "https://api.zonatic.id/v1/reverse-geocode",
    params={"latitude": -6.2088, "longitude": 106.8456},
    headers={"Authorization": "Bearer YOUR_API_KEY"},
)
data = res.json()
print(data["address"]["city"])  # Jakarta Pusat`,
      },
    ],
    endpointListTitle: "Endpoint populer",
    endpointListDescription:
      "Endpoint yang paling sering dipakai untuk mulai menggunakan Zonatic.",
    endpointListItems: [
      { method: "GET", path: "/v1/reverse-geocode", auth: false },
      { method: "GET", path: "/v1/areas/search", auth: true },
      { method: "GET", path: "/v1/areas/autocomplete", auth: false },
      { method: "GET", path: "/v1/postal-codes/search", auth: true },
    ],
    seeAllCta: "Lihat semua endpoint",
  },
  useCases: {
    eyebrow: "UNTUK TIM DI DUNIA NYATA",
    headline: "Location intelligence untuk berbagai industri.",
    description:
      "Bantu tim di berbagai industri mengambil keputusan yang lebih baik dengan location intelligence.",
    disclaimer:
      "Zonatic bukan aplikasi collection management, sales, logistik, atau insurance. Zonatic menyediakan infrastruktur geografis yang dapat dipakai oleh aplikasi-aplikasi tersebut.",
    cases: [
      {
        title: "Collection & Lending",
        description:
          "Petakan customer, tentukan area penagihan, dan tingkatkan efisiensi lapangan.",
        iconKey: "coins",
      },
      {
        title: "Sales & Distribution",
        description:
          "Rencanakan territory, petakan outlet, dan organisasikan cakupan.",
        iconKey: "store",
      },
      {
        title: "Service Operations",
        description:
          "Tentukan area layanan dan kelola operasi lapangan.",
        iconKey: "wrench",
      },
      {
        title: "Insurance",
        description:
          "Pahami area risiko dan kelola cakupan cabang.",
        iconKey: "shield-check",
      },
      {
        title: "Retail & FMCG",
        description:
          "Petakan outlet, rencanakan distribusi, dan analisis jangkauan pasar.",
        iconKey: "shopping-basket",
      },
      {
        title: "Logistik",
        description:
          "Tentukan area pengiriman dan optimalkan coverage.",
        iconKey: "truck",
      },
    ],
  },
  finalCta: {
    eyebrow: "MULAI HARI INI",
    headline: "Jadikan data Anda location-aware.",
    description:
      "Bangun produk yang lebih cerdas dengan infrastruktur geografis untuk Indonesia.",
    primaryCta: "Mulai sekarang",
    secondaryCta: "Hubungi kami",
  },
  footer: {
    tagline: "Infrastruktur location intelligence untuk Indonesia.",
    copyright: "Hak cipta dilindungi.",
    jurisdiction: "Infrastruktur location intelligence untuk Indonesia.",
    legalLinks: ["Kebijakan Privasi", "Syarat Layanan"],
    socials: [
      {
        label: "GitHub",
        href: "https://github.com/heritechie/zonatic",
        iconKey: "github",
      },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/zonatic",
        iconKey: "linkedin",
      },
    ],
    columns: [
      {
        title: "Produk",
        links: [
          { label: "Location Intelligence", href: "#hero" },
          { label: "Territory", href: "#territories" },
          { label: "Data Lokasi", href: "#data" },
          { label: "API", href: "#api" },
        ],
      },
      {
        title: "Solusi",
        links: [
          { label: "Perusahaan", href: "#use-cases" },
          { label: "Startup", href: "#use-cases" },
          { label: "Developer", href: "#use-cases" },
          { label: "Operasi Lapangan", href: "#use-cases" },
        ],
      },
      {
        title: "Dokumentasi",
        links: [
          { label: "Perusahaan", href: "/docs" },
          { label: "Tentang", href: "/about" },
          { label: "API Reference", href: "/docs" },
          { label: "Contoh", href: "/docs" },
        ],
      },
      {
        title: "Perusahaan",
        links: [
          { label: "Tentang", href: "/about" },
          { label: "Privasi", href: "/privacy" },
          { label: "Syarat & Ketentuan", href: "/terms" },
        ],
      },
    ],
  },
};