# Postal Code API

## 1. Purpose

Postal Code API menyediakan data kode pos Indonesia dan hubungan antara kode pos dengan wilayah administratif.

Data postal code berasal dari `postal-code-id`.

API menggunakan canonical administrative code dari `region-id` untuk mereferensikan administrative area.

Postal code dapat berhubungan dengan lebih dari satu administrative area, sehingga relationship diperlakukan sebagai many-to-many.

## 2. Scope

### Included

- postal code lookup;
- postal code search;
- administrative area → postal codes;
- postal code → administrative areas;
- provenance/status data;
- API key authentication;
- input validation;
- consistent error response.

### Out of Scope

- reverse geocoding;
- geographic boundary;
- point-in-polygon;
- postal code generation;
- fuzzy search;
- typo correction;
- semantic search;
- bulk enrichment;
- billing;
- advanced postal analytics.

## 3. Data Sources

Postal code data berasal dari:

```text
postal-code-id
```

Administrative area reference berasal dari:

```text
region-id
```

Administrative `code` harus menggunakan canonical code dari `region-id` tanpa transformasi atau separator tambahan.

Contoh:

```text
32
3273
327301
3273011001
```

Bukan:

```text
32
32.73
32.73.01
32.73.01.1001
```

## 4. Postal Code Model

Secara konseptual:

```text
PostalCode
├── postal_code
└── areas
      └── AdministrativeArea
```

Relationship:

```text
Postal Code
      │
      │ many-to-many
      │
Administrative Area
```

Contoh:

```text
Postal Code 45134
    ├── Area A
    └── Area B
```

dan:

```text
Area A
    ├── Postal Code 45134
    └── Postal Code 45135
```

## 5. Data Provenance

Postal code relationship harus mempertahankan status/provenance data.

Status minimum:

```text
OFFICIAL
AUGMENTED
```

`OFFICIAL` menunjukkan relationship berasal dari sumber resmi.

`AUGMENTED` menunjukkan relationship berasal dari enrichment atau derivation.

API tidak boleh menyamakan kedua status tersebut.

Jika data augmented memiliki confidence atau metadata derivation dari source dataset, informasi tersebut dapat dipertahankan.

## 6. Authentication

Production API membutuhkan API key.

Request:

```http
Authorization: Bearer <api-key>
```

API key menggunakan prefix:

```text
zn_test_...
zn_live_...
```

Authentication menggunakan mekanisme yang sama dengan Administrative Directory API.

API key:

- harus valid;
- harus aktif;
- harus memiliki tenant yang valid.

Missing atau invalid API key:

```text
401 INVALID_API_KEY
```

Revoked API key:

```text
403 API_KEY_REVOKED
```

## 7. Endpoint: Get Postal Code

### Request

```http
GET /v1/postal-codes/{postal_code}
```

Example:

```http
GET /v1/postal-codes/45134
Authorization: Bearer <api-key>
```

### Success

HTTP `200 OK`.

```json
{
  "data": {
    "postal_code": "45134",
    "areas": [
      {
        "code": "327301",
        "name": "Example District",
        "level": "district",
        "source": "OFFICIAL"
      }
    ]
  }
}
```

### Behavior

- `postal_code` harus exact match.
- Postal code diperlakukan sebagai string.
- Leading zero harus dipertahankan jika terdapat pada source data.
- Response dapat memiliki lebih dari satu administrative area.
- Area menggunakan canonical `region-id.code`.
- `source` menunjukkan provenance relationship.

### Not Found

Jika postal code tidak ditemukan:

HTTP `404`.

```json
{
  "error": {
    "code": "POSTAL_CODE_NOT_FOUND",
    "message": "Postal code not found."
  }
}
```

## 8. Endpoint: Search Postal Codes

### Request

```http
GET /v1/postal-codes/search
```

Required:

```text
q
```

Optional:

```text
limit
```

Example:

```http
GET /v1/postal-codes/search?q=45134
Authorization: Bearer <api-key>
```

Search juga dapat menggunakan nama administrative area:

```http
GET /v1/postal-codes/search?q=Kesambi
Authorization: Bearer <api-key>
```

### Search Behavior

MVP menggunakan:

