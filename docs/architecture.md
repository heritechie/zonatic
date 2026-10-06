# Zonatic MVP Architecture

## 1. Purpose

Dokumen ini mendefinisikan arsitektur teknis tingkat tinggi untuk Zonatic MVP.

Arsitektur harus mendukung:

- Administrative Directory API;
- Postal Code API;
- Zonatic Console;
- multi-tenant API access;
- API key management;
- basic API usage tracking;
- iterative development;
- future expansion menuju location intelligence capabilities.

Architecture MVP harus tetap sederhana dan menghindari infrastructure yang belum dibutuhkan.

## 2. Architecture Principles

### 2.1 API-first

REST API merupakan core product Zonatic.

Console menggunakan API yang sama dengan consumer eksternal apabila memungkinkan.

### 2.2 Simple by default

MVP menggunakan architecture sesederhana mungkin.

Tidak menggunakan microservices atau distributed infrastructure sebelum terdapat kebutuhan yang jelas.

### 2.3 Data-driven

Administrative data dan postal code data merupakan foundation utama Zonatic.

Data source, version, dan status data harus dapat ditelusuri.

### 2.4 Multi-tenant

Resource customer harus terisolasi berdasarkan tenant.

Minimal resource yang terkait dengan tenant:

- users;
- API keys;
- API usage;
- future customer-owned resources.

### 2.5 Future-compatible

Architecture tidak boleh menghambat penambahan:

- boundary data;
- PostGIS;
- reverse geocoding;
- bulk enrichment;
- custom coverage;
- territory;
- field verification.

Namun komponen tersebut **tidak dibangun pada MVP hanya untuk kebutuhan future-proofing**.

## 3. High-Level Architecture

```text
                         Internet
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
       External API Consumer        Zonatic Console
              │                           │
              │                           │
              └─────────────┬─────────────┘
                            ▼
                     Zonatic Backend
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
       Administrative   Postal Code    API Key /
           API              API         Usage
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                       PostgreSQL
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
            region-id            postal-code-id
```

MVP menggunakan satu backend application dan satu primary database.

## 4. Backend

Backend menyediakan:

- REST API;
- authentication;
- API key validation;
- administrative data access;
- postal code data access;
- API usage recording;
- Console backend capabilities.

API version menggunakan prefix:

```text
/v1
```

MVP tidak membutuhkan API gateway terpisah.

## 5. Database

Primary database menggunakan PostgreSQL.

Database menyimpan:

### Core reference data

Administrative areas yang berasal dari `region-id`.

Postal code relationships yang berasal dari `postal-code-id`.

### Application data

Minimal:

- tenants;
- users;
- API keys;
- API usage records.

Database schema harus mempertahankan hubungan administrative hierarchy.

Canonical administrative code harus disimpan tanpa perubahan format.

Contoh:

```text
32
3273
327301
3273011001
```

Tidak boleh diubah menjadi:

```text
32
32.73
32.73.01
32.73.01.1001
```

## 6. Administrative Data Model

Administrative hierarchy direpresentasikan sebagai parent-child relationship.

Secara konseptual:

```text
AdministrativeArea
├── code
├── name
├── level
└── parent
```

Level yang digunakan API:

```text
province
regency
district
village
```

`regency` mencakup kabupaten dan kota.

API tidak melakukan transformasi terhadap canonical code dari `region-id`.

## 7. Postal Code Data Model

Postal code merupakan reference data terpisah dari administrative hierarchy.

Hubungan:

```text
Postal Code
      │
      │ many-to-many
      │
Administrative Area
```

Secara konseptual:

```text
postal_codes
      │
      └── postal_code_areas
                  │
                  └── administrative_areas
```

Data status seperti:

```text
OFFICIAL
AUGMENTED
```

harus dapat dipertahankan.

Untuk data augmented, confidence atau metadata derivation dapat disimpan apabila tersedia dari source dataset.

## 8. Data Import

MVP membutuhkan proses import untuk:

```text
region-id
postal-code-id
```

Import harus dapat dijalankan kembali secara reproducible.

Conceptual flow:

```text
Source Dataset
      ↓
Validate
      ↓
Normalize
      ↓
Import
      ↓
Database
```

Import tidak boleh secara diam-diam mengubah canonical administrative code.

Data validation minimal mencakup:

- unique code;
- valid parent relationship;
- valid hierarchy;
- valid postal code relationship;
- duplicate detection.

## 9. Authentication

API menggunakan API key.

Request:

```http
Authorization: Bearer <api-key>
```

API key memiliki hubungan dengan tenant.

Secara konseptual:

```text
Tenant
  │
  ├── Users
  │
  └── API Keys
          │
          └── API Requests
```

Secret API key tidak disimpan dalam bentuk plaintext.

Console hanya menampilkan secret ketika API key pertama kali dibuat.

## 10. API Usage

MVP melakukan pencatatan penggunaan API.

Minimal informasi yang dibutuhkan:

- tenant;
- API key;
- endpoint;
- HTTP method;
- status code;
- timestamp.

Usage data digunakan untuk basic Console reporting.

Billing belum menggunakan data usage ini.

## 11. Console

Console merupakan web application untuk:

- authentication;
- API key management;
- basic API usage;
- administrative area explorer;
- postal code explorer.

Conceptual architecture:

