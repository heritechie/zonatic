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
    title: "Zonatic — Infrastruktur Location Intelligence untuk Indonesia",
    description:
      "Pahami konteks lokasi Indonesia, bentuk zona, dan gunakan data geografis langsung di aplikasi Anda.",
    ogLocale: "id_ID",
    siteUrl: "https://www.zonatic.id",
    consoleUrl: "https://console.zonatic.id",
  },
  common: {
    skipToContent: "Lewati ke konten",
    signIn: "Masuk",
    getStarted: "Mulai sekarang",
    viewDocumentation: "Lihat dokumentasi",
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
    getStarted: "Mulai sekarang",
    mobileOpen: "Buka menu",
    mobileClose: "Tutup menu",
    links: [
      { label: "Produk", href: "#zonas" },
      { label: "Solusi", href: "#use-cases" },
      { label: "Harga", href: "#cost" },
    ],
  },
  hero: {
    eyebrow: "LOCATION INTELLIGENCE UNTUK INDONESIA",
    headline: "Ubah data lokasi Anda menjadi",
    headlineHighlight: "insight yang nyata.",
    description:
      "Pahami konteks lokasi, tentukan zona, dan gunakan data geografis langsung di aplikasi Anda.",
    primaryCta: "Coba Zonatic",
    secondaryCta: "Lihat dokumentasi API",
    microRow: ["Data lokasi Indonesia", "Zona", "API & aturan berbasis lokasi"],
    imageAlt:
      "Ilustrasi datar Zonatic: data lokasi Indonesia dipetakan menjadi zona dan konteks geografis yang dipakai aplikasi.",
  },
  dataToIntel: {
    eyebrow: "DATA LOKASI",
    headline: "Bawa data Anda.",
    headlineHighlight: "Letakkan di peta.",
    description:
      "Gunakan data lokasi yang sudah Anda miliki untuk memahami konteks geografisnya, melihat pola sebaran, dan mengelompokkan lokasi sesuai kebutuhan.",
    flowLabels: ["Dataset", "Proses enrichment", "Hasil lokasi"],
    imageAlt:
      "Ilustrasi alur enrichment Zonatic: dataset lokasi diproses menjadi hasil lokasi yang siap dianalisis.",
  },
  zonas: {
    eyebrow: "ZONA",
    headline: "Tentukan zona sesuai kebutuhan bisnis.",
    description:
      "Gabungkan wilayah administratif atau polygon custom menjadi zona yang dapat digunakan kembali untuk analisis, operasi, dan aturan berbasis lokasi.",
    capabilities: [
      {
        label: "Wilayah administratif",
        description: "Pilih provinsi, kota, kecamatan, atau kelurahan.",
      },
      {
        label: "Zona custom",
        description: "Gunakan polygon sesuai kebutuhan.",
      },
      {
        label: "Zona reusable",
        description: "Gunakan zona yang sama untuk analisis dan aturan berbasis lokasi.",
      },
    ],
    imageAlt:
      "Ilustrasi editor zona Zonatic: wilayah administratif digabung dengan polygon custom menjadi satu zona.",
  },
  api: {
    eyebrow: "API & RULE BERBASIS LOKASI",
    headline: "Jadikan konteks lokasi bagian dari aturan bisnis Anda.",
    description:
      "Gunakan location primitives untuk membangun aplikasi, atau definisikan aturan berbasis lokasi melalui UI dan konsumsi hasilnya melalui API.",
    flow: ["LOCATION", "ZONATIC API", "ZONA", "RULE", "RESULT"],
    request: {
      method: "GET",
      path: "/v1/zones/lookup?lat=-6.2088&lng=106.8456",
      label: "Request",
    },
    response: {
      label: "Response",
      json: `{
  "zone_id": "ID-JK-3171",
  "zone": "urban",
  "score": 20,
  "rules": [
    "rule_a",
    "rule_b",
    "rule_c"
  ]
}`,
    },
    rules: {
      label: "Contoh rule dari response tersebut",
      zoneLabel: "Zona",
      zone: "Urban",
      scoreLabel: "Score",
      score: "+20",
      items: [
        { label: "Rule A", value: "matched", outcome: "positive" },
        { label: "Rule B", value: "priority", outcome: "positive" },
        { label: "Rule C", value: "applicable", outcome: "neutral" },
      ],
    },
    disclaimer:
      "Zonatic menyediakan konteks lokasi dan zona. Aturan serta keputusan bisnis tetap diterapkan oleh aplikasi Anda sendiri.",
  },
  useCases: {
    eyebrow: "USE CASE",
    headline: "Location intelligence untuk berbagai industri.",
    description:
      "Gunakan data lokasi, zona, dan aturan berbasis lokasi sesuai kebutuhan bisnis Anda.",
    cases: [
      {
        title: "Lending & Finance",
        description: "Rule, eligibility, dan analisis berbasis lokasi.",
        iconKey: "coins",
      },
      {
        title: "Retail",
        description: "Analisis wilayah dan potensi ekspansi.",
        iconKey: "store",
      },
      {
        title: "Logistik",
        description: "Zona layanan dan coverage area.",
        iconKey: "truck",
      },
      {
        title: "Marketing",
        description: "Segmentasi dan targeting berdasarkan wilayah.",
        iconKey: "target",
      },
    ],
    disclaimer:
      "Use case di atas adalah contoh penerapan oleh pelanggan, bukan cakup fitur Zonatic.",
  },
  costEstimator: {
    eyebrow: "LOCATION API COST",
    headline: "Sudah terlalu banyak bayar untuk data lokasi?",
    description:
      "Gunakan data lokasi Indonesia dengan pendekatan yang lebih efisien.",
    calculator: {
      title: "Hitung perkiraan biaya location API Anda",
      productLabel: "Location service",
      productHint: "Pilih layanan lokasi yang paling sering Anda panggil.",
      requestsLabel: "Monthly requests",
      requestsHint: "Gunakan preset atau isi sendiri sesuai volume Anda.",
      presets: ["10K", "100K", "1M", "5M", "10M"],
      plans: {
        planFree: "Free",
        planDeveloper: "Developer",
        planGrowth: "Growth",
        planBusiness: "Business",
      },
      columnProvider: "Perkiraan biaya Google",
      columnProviderNote: "Estimasi berdasarkan volume bulanan",
      columnZonatic: "Zonatic",
      columnZonaticNote: "Estimasi berdasarkan paket",
      skuNote:
        "Harga Google berbeda-beda per SKU dan field yang diminta. Estimasi ini memakai {product}.",
      rateNote:
        "Perbandingan dikonversi menggunakan kurs asumsi, bukan kurs live.",
      estimateBadge: "Estimasi",
      perMonthSuffix: "/bulan",
      customPlanLabel: "Paket disesuaikan",
      comparisonTitle: "Perbandingan biaya",
      savingsTitle: "Potensi penghematan",
      savingsNote: "Dibandingkan estimasi {provider} pada {volume}.",
      higherNote: "Estimasi {provider} lebih rendah pada {volume}.",
      equalNote: "Estimasi biaya setara",
      comparisonUnavailable:
        "Perbandingan biaya tidak dapat dihitung untuk volume ini.",
      requestVolumeUnit: "request/bulan",
      sourceNote: "Harga provider diperiksa {date}.",
      emptyState:
        "Masukkan jumlah request per bulan untuk melihat perkiraan biaya.",
      disclaimer:
        "Perkiraan berdasarkan volume penggunaan. Harga aktual dapat berbeda berdasarkan SKU, field yang diminta, volume tier, dan konfigurasi penggunaan. Harga Zonatic di sini masih hipotesis internal, bukan harga final.",
    },
    explainer: {
      title: "Zonatic adalah lapisan tambahan, bukan pengganti.",
      points: [
        "Zonatic bukan berarti Anda harus meninggalkan provider global.",
        "Gunakan provider global untuk kebutuhan yang memang membutuhkan coverage, Places, atau layanan lain yang tidak disediakan Zonatic.",
        "Untuk location resolution Indonesia yang dapat diselesaikan dari data lokal, Zonatic dapat menjadi layer yang lebih efisien.",
      ],
    },
    cta: {
      primary: "Coba Zonatic",
      secondary: "Mulai dari kebutuhan lokasi Indonesia Anda.",
    },
  },
  finalCta: {
    eyebrow: "ZONA · RULE · API",
    headline: "Jadikan data Anda lebih bermakna.",
    description:
      "Pahami konteks lokasi, bentuk zona, dan gunakan informasi geografis langsung di aplikasi Anda.",
    primaryCta: "Mulai dengan Zonatic",
    secondaryCta: "Lihat dokumentasi API",
  },
  footer: {
    tagline: "Infrastruktur location intelligence untuk Indonesia.",
    copyrightYear: "2026",
    copyright: "Hak cipta dilindungi.",
    columns: [
      {
        title: "Produk",
        links: [
          { label: "Location Intelligence" },
          { label: "Zona" },
          { label: "API" },
        ],
      },
      {
        title: "Developer",
        links: [
          { label: "Dokumentasi API" },
          { label: "API Reference" },
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