- case-insensitive matching untuk nama area;
- prefix matching;
- exact/prefix matching untuk postal code;
- official administrative name;
- limit.

Search tidak menggunakan:

- fuzzy matching;
- typo correction;
- alias;
- abbreviation expansion;
- semantic matching.

### Limit

Default:

```text
20
```

Maximum:

```text
100
```

### Response

HTTP `200 OK`.

```json
{
  "data": [
    {
      "postal_code": "45134",
      "areas": [
        {
          "code": "327301",
          "name": "Kesambi",
          "level": "district",
          "source": "OFFICIAL"
        }
      ]
    }
  ],
  "meta": {
    "limit": 20,
    "count": 1
  }
}
```

### Empty Result

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

## 9. Endpoint: Area → Postal Codes

### Request

```http
GET /v1/areas/{code}/postal-codes
```

Example:

```http
GET /v1/areas/327301/postal-codes
Authorization: Bearer <api-key>
```

### Success

HTTP `200 OK`.

```json
{
  "data": [
    {
      "postal_code": "45134"
    },
    {
      "postal_code": "45135"
    }
  ],
  "meta": {
    "count": 2
  }
}
```

### Behavior

- `{code}` menggunakan canonical administrative code.
- Hanya relationship yang terkait langsung dengan area tersebut yang dikembalikan.
- Postal codes diurutkan secara deterministic.
- Area yang valid tetapi tidak memiliki postal code menghasilkan array kosong.

### Unknown Area

Jika administrative code tidak ditemukan:

HTTP `404`.

```json
{
  "error": {
    "code": "AREA_NOT_FOUND",
    "message": "Administrative area not found."
  }
}
```

## 10. Postal Code Search by Area Name

Search berdasarkan nama area harus menggunakan relationship postal-code → administrative-area.

Example:

```http
GET /v1/postal-codes/search?q=Kesambi
```

Expected behavior:

```text
search administrative area name
        ↓
find matching administrative areas
        ↓
find related postal codes
        ↓
return unique postal codes
```

Jika satu postal code berhubungan dengan beberapa matching areas, postal code hanya muncul satu kali dalam result.

## 11. Response Area Object

Area reference dalam Postal Code API menggunakan:

```json
{
  "code": "327301",
  "name": "Kesambi",
  "level": "district",
  "source": "OFFICIAL"
}
```

Fields:

| Field    | Description                                       |
| -------- | ------------------------------------------------- |
| `code`   | Canonical administrative code                     |
| `name`   | Official administrative name                      |
| `level`  | `province`, `regency`, `district`, atau `village` |
| `source` | `OFFICIAL` atau `AUGMENTED`                       |

Postal Code API tidak wajib mengembalikan full breadcrumb pada MVP.

Consumer dapat mengambil hierarchy melalui:

```http
GET /v1/areas/{code}
```

## 12. Query Parameter Validation

### `q`

`q` wajib diberikan pada search.

Missing:

```text
400 INVALID_REQUEST
```

Empty:

```text
400 INVALID_REQUEST
```

### `limit`

Valid range:

```text
1–100
```

Invalid:

```text
400 INVALID_LIMIT
```

### `postal_code`

Lookup menggunakan exact value.

Unknown:

```text
404 POSTAL_CODE_NOT_FOUND
```

## 13. Error Contract