```text
Browser
   │
   ▼
Zonatic Console
   │
   ▼
Zonatic Backend
   │
   ├── Administrative API
   ├── Postal Code API
   ├── Authentication
   ├── API Keys
   └── Usage
```

Console tidak memiliki database reference data terpisah.

Administrative dan postal code data tetap berasal dari backend Zonatic.

## 12. Reverse Geocoding

Reverse geocoding **tidak termasuk dalam MVP architecture implementation**.

Boundary dataset belum tersedia sehingga PostGIS dan spatial processing tidak menjadi dependency wajib MVP.

Future architecture:

```text
Boundary Dataset
       ↓
PostGIS
       ↓
Spatial Query
       ↓
Administrative Area
       ↓
Reverse Geocode API
```

Ketika reverse geocoding mulai dikembangkan, PostGIS dapat ditambahkan ke PostgreSQL tanpa harus memecah backend menjadi microservices.

## 13. Infrastructure

MVP tidak membutuhkan:

- Kubernetes;
- microservices;
- message broker;
- Redis;
- Elasticsearch;
- dedicated API gateway;
- distributed event infrastructure.

Development environment dapat menggunakan Docker Compose.

Conceptual development stack:

```text
Docker Compose
├── backend
├── database
└── console
```

Exact framework dan runtime ditentukan pada implementation plan.

## 14. Testing Architecture

Setiap API feature minimal memiliki:

```text
Unit Test
    ↓
Integration Test
    ↓
API Smoke Test
```

Console feature juga harus memiliki browser/E2E verification untuk critical user flows.

Contoh:

```text
API Key Management
    ↓
Login
    ↓
Create API Key
    ↓
Display secret once
    ↓
Revoke API Key
    ↓
Verify revoked key rejected
```

## 15. Security Baseline

MVP minimal harus:

- menggunakan HTTPS pada production;
- melakukan authentication terhadap API;
- menyimpan API key dalam bentuk hash;
- mengisolasi resource berdasarkan tenant;
- tidak mengembalikan secret API key setelah creation;
- tidak mengekspos database credentials;
- tidak mengekspos stack trace kepada API consumer;
- melakukan input validation.

## 16. Architecture Boundary

Architecture MVP bertanggung jawab terhadap:

```text
API
Authentication
Tenant isolation
Reference data
API keys
Usage
Console
```

Architecture MVP tidak bertanggung jawab terhadap:

```text
Routing
ETA
Continuous tracking
Collection workflow
CRM
Dispatch
Territory optimization
Coverage engine
Reverse geocoding
```

Capability tersebut dapat ditambahkan sebagai feature berikutnya tanpa mengubah prinsip API-first dan data-centric Zonatic.

## 17. Evolution Path

Architecture diharapkan berkembang secara incremental:

```text
MVP
│
├── PostgreSQL
├── REST API
└── Console
        │
        ▼
Boundary Phase
│
└── PostgreSQL + PostGIS
        │
        ▼
Location Intelligence
│
├── Reverse Geocode
├── Bulk Enrichment
└── Data Quality
        │
        ▼
Operational Intelligence
│
├── Coverage
├── Territory Builder
└── Field Verification
```

Setiap tahap hanya menambahkan infrastructure ketika capability tersebut benar-benar membutuhkan.

## 18. Documentation Architecture

> Status: **keputusan arsitektur. Belum diimplementasikan.**
> Tidak ada `apps/docs`, tidak ada dependency Nextra, dan tidak ada perubahan DNS
> atau deployment yang dilakukan atas dasar bagian ini.

### 18.1 Pembagian tanggung jawab domain

| Domain | Tanggung jawab |
| --- | --- |
| `zonatic.id` | marketing/product website |
| `docs.zonatic.id` | developer documentation (future) |
| `api.zonatic.id` | API runtime, `/v1/*`, `/health`, `/openapi.json`, `/docs` |

`api.zonatic.id/docs` dan `api.zonatic.id/openapi.json` **tetap dipertahankan**
sebagai Swagger/FastAPI technical reference. Keduanya tidak dipindahkan ke
`docs.zonatic.id`.

### 18.2 Struktur aplikasi yang direncanakan

```text
apps/
├── web/     → zonatic.id
├── docs/    → docs.zonatic.id  (Nextra, future)
└── api/     → api.zonatic.id   (FastAPI)
```

### 18.3 Technology decision

Dokumentasi developer pada `docs.zonatic.id` menggunakan **Nextra**.

Nextra dipilih karena berbasis Next.js + MDX dan sesuai dengan stack Zonatic yang
sudah menggunakan Next.js/React/pnpm.

Documentation engine custom **tidak** dibangun.

### 18.4 Struktur konten yang direncanakan

- Getting Started;
- Authentication;
- Concepts;
- Guides / Tutorials;
- API Reference;
- Examples;
- Changelog;
- SDK documentation apabila tersedia.

### 18.5 Catatan implementasi

Bagian ini hanya mencatat keputusan. Implementasi (`apps/docs`, instalasi Nextra,
DNS `docs.zonatic.id`, dan hosting) merupakan task terpisah dan belum dimulai.

Endpoint reference pada situs documentation sebaiknya digenerate dari
`api.zonatic.id/openapi.json` agar tidak drift dari contract yang berjalan.

