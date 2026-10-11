import type { Content } from "./types";

/**
 * Bahasa Indonesia content for the Zonatic landing page.
 *
 * Terminology follows the project glossary:
 *   - "Location Intelligence", "API", "GeoJSON", "KML" dan "polygon"
 *     dipertahankan dalam bentuk aslinya (Inggris) ketika translasi akan
 *     terdengar janggal di konteks teknologi modern.
 *   - "Zona" adalah istilah produk resmi (bukan "territory") dan dipakai
 *     konsisten di seluruh halaman.
 *   - "Data Lokasi", "Wilayah Administratif", "Polygon Custom",
 *     "Infrastruktur Geografis" dipakai secara konsisten.
 */
export const id: Content = {
  locale: "id",
  htmlLang: "id-ID",
  meta: {
    title: "Zonatic — Location API untuk Indonesia",
    description:
      "Akses data wilayah administratif, kode pos, dan informasi lokasi Indonesia melalui satu API. Cepat, akurat, dan siap digunakan.",
    ogLocale: "id_ID",
    siteUrl: "https://www.zonatic.id",
    consoleUrl: "https://console.zonatic.id",
  },
  common: {
    skipToContent: "Lewati ke konten",
    signIn: "Masuk",
    getStarted: "Mulai Integrasi",
    viewDocumentation: "Lihat Dokumentasi",
    placeholderRouteNote:
      "Rute placeholder akan kembali ke dashboard setelah dokumentasi dan playground tersedia.",
    illustrativeNumbers:
      "Angka-angka di atas bersifat ilustrasi untuk demonstrasi desain.",
    stepLabels: ["", "Langkah 1", "Langkah 2", "Langkah 3", "Langkah 4"],
    notFoundHeading: "Halaman tidak ditemukan",
    notFoundBody:
      "Halaman yang Anda cari tidak ada atau sudah dipindahkan.",
    notFoundCta: "Kembali ke beranda",
  },
  nav: {
    brand: "Zonatic",
    signIn: "Masuk",
    getStarted: "Mulai Integrasi",
    mobileOpen: "Buka menu",
    mobileClose: "Tutup menu",
    links: [
      { label: "Fitur", href: "#features" },
      { label: "Data", href: "#data-sources" },
      { label: "Use Case", href: "#use-cases" },
      { label: "Dokumentasi", href: "/docs" },
      { label: "Harga", href: "#pricing" },
    ],
  },
  hero: {
    eyebrow: "LOCATION API FOR INDONESIA",
    headline: "Data lokasi Indonesia,",
    headlineHighlight: "siap untuk aplikasi Anda.",
    description:
      "Akses data wilayah administratif, kode pos, dan informasi lokasi Indonesia melalui satu API yang cepat, akurat, dan siap digunakan.",
    primaryCta: "Mulai Integrasi",
    secondaryCta: "Jelajahi Data",
    stats: [
      { label: "Provinsi", value: "38" },
      { label: "Kabupaten/Kota", value: "514" },
      { label: "Kecamatan", value: "7.285" },
      { label: "Kelurahan/Desa", value: "83.762" },
    ],
    imageAlt:
      "Peta Indonesia dengan batas wilayah administratif yang ditampilkan di atas background navy.",
  },
  problem: {
    eyebrow: "MASALAH YANG DISELESAIKAN",
    headline: "Data lokasi seharusnya tidak menjadi beban setiap developer.",
    description:
      "Mengumpulkan dataset wilayah administratif Indonesia, menyusun hierarki provinsi–kabupaten–kecamatan–kelurahan, menghubungkan kode pos ke wilayah, dan memelihara konsistensi data memerlukan waktu dan biaya yang besar. Zonatic menghilangkan kompleksitas tersebut dengan menyediakan data lokasi Indonesia yang terstandarisasi melalui satu API.",
    imageAlt:
      "Visualisasi hubungan koordinat GPS, batas wilayah administratif, dan kode pos yang terhubung dalam satu sistem terpadu.",
  },
  dataSources: {
    eyebrow: "SUMBER DATA",
    headline: "Dari sumber data terpercaya.",
    description:
      "Zonatic membangun data lokasi dari sumber resmi yang dapat diverifikasi, bukan dari data komunitas yang tidak terverifikasi.",
    sources: [
      {
        title: "Data Wilayah Administratif",
        description:
          "Batas wilayah provinsi, kabupaten/kota, kecamatan, dan kelurahan/desa dari data resmi Kementerian Dalam Negeri (Kemendagri) melalui region-id.",
        iconKey: "map",
        verified: true,
      },
      {
        title: "Data Kode Pos Indonesia",
        description:
          "Kode pos Indonesia dari Pos Indonesia yang dipetakan ke wilayah administratif melalui postal-code-id.",
        iconKey: "mail",
        verified: true,
      },
      {
        title: "Informasi Geografis",
        description:
          "Koordinat batas wilayah, titik tengah wilayah, dan metadata geografis untuk mendukung reverse geocoding dan analisis spasial.",
        iconKey: "globe",
        verified: true,
      },
    ],
  },
  features: {
    eyebrow: "FITUR UTAMA",
    headline: "Satu API. Beragam kebutuhan.",
    description:
      "Zonatic menyediakan fondasi data lokasi yang lengkap untuk membangun aplikasi berbasis lokasi di Indonesia.",
    features: [
      {
        title: "Data Wilayah Administratif",
        description:
          "Akses hierarki administratif Indonesia lengkap: 38 provinsi, 514 kabupaten/kota, 7.285 kecamatan, dan 83.762 kelurahan/desa dengan kode kanonik yang stabil.",
        iconKey: "map",
      },
      {
        title: "Kode Pos Indonesia",
        description:
          "Pencarian kode pos berdasarkan wilayah atau koordinat, dengan relasi many-to-many ke wilayah administratif untuk akurasi maksimal.",
        iconKey: "mail",
      },
      {
        title: "Reverse Geocoding",
        description:
          "Ubah koordinat GPS (latitude/longitude) menjadi konteks wilayah administratif lengkap: provinsi, kabupaten/kota, kecamatan, dan kelurahan/desa.",
        iconKey: "navigation",
      },
      {
        title: "Developer Friendly",
        description:
          "REST API dengan dokumentasi OpenAPI, SDK untuk berbagai bahasa, response time < 100ms, dan uptime 99.9%.",
        iconKey: "code",
      },
    ],
  },
  apiExample: {
    eyebrow: "CONTOH API",
    headline: "Integrasi dalam hitungan menit.",
    description:
      "REST API sederhana dengan response JSON standar. Dokumentasi lengkap tersedia di portal developer.",
    tabs: [
      {
        label: "cURL",
        code: `curl -H "Authorization: Bearer ZN_API_KEY" \\
  "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.19&longitude=106.81"`,
      },
      {
        label: "JavaScript",
        code: `const response = await fetch(
  "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.19&longitude=106.81",
  {
    headers: {
      "Authorization": "Bearer ZN_API_KEY",
      "Content-Type": "application/json"
    }
  }
);
const data = await response.json();`,
      },
      {
        label: "Python",
        code: `import requests

response = requests.get(
    "https://api.zonatic.id/v1/reverse-geocode",
    params={"latitude": -6.19, "longitude": 106.81},
    headers={"Authorization": "Bearer ZN_API_KEY"}
)
data = response.json()`,
      },
    ],
    response: {
      label: "Response",
      json: `{
  "latitude": -6.19,
  "longitude": 106.81,
  "matched": true,
  "address": {
    "province": {
      "code": "31",
      "name": "DKI Jakarta",
      "level": 1
    },
    "regency_or_city": {
      "code": "3171",
      "name": "Kota Administrasi Jakarta Pusat",
      "level": 2
    },
    "district": {
      "code": "317101",
      "name": "Kecamatan Gambir",
      "level": 3
    },
    "village_or_ward": {
      "code": "3171011001",
      "name": "Kelurahan Gambir",
      "level": 4
    }
  },
  "areas": [
    {"code": "31", "name": "DKI Jakarta", "level": "province"},
    {"code": "3171", "name": "Kota Administrasi Jakarta Pusat", "level": "regency"},
    {"code": "317101", "name": "Kecamatan Gambir", "level": "district"},
    {"code": "3171011001", "name": "Kelurahan Gambir", "level": "village"}
  ]
}`,
    },
  },
  useCases: {
    eyebrow: "USE CASE",
    headline: "Mendukung berbagai jenis aplikasi.",
    description:
      "Zonatic mendukung berbagai industri yang memerlukan data lokasi Indonesia yang akurat dan terstandarisasi.",
    cases: [
      {
        title: "E-commerce",
        description:
          "Validasi alamat pengiriman, penghitungan ongkir otomatis, dan pengecekan cakupan area layanan berdasarkan kode pos dan wilayah administratif.",
        iconKey: "shopping-cart",
      },
      {
        title: "Layanan On-Demand",
        description:
          "Pencocokan driver/kurir dengan pesanan berbasis zona, validasi area layanan, dan estimasi waktu tempuh berbasis wilayah administratif.",
        iconKey: "navigation",
      },
      {
        title: "Analitik & Riset",
        description:
          "Analisis demografis per wilayah, pemetaan kepadatan pendudung, analisis pasar berbasis kode pos, dan visualisasi data spasial.",
        iconKey: "bar-chart",
      },
      {
        title: "Sistem Internal",
        description:
          "Validasi data master lokasi cabang/outlet, manajemen zona operasional, dan integrasi dengan sistem CRM/ERP berbasis lokasi.",
        iconKey: "building",
      },
    ],
    disclaimer:
      "Use case di atas adalah contoh penerapan potensial, bukan jaminan fitur yang disediakan Zonatic secara langsung.",
  },
  finalCta: {
    eyebrow: "LOCATION API FOR INDONESIA",
    headline: "Bangun aplikasi Anda dengan data lokasi Indonesia.",
    description:
      "Mulai integrasi hari ini dan akses data wilayah administratif, kode pos, dan informasi lokasi Indonesia melalui satu API yang cepat dan andal.",
    primaryCta: "Mulai Integrasi",
    secondaryCta: "Lihat Dokumentasi",
  },
  footer: {
    tagline: "Location API untuk Indonesia.",
    copyrightYear: "2026",
    copyright: "Hak cipta dilindungi.",
    columns: [
      {
        title: "Produk",
        links: [
          { label: "Data Wilayah Administratif" },
          { label: "Kode Pos Indonesia" },
          { label: "Reverse Geocoding" },
          { label: "Developer Tools" },
        ],
      },
      {
        title: "Developer",
        links: [
          { label: "Dokumentasi API", href: "/docs" },
          { label: "API Reference" },
          { label: "Changelog" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Syarat dan Ketentuan", href: "/terms" },
          { label: "Kebijakan Privasi", href: "/privacy" },
        ],
      },
    ],
  },
};