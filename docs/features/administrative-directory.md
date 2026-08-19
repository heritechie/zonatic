# Administrative Directory API

## 1. Purpose

Administrative Directory API menyediakan master data wilayah administratif Indonesia yang dapat digunakan developer untuk:

- mengambil administrative area berdasarkan canonical code;
- mencari administrative area berdasarkan nama;
- mendapatkan hierarchy/breadcrumb suatu area.

Data administrative berasal dari `region-id`.

Zonatic tidak mengubah format canonical administrative code.

## 2. Scope

### Included

- administrative area lookup;
- administrative area search;
- hierarchy/breadcrumb;
- API key authentication;
- input validation;
- consistent error response.

### Out of Scope

- postal code;
- reverse geocoding;
- geographic boundary;
- point-in-polygon;
- fuzzy search;
- typo correction;
- alias;
- semantic search;
- autocomplete-specific endpoint.

Console dapat menggunakan search endpoint untuk kebutuhan autocomplete.

## 3. Administrative Hierarchy

API mendukung empat level:

```text
province
└── regency
    └── district
        └── village
```

`regency` digunakan untuk merepresentasikan kabupaten dan kota.

API menggunakan vocabulary level berikut secara konsisten:

```text
province
regency
district
village
```

## 4. Administrative Code

Administrative `code` harus mengikuti canonical code dari `region-id`.

Tidak boleh dilakukan transformasi format.

Contoh:

```text
32
3273
327301
3273011001
```

Jangan mengubah menjadi:

```text
32
32.73
32.73.01
32.73.01.1001
```

Code diperlakukan sebagai canonical identifier.

## 5. Authentication

Production API membutuhkan API key.

Request:

```http
Authorization: Bearer <api-key>
```

Request tanpa API key atau dengan API key yang tidak valid harus ditolak.

Authentication detail mengikuti architecture document.

## 6. Endpoint: Get Area by Code

### Request

```http
GET /v1/areas/{code}
```

Example:

```http
GET /v1/areas/3273011001
Authorization: Bearer <api-key>
```

### Success Response

HTTP `200 OK`.

```json
{
  "data": {
    "code": "3273011001",
    "name": "Example Village",
    "level": "village",
    "breadcrumb": [
      {
        "code": "32",
        "name": "Jawa Barat",
        "level": "province"
      },
      {
        "code": "3273",
        "name": "Example Regency",
        "level": "regency"
      },
      {
        "code": "327301",
        "name": "Example District",
        "level": "district"
      },
      {
        "code": "3273011001",
        "name": "Example Village",
        "level": "village"
      }
    ]
  }
}
```

### Behavior

- `code` harus exact match.
- Response harus menggunakan canonical code.
- `level` harus salah satu dari `province`, `regency`, `district`, atau `village`.
- Breadcrumb diurutkan dari province menuju area yang diminta.
- Area pada breadcrumb harus mengikuti parent hierarchy dari source data.

### Not Found

Jika code tidak ditemukan:

HTTP `404`.

```json
{
  "error": {
    "code": "AREA_NOT_FOUND",
    "message": "Administrative area not found."
  }
}
```

## 7. Endpoint: Search Areas

### Request

```http
GET /v1/areas/search
```

Required query parameter:

```text
q
```

Optional query parameters:

```text
level
parent_code
limit
```

Example:

```http
GET /v1/areas/search?q=tanah&limit=10
Authorization: Bearer <api-key>
```

### Search Behavior

MVP menggunakan:

- case-insensitive matching;
- prefix matching;
- official area name;
- optional level filtering;
- optional direct-parent filtering;
- result limit.

Search tidak menggunakan:

- fuzzy matching;
- typo correction;
- alias;
- abbreviation expansion;
- semantic matching.

### Search All Levels

Jika `level` tidak diberikan, pencarian dilakukan pada seluruh administrative levels.

Example:

```http
GET /v1/areas/search?q=bandung
```

Hasil dapat mencakup:

```text
regency
district
village
```

### Level Filter

Example:

```http
GET /v1/areas/search?q=bandung&level=regency
```

Hasil hanya boleh berisi:

```text
level = regency
```

Valid levels:

```text
province
regency
district
village
```

### Parent Filter

`parent_code` digunakan untuk membatasi pencarian berdasarkan direct parent.

Example:

```http
GET /v1/areas/search?q=tanah&parent_code=3171
```

Artinya mencari area yang:

```text
name matches "tanah"
AND
parent_code = "3171"
```

`parent_code` tidak berarti recursive descendant search.

## 8. Search Response

HTTP `200 OK`.

Example:

```json
{
  "data": [
    {
      "code": "317101",
      "name": "Tanah Abang",
      "level": "district",
      "breadcrumb": [
        {
          "code": "31",
          "name": "DKI Jakarta",
          "level": "province"
        },
        {
          "code": "3171",
          "name": "Jakarta Pusat",
          "level": "regency"
        },
        {
          "code": "317101",
          "name": "Tanah Abang",
          "level": "district"
        }
      ]
    }
  ],
  "meta": {
    "limit": 10,
    "count": 1
  }
}
```

## 9. Empty Search Result

