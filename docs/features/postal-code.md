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
├── code
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
Postal Code 10270
    ├── Area A
    └── Area B
```

dan:

```text
Area A
    ├── Postal Code 10270
    └── Postal Code 10271
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

Provenance ini adalah metadata level data untuk keperluan import dan audit. Provenance
tidak diekspos sebagai bagian dari public contract; endpoint postal code hanya
mengembalikan `code` dan `areas`.

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
GET /v1/postal-codes/{code}
```

Example:

```http
GET /v1/postal-codes/10270
Authorization: Bearer <api-key>
```

### Success

HTTP `200 OK`.

```json
{
  "data": {
    "code": "10270",
    "areas": [
      {
        "code": "3171011001",
        "name": "Kelurahan Gelora",
        "level": "village",
        "hierarchy": {
          "province": { "code": "31", "name": "DKI Jakarta" },
          "regency": { "code": "3171", "name": "Jakarta Pusat" },
          "district": { "code": "317101", "name": "Tanah Abang" },
          "village": { "code": "3171011001", "name": "Kelurahan Gelora" }
        }
      }
    ]
  }
}
```

### Behavior

- `code` harus exact match.
- Postal code diperlakukan sebagai string.
- Leading zero harus dipertahankan jika terdapat pada source data.
- Response dapat memiliki lebih dari satu administrative area pada level apa pun.
- `areas` selalu berupa array karena relationship `postal_code_areas` bersifat
  many-to-many.
- Area menggunakan canonical `region-id.code` dan object `AreaPublic` yang sama
  dengan `GET /v1/areas`.
- Areas diurutkan berdasarkan administrative level, kemudian canonical code.
- `metadata`, `id`, dan `parent_code` tidak diekspos sebagai bagian dari public
  contract.

### Not Found

Jika postal code tidak ditemukan:

HTTP `404`.

```json
{
  "error": {
    "code": "POSTAL_CODE_NOT_FOUND",
    "message": "Kode pos tidak ditemukan"
  }
}
```

## 8. Endpoint: Search Postal Codes

### Request

```http
GET /v1/postal-codes/search?q=...&limit=...
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
GET /v1/postal-codes/search?q=102&limit=20
Authorization: Bearer <api-key>
```

### Search Behavior

Search scoped pada postal code saja:

- `q` dicocokkan sebagai **prefix** pada postal code (`ILIKE 'q%'`);
- matching bersifat case-insensitive;
- nama administrative area tidak searched; pencarian area dilakukan melalui
  `GET /v1/areas?q=...`;
- hasil diurutkan canonical code ascending;
- `limit` membatasi jumlah hasil.

Search tidak menggunakan:

- contains matching;
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
      "code": "10270",
      "areas": [
        {
          "code": "3171011001",
          "name": "Kelurahan Gelora",
          "level": "village",
          "hierarchy": {
            "province": { "code": "31", "name": "DKI Jakarta" },
            "regency": { "code": "3171", "name": "Jakarta Pusat" },
            "district": { "code": "317101", "name": "Tanah Abang" },
            "village": { "code": "3171011001", "name": "Kelurahan Gelora" }
          }
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

Setiap item pada `data` memakai object yang sama dengan hasil `GET /v1/postal-codes/{code}`.

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

Endpoint ini adalah relasi balik dari resource postal code: menjawab "postal code
mana yang menutupi area ini", bukan primitive terpisah.

### Request

```http
GET /v1/areas/{code}/postal-codes
```

Example:

```http
GET /v1/areas/3171011001/postal-codes
Authorization: Bearer <api-key>
```

### Success

HTTP `200 OK`.

```json
{
  "code": "3171011001",
  "name": "Kelurahan Gelora",
  "postal_codes": ["10270"]
}
```

### Behavior

- `{code}` menggunakan canonical administrative code.
- `postal_codes` adalah array of string, bukan array of object.
- Hanya relationship yang terkait langsung dengan area tersebut yang dikembalikan.
- Postal codes diurutkan canonical code ascending.
- Area yang valid tetapi tidak memiliki postal code menghasilkan array kosong.

### Unknown Area

Jika administrative code tidak ditemukan:

HTTP `404`.

```json
{
  "error": {
    "code": "AREA_NOT_FOUND",
    "message": "Wilayah tidak ditemukan"
  }
}
```

## 10. Response Area Object

Area reference dalam Postal Code API menggunakan object yang sama dengan
`GET /v1/areas`:

```json
{
  "code": "317101",
  "name": "Tanah Abang",
  "level": "district",
  "hierarchy": {
    "province": { "code": "31", "name": "DKI Jakarta" },
    "regency": { "code": "3171", "name": "Jakarta Pusat" },
    "district": { "code": "317101", "name": "Tanah Abang" }
  }
}
```

Fields:

| Field        | Description                                                          |
| ------------ | -------------------------------------------------------------------- |
| `code`       | Canonical administrative code, tanpa separator `.`                    |
| `name`       | Official administrative name                                          |
| `level`      | `province`, `regency`, `district`, atau `village`                     |
| `hierarchy`  | Ancestor dan area itu sendiri, keyed by level                         |

Provenance/status data disimpan pada database untuk keperluan import, tetapi
tidak merupakan bagian dari public contract dan tidak dikembalikan oleh endpoint
postal code.

## 11. Query Parameter Validation

### `q`

`q` wajib diberikan pada search.

Missing atau empty:

```text
422 INVALID_REQUEST
```

### `limit`

Valid range:

```text
1–100
```

Nilai di luar range:

```text
422 INVALID_REQUEST
```

Tidak ada error code khusus `INVALID_LIMIT`; pelanggaran range dan bentuk
parameter ditangani oleh envelope `INVALID_REQUEST` yang sama.

### `code`

Lookup menggunakan exact value.

Unknown:

```text
404 POSTAL_CODE_NOT_FOUND
```

## 12. Error Contract

Semua error menggunakan format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message."
  }
}
```