Semua error menggunakan format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message."
  }
}
```

Error minimum:

```text
INVALID_REQUEST
INVALID_API_KEY
API_KEY_REVOKED
INVALID_LIMIT
AREA_NOT_FOUND
POSTAL_CODE_NOT_FOUND
RATE_LIMITED
INTERNAL_ERROR
```

Internal implementation details seperti stack trace, SQL query, atau database error tidak boleh dikembalikan kepada consumer.

## 14. Data Requirements

Importer/integration harus mempertahankan:

- postal code dari source;
- relationship dengan administrative area;
- provenance/status;
- metadata source jika tersedia.

Postal code tidak boleh kehilangan leading zero.

Administrative relationship harus menggunakan canonical `region-id.code`.

Duplicate relationship harus tidak menghasilkan duplicate API result.

## 15. Acceptance Criteria

### Get Postal Code

- [ ] Valid postal code menghasilkan `200`.
- [ ] Response memiliki `postal_code`.
- [ ] Response memiliki `areas`.
- [ ] Postal code dapat memiliki multiple areas.
- [ ] Area memiliki `code`.
- [ ] Area memiliki `name`.
- [ ] Area memiliki `level`.
- [ ] Area memiliki `source`.
- [ ] Canonical administrative code dipertahankan.
- [ ] Leading zero postal code dipertahankan.
- [ ] Unknown postal code menghasilkan `404 POSTAL_CODE_NOT_FOUND`.
- [ ] Missing API key menghasilkan `401`.
- [ ] Invalid API key menghasilkan `401`.
- [ ] Revoked API key menghasilkan `403`.

### Search Postal Codes

- [ ] `q` wajib.
- [ ] Missing `q` menghasilkan `400 INVALID_REQUEST`.
- [ ] Empty `q` menghasilkan `400 INVALID_REQUEST`.
- [ ] Postal code dapat dicari berdasarkan exact/prefix value.
- [ ] Area name dapat digunakan untuk search.
- [ ] Search area name case-insensitive.
- [ ] Search menggunakan prefix matching.
- [ ] Result tidak memiliki duplicate postal code.
- [ ] Default limit adalah 20.
- [ ] Maximum limit adalah 100.
- [ ] Invalid limit menghasilkan `400 INVALID_LIMIT`.
- [ ] Empty result menghasilkan `200` dengan array kosong.
- [ ] Authentication wajib.

### Area → Postal Codes

- [ ] Valid area code menghasilkan `200`.
- [ ] Canonical area code digunakan.
- [ ] Result berisi postal codes yang terkait.
- [ ] Result tidak duplicate.
- [ ] Postal codes deterministic ordering.
- [ ] Valid area tanpa postal code menghasilkan array kosong.
- [ ] Unknown area menghasilkan `404 AREA_NOT_FOUND`.
- [ ] Authentication wajib.

### Provenance

- [ ] `OFFICIAL` dapat dibedakan dari `AUGMENTED`.
- [ ] API tidak menyamakan kedua status.
- [ ] Metadata/confidence augmented dipertahankan jika tersedia dari source.

## 16. Testing Requirements

### Postal Code Lookup

Test minimal:

```text
valid postal code
unknown postal code
multiple areas
leading zero
canonical administrative code
official source
augmented source
authentication
```

### Search

Test minimal:

```text
search by postal code
search by postal code prefix
search by area name
case-insensitive area search
prefix area search
duplicate postal code elimination
limit
empty result
missing q
empty q
invalid limit
authentication
```

### Area → Postal Codes

Test minimal:

```text
valid area
multiple postal codes
no postal codes
unknown area
duplicate relationship
deterministic ordering
authentication
```

### Data Integration

Test minimal:

```text
postal-code-id import
administrative relationship resolution
canonical region-id code preservation
OFFICIAL/AUGMENTED preservation
leading zero preservation
idempotent import
duplicate detection
```

## 17. Definition of Done

Postal Code API dianggap selesai apabila:

- [ ] `GET /v1/postal-codes/{postal_code}` tersedia.
- [ ] `GET /v1/postal-codes/search` tersedia.
- [ ] `GET /v1/areas/{code}/postal-codes` tersedia.
- [ ] `postal-code-id` berhasil diintegrasikan.
- [ ] Administrative relationships menggunakan canonical `region-id.code`.
- [ ] Leading zero postal code dipertahankan.
- [ ] `OFFICIAL` dan `AUGMENTED` dapat dibedakan.
- [ ] Authentication berjalan.
- [ ] Error contract konsisten.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] API tests pass.
- [ ] OpenAPI specification tersedia.
- [ ] Acceptance criteria terpenuhi.

## 18. Out of Scope Reminder

Implementasi feature ini tidak boleh memperluas scope menjadi:

- reverse geocoding;
- boundary;
- PostGIS spatial processing;
- fuzzy search;
- alias system;
- semantic search;
- bulk enrichment;
- territory;
- coverage;
- billing;
- advanced analytics.

Reverse geocoding tetap menjadi future phase setelah boundary dataset tersedia.