Search yang tidak menemukan hasil tetap menghasilkan:

HTTP `200 OK`.

```json
{
  "data": [],
  "meta": {
    "limit": 20,
    "count": 0
  }
}
```

Search kosong tidak menggunakan `404`.

## 10. Query Parameter Validation

### `q`

`q` wajib diberikan.

Invalid:

```http
GET /v1/areas/search
```

Response:

```text
400 INVALID_REQUEST
```

Empty query juga dianggap invalid:

```http
GET /v1/areas/search?q=
```

### `level`

Jika diberikan, harus salah satu:

```text
province
regency
district
village
```

Invalid value:

```text
400 INVALID_LEVEL
```

### `parent_code`

Jika diberikan, harus merupakan administrative code yang valid.

Unknown code:

```text
404 AREA_NOT_FOUND
```

### `limit`

Default:

```text
20
```

Maximum:

```text
100
```

Rules:

```text
limit < 1
→ 400 INVALID_LIMIT

limit > 100
→ 400 INVALID_LIMIT
```

## 11. Error Contract

Semua error menggunakan format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message."
  }
}
```

Error code minimum:

```text
INVALID_REQUEST
INVALID_API_KEY
API_KEY_REVOKED
INVALID_LEVEL
INVALID_LIMIT
AREA_NOT_FOUND
RATE_LIMITED
INTERNAL_ERROR
```

Internal implementation details seperti stack trace, database error, atau SQL query tidak boleh dikembalikan kepada API consumer.

## 12. Data Requirements

Administrative data harus berasal dari `region-id`.

Import harus mempertahankan:

- canonical code;
- official name;
- administrative level;
- parent relationship.

Data harus dapat digunakan untuk membentuk hierarchy:

```text
province
  ↓
regency
  ↓
district
  ↓
village
```

Setiap area harus memiliki parent yang valid kecuali `province`.

## 13. Acceptance Criteria

### Get Area

- [ ] Valid province code menghasilkan `200`.
- [ ] Valid regency code menghasilkan `200`.
- [ ] Valid district code menghasilkan `200`.
- [ ] Valid village code menghasilkan `200`.
- [ ] Response memiliki `code`.
- [ ] Response memiliki `name`.
- [ ] Response memiliki `level`.
- [ ] Response memiliki breadcrumb.
- [ ] Breadcrumb dimulai dari province.
- [ ] Breadcrumb mengikuti parent hierarchy.
- [ ] Unknown code menghasilkan `404 AREA_NOT_FOUND`.
- [ ] Canonical code tidak mengalami transformasi.

### Search

- [ ] `q` wajib diberikan.
- [ ] Search bersifat case-insensitive.
- [ ] Prefix matching bekerja.
- [ ] Search tanpa `level` mencari seluruh level.
- [ ] Filter `level` bekerja.
- [ ] Filter `parent_code` bekerja.
- [ ] `parent_code` menggunakan direct parent.
- [ ] Default limit adalah 20.
- [ ] Maximum limit adalah 100.
- [ ] Empty result menghasilkan `200` dengan array kosong.
- [ ] Result memiliki `code`.
- [ ] Result memiliki `name`.
- [ ] Result memiliki `level`.
- [ ] Result memiliki breadcrumb.

### Authentication

- [ ] Request tanpa API key ditolak.
- [ ] Invalid API key menghasilkan `401`.
- [ ] Revoked API key menghasilkan `403`.

### Validation

- [ ] Invalid level menghasilkan `400`.
- [ ] Invalid limit menghasilkan `400`.
- [ ] Missing query menghasilkan `400`.
- [ ] Empty query menghasilkan `400`.
- [ ] Unknown parent code menghasilkan `404`.

## 14. Testing Requirements

Feature harus memiliki minimal:

### Unit Tests

Meng-cover:

- hierarchy resolution;
- search matching;
- level filtering;
- parent filtering;
- parameter validation;
- error mapping.

### Integration Tests

Menggunakan database test dengan representative administrative data.

Minimal test:

```text
province
regency
district
village
```

dan beberapa area dengan nama yang sama.

### API Tests

Meng-cover:

```text
GET /v1/areas/{code}
GET /v1/areas/search
```

termasuk success, validation, authentication, dan error cases.

## 15. Definition of Done

Administrative Directory API dianggap selesai apabila:

- [ ] API implementation selesai.
- [ ] `GET /v1/areas/{code}` tersedia.
- [ ] `GET /v1/areas/search` tersedia.
- [ ] `region-id` berhasil diintegrasikan.
- [ ] Canonical code dipertahankan.
- [ ] Hierarchy dapat direkonstruksi.
- [ ] Authentication berjalan.
- [ ] Error contract konsisten.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] API tests pass.
- [ ] OpenAPI specification tersedia.
- [ ] Acceptance criteria seluruhnya terpenuhi.

## 16. Out of Scope Reminder

Implementasi feature ini tidak boleh memperluas scope menjadi:

- postal code;
- reverse geocoding;
- boundary;
- PostGIS;
- fuzzy search;
- alias system;
- semantic search;
- bulk enrichment;
- territory;
- coverage.

Feature berikutnya akan memiliki specification terpisah.