Error yang diimplementasikan:

```text
INVALID_REQUEST
INVALID_API_KEY
API_KEY_REVOKED
AREA_NOT_FOUND
POSTAL_CODE_NOT_FOUND
```

Internal implementation details seperti stack trace, SQL query, atau database error tidak boleh dikembalikan kepada consumer.

## 13. Data Requirements

Importer/integration harus mempertahankan:

- postal code dari source;
- relationship dengan administrative area;
- provenance/status;
- metadata source jika tersedia.

Postal code tidak boleh kehilangan leading zero.

Administrative relationship harus menggunakan canonical `region-id.code`.

Duplicate relationship harus tidak menghasilkan duplicate API result.

## 14. Acceptance Criteria

### Get Postal Code

- [x] Valid postal code menghasilkan `200`.
- [x] Response dibungkus `data`.
- [x] Response memiliki `code`.
- [x] Response memiliki `areas` berupa array.
- [x] Postal code dapat memiliki multiple areas.
- [x] Area memiliki `code`.
- [x] Area memiliki `name`.
- [x] Area memiliki `level` canonical.
- [x] Area memiliki `hierarchy`.
- [x] Area tidak mengekspos `metadata` atau `parent_code`.
- [x] Canonical administrative code dipertahankan.
- [x] Leading zero postal code dipertahankan.
- [x] Unknown postal code menghasilkan `404 POSTAL_CODE_NOT_FOUND`.
- [x] Missing API key menghasilkan `401`.
- [x] Invalid API key menghasilkan `401`.
- [x] Revoked API key menghasilkan `403`.

### Search Postal Codes

- [x] `q` wajib.
- [x] Missing `q` menghasilkan `422 INVALID_REQUEST`.
- [x] Empty `q` menghasilkan `422 INVALID_REQUEST`.
- [x] Postal code dapat dicari berdasarkan prefix value.
- [x] Search bersifat case-insensitive.
- [x] Search tidak lagi mencari berdasarkan nama area.
- [x] Result tidak memiliki duplicate postal code.
- [x] Default limit adalah 20.
- [x] Maximum limit adalah 100.
- [x] Invalid limit menghasilkan `422 INVALID_REQUEST`.
- [x] Empty result menghasilkan `200` dengan array kosong.
- [x] Authentication wajib.

### Area → Postal Codes

- [x] Valid area code menghasilkan `200`.
- [x] Canonical area code digunakan.
- [x] Result berisi postal codes sebagai array of string.
- [x] Result tidak duplicate.
- [x] Postal codes deterministic ordering.
- [x] Valid area tanpa postal code menghasilkan array kosong.
- [x] Unknown area menghasilkan `404 AREA_NOT_FOUND`.
- [x] Authentication wajib.

### Provenance

- [x] `OFFICIAL` dapat dibedakan dari `AUGMENTED` pada level data import.
- [x] Provenance tidak diekspos sebagai bagian dari public contract.
- [x] Metadata/confidence augmented dipertahankan jika tersedia dari source.

## 15. Testing Requirements

### Postal Code Lookup

Test minimal:

```text
valid postal code
unknown postal code
multiple areas
leading zero
canonical administrative code
authentication
```

### Search

Test minimal:

```text
search by postal code
search by postal code prefix
case-insensitive postal code search
area name does not match
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

## 16. Definition of Done

Postal Code API dianggap selesai apabila:

- [x] `GET /v1/postal-codes/{code}` tersedia.
- [x] `GET /v1/postal-codes/search` tersedia.
- [x] `GET /v1/areas/{code}/postal-codes` tersedia.
- [x] `postal-code-id` berhasil diintegrasikan.
- [x] Administrative relationships menggunakan canonical `region-id.code`.
- [x] Leading zero postal code dipertahankan.
- [x] Authentication berjalan.
- [x] Error contract konsisten.
- [x] Unit tests pass.
- [x] Integration tests pass.
- [x] API tests pass.
- [x] OpenAPI specification tersedia.
- [x] Acceptance criteria terpenuhi.

## 17. Out of Scope Reminder

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
