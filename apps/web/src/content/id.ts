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
      { label: "Dokumentasi", href: "#api-example" },
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
          "Batas wilayah provinsi, kabupaten/kota, kecamatan, dan kelurahan/desa dari data resmi Kementerian Dalam Negeri (Kemendagri).",
        iconKey: "map",
        verified: true,
      },
      {
        title: "Data Kode Pos Indonesia",
        description:
          "Kode pos Indonesia dari Pos Indonesia yang dipetakan ke wilayah administratif.",
        iconKey: "mail",
        verified: true,
      },
      {
        title: "Data Geospasial",
        description:
          "Data geospasial Indonesia yang bersumber dari Badan Informasi Geospasial (BIG).",
        iconKey: "globe",
        verified: false,
      },
    ],
    labels: {
      verified: "Sumber terverifikasi",
    },
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
          "REST API dengan autentikasi menggunakan API key dan dokumentasi OpenAPI yang tersedia di setiap endpoint.",
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
        code: `curl -H "Authorization: Bearer $ZONATIC_API_KEY" \\
  "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.19&longitude=106.81"`,
      },
      {
        label: "Node.js",
        code: `// Set environment variable first:
//   export ZONATIC_API_KEY="your_api_key"
const url = "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.19&longitude=106.81";

const response = await fetch(url, {
  headers: {
    "Authorization": \`Bearer \${process.env.ZONATIC_API_KEY}\`,
  },
});

const data = await response.json();`,
      },
      {
        label: "PHP",
        code: `<?php
// Set environment variable first:
//   export ZONATIC_API_KEY="your_api_key"

$url = "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.19&longitude=106.81";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . getenv("ZONATIC_API_KEY"),
]);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);`,
      },
      {
        label: "Go",
        code: `package main

import (
\t"encoding/json"
\t"fmt"
\t"io"
\t"net/http"
\t"os"
)

// Set environment variable first:
//   export ZONATIC_API_KEY="your_api_key"

func main() {
\turl := "https://api.zonatic.id/v1/reverse-geocode?latitude=-6.19&longitude=106.81"
\treq, _ := http.NewRequest("GET", url, nil)
\treq.Header.Set("Authorization", "Bearer "+os.Getenv("ZONATIC_API_KEY"))

\tresp, err := http.DefaultClient.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tbody, _ := io.ReadAll(resp.Body)
\tvar data map[string]interface{}
\tjson.Unmarshal(body, &data)
\tfmt.Println(data)
}`,
      },
    ],
    envNote: "Atur environment variable ZONATIC_API_KEY sebelum menjalankan contoh di atas.",
    previewNote: "Preview singkat — response lengkap berisi lebih banyak field.",
    response: {
      label: "Response",
      json: `{
  "latitude": -6.19,
  "longitude": 106.81,
  "matched": true,
  "address": {
    "province": { "code": "31", "name": "DKI Jakarta", "level": 1 },
    "regency_or_city": { "code": "3171", "name": "Kota Administrasi Jakarta Pusat", "level": 2 },
    "district": { "code": "317101", "name": "Kecamatan Gambir", "level": 3 },
    "village_or_ward": { "code": "3171011001", "name": "Kelurahan Gambir", "level": 4 }
  },
  "areas": [
    { "code": "31", "name": "DKI Jakarta", "level": 1 },
    ...
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
  pricing: {
    eyebrow: "HARGA & PEMBAYARAN",
    headline: "Pakai API, bayar sesuai pemakaian.",
    description:
      "Isi saldo dalam rupiah. Setiap request dipotong dari saldo sesuai tarif API yang digunakan.",
    freeQuotaTitle: "10.000 request gratis setiap bulan",
    freeQuotaDescription: "Kuota gratis berlaku gabungan untuk seluruh endpoint Zonatic.",
    volumeNote:
      "Butuh request dalam jumlah besar? Hubungi kami untuk membahas harga khusus.",
    tiers: [
      {
        name: "Reverse Geocoding",
        priceLabel: "Rp15.000 / 1.000 request",
        priceNote: "Setara Rp15 per request.",
        description: "Ubah koordinat menjadi informasi wilayah administratif.",
      },
      {
        name: "API Utilitas",
        priceLabel: "Rp3.000 / 1.000 request",
        priceNote: "Setara Rp3 per request.",
        description: "Untuk pencarian wilayah dan kode pos Indonesia.",
      },
    ],
    advantages: [
      {
        title: "Tanpa biaya bulanan",
        description: "Isi saldo saat dibutuhkan.",
      },
      {
        title: "Harga dalam rupiah",
        description: "Tidak perlu menghitung biaya API dalam dolar.",
      },
      {
        title: "Pantau pemakaian",
        description: "Lihat jumlah request dan sisa saldo.",
      },
    ],
    cta: "Lihat Dokumentasi",
    ctaHref: "#api-example",
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
          { label: "Dokumentasi API", href: "#api-example" },
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