# Zonatic MVP

## 1. Purpose

Dokumen ini mendefinisikan scope Minimum Viable Product (MVP) Zonatic yang menjadi dasar pengembangan tahap awal.

MVP berfokus pada penyediaan data administratif Indonesia yang konsisten dan mudah digunakan melalui REST API, dengan Console sebagai interface untuk mengelola akses dan menggunakan kapabilitas dasar Zonatic.

Zonatic tetap menggunakan prinsip **API-first, Console-assisted**. API merupakan core product, sedangkan Console mendukung pengguna non-teknis dan developer dalam mengelola penggunaan Zonatic.

## 2. MVP Scope

MVP terdiri dari tiga bagian:

1. Administrative Directory API
2. Postal Code API
3. Zonatic Console

```text
Zonatic MVP
│
├── API
│   ├── Administrative Directory
│   └── Postal Code
│
└── Console
    ├── Authentication
    ├── API Keys
    └── Basic API Usage
```

## 3. Administrative Directory API

Menyediakan master data wilayah administratif Indonesia berdasarkan canonical administrative dataset dari `region-id`.

Hierarchy yang didukung:

```text
Province
└── Regency / City
    └── District
        └── Village
```

Endpoint:

```http
GET /v1/areas/{code}
GET /v1/areas?q=...
```

`code` mengikuti canonical code dari `region-id` tanpa transformasi atau separator tambahan.

### Search

Administrative search mendukung:

- case-insensitive matching;
- prefix matching;
- filter berdasarkan administrative level;
- filter berdasarkan parent area;
- limit hasil.

Search endpoint juga dapat digunakan oleh Console sebagai autocomplete sehingga tidak diperlukan endpoint `/autocomplete` terpisah pada MVP.

Fuzzy matching, typo correction, alias, dan semantic search belum termasuk MVP.

## 4. Postal Code API

Menyediakan hubungan antara kode pos dan wilayah administratif.

Endpoint:

```http
GET /v1/postal-codes/{postal_code}
GET /v1/postal-codes/search
GET /v1/areas/{code}/postal-codes
```

Data postal code menggunakan `postal-code-id` sebagai basis data.

Hubungan postal code dengan administrative area diperlakukan sebagai many-to-many.

Status data seperti `OFFICIAL` dan `AUGMENTED` dipertahankan sehingga consumer dapat membedakan data resmi dan data hasil enrichment/derivation.

## 5. Zonatic Console

Console adalah web application yang digunakan untuk mengelola dan menggunakan layanan Zonatic.

MVP Console mencakup:

### 5.1 Authentication

User dapat:

- login;
- logout;
- mengakses area Console yang membutuhkan authentication.

Mekanisme authentication dapat ditentukan pada technical architecture dan tidak menjadi bagian dari product contract ini.

### 5.2 API Key Management

User dapat:

- melihat API keys miliknya;
- membuat API key;
- memberikan nama/label pada API key;
- revoke API key;
- melihat status API key.

API key yang sudah dibuat hanya dapat digunakan oleh tenant yang memilikinya.

Console tidak menampilkan kembali secret API key setelah secret tersebut selesai dibuat.

### 5.3 API Usage

User dapat melihat penggunaan API secara sederhana.

MVP minimal menampilkan:

- total request;
- request berdasarkan endpoint;
- periode penggunaan;
- error/request status secara agregat.

Usage dashboard belum mencakup billing atau invoicing.

### 5.4 Administrative Area Explorer

Console dapat menyediakan interface sederhana untuk:

- mencari administrative area;
- melihat detail area;
- melihat hierarchy/breadcrumb;
- melihat kode wilayah.

Console menggunakan Administrative Directory API sebagai sumber data.

### 5.5 Postal Code Explorer

Console dapat menyediakan interface sederhana untuk:

- mencari postal code;
- melihat area administratif yang terkait;
- mencari postal code berdasarkan administrative area.

Console menggunakan Postal Code API sebagai sumber data.

## 6. Authentication & Tenant

MVP menggunakan API key untuk akses API production.

Format:

```http
Authorization: Bearer <api-key>
```

Data customer dan API key terisolasi berdasarkan tenant.

Billing dan subscription belum termasuk dalam MVP.

## 7. Data Sources

Administrative data:

```text
region-id
```

Postal code data:

```text
postal-code-id
```

Kedua dataset tersebut menjadi foundation data layer untuk MVP Zonatic.

## 8. Out of Scope

Fitur berikut tidak termasuk MVP:

- Reverse geocoding;
- Administrative boundary / polygon processing;
- PostGIS-based point-in-polygon lookup;
- Bulk Location Enrichment;
- Location Data Quality;
- Custom Coverage;
- Territory Builder;
- Field Location Verification;
- continuous location tracking;
- billing dan subscription;
- fuzzy/semantic search;
- advanced analytics;
- advanced usage/billing reporting.

Reverse geocoding akan dikembangkan pada tahap berikutnya setelah dataset boundary yang sesuai tersedia.

## 9. MVP Success Criteria

MVP dianggap berhasil apabila developer dapat:

1. mengambil detail administrative area berdasarkan canonical code;
2. mencari administrative area berdasarkan nama;
3. mendapatkan hierarchy/breadcrumb suatu area;
4. mencari postal code;
5. mendapatkan administrative area yang terkait dengan postal code;
6. mendapatkan postal code yang terkait dengan administrative area;
7. membedakan status data `OFFICIAL` dan `AUGMENTED`;
8. mengakses API menggunakan API key;
9. login ke Zonatic Console;
10. membuat dan revoke API key melalui Console;
11. melihat penggunaan API dasar;
12. mencari dan melihat administrative area melalui Console;
13. mencari dan melihat postal code melalui Console.

## 10. Development Approach

MVP dikembangkan secara iterative.

Setiap capability memiliki feature specification dan acceptance criteria tersendiri sebelum diberikan kepada coding agent.

Urutan pengembangan:

```text
MVP
│
├── Phase 1
│   ├── Administrative Directory API
│   └── Administrative Explorer
│
├── Phase 2
│   ├── Postal Code API
│   └── Postal Code Explorer
│
├── Phase 3
│   └── API Key Management & Usage
│
└── Future
    └── Reverse Geocoding
```

Implementasi tidak dianggap selesai hanya karena kode berhasil dibuat. Setiap feature harus melalui automated verification dan review terhadap acceptance criteria.

## 11. MVP Boundary

MVP bertujuan membuktikan bahwa Zonatic dapat menyediakan **administrative location data Indonesia sebagai API product** dengan Console sebagai pendukung.

MVP belum bertujuan menjadi platform Location Intelligence yang lengkap.

Kapabilitas seperti Bulk Enrichment, Coverage, Territory Builder, dan Field Location Verification akan dikembangkan setelah core data dan API terbukti stabil.
