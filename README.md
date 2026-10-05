# Zonatic

POC API reverse geocoding khusus batas administratif Indonesia. API menerima koordinat WGS84 (`latitude`, `longitude`) lalu mengembalikan wilayah yang melingkupinya: provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan.

## Jalankan

```bash
cp .env.example .env
docker compose up --build
```

API tersedia di `http://localhost:8000`, dengan dokumentasi interaktif di `http://localhost:8000/docs`.

```bash
curl 'http://localhost:8000/v1/reverse-geocode?latitude=-6.19&longitude=106.81'
```

Contoh respons (data sampel):

```json
{
  "latitude": -6.19,
  "longitude": 106.81,
  "matched": true,
  "address": {
    "province": {"code": "31", "name": "DKI Jakarta", "level": 1, "parent_code": null, "metadata": {"source": "sample", "type": "province"}},
    "regency_or_city": {"code": "3171", "name": "Kota Administrasi Jakarta Pusat", "level": 2, "parent_code": "31", "metadata": {"source": "sample", "type": "city"}},
    "district": {"code": "317101", "name": "Kecamatan Tanah Abang", "level": 3, "parent_code": "317101", "metadata": {"source": "sample", "type": "district"}},
    "village_or_ward": {"code": "3171011001", "name": "Kelurahan Gelora", "level": 4, "parent_code": "317101", "metadata": {"source": "sample", "type": "urban_village"}}
  },
  "areas": [
    {"code": "31", "name": "DKI Jakarta", "level": 1, "parent_code": null, "metadata": {"source": "sample", "type": "province"}},
    {"code": "3171", "name": "Kota Administrasi Jakarta Pusat", "level": 2, "parent_code": "31", "metadata": {"source": "sample", "type": "city"}},
    {"code": "317101", "name": "Kecamatan Tanah Abang", "level": 3, "parent_code": "317101", "metadata": {"source": "sample", "type": "district"}},
    {"code": "3171011001", "name": "Kelurahan Gelora", "level": 4, "parent_code": "317101", "metadata": {"source": "sample", "type": "urban_village"}}
  ]
}
```

## Postal code lookup

`postal_code_areas` is many-to-many, so a postal code can be related to several
administrative areas at any administrative level. The API does not assume a
postal code maps to village level only, and `areas` is therefore always an
array.

```bash
# Exact lookup
curl -H 'Authorization: Bearer <api-key>' \
  'http://localhost:8000/v1/postal-codes/10270'

# Prefix search (q required, limit default 20, range 1..100)
curl -H 'Authorization: Bearer <api-key>' \
  'http://localhost:8000/v1/postal-codes/search?q=102&limit=20'
```

Exact lookup returns `{"data": {"code", "areas": [...]}}`. Search returns
`{"data": [...], "meta": {"limit", "count"}}`. Each area carries `code`, `name`,
a canonical `level` (`province` / `regency` / `district` / `village`), and the
same `hierarchy` object `/v1/areas` returns, keyed by level name. Areas are
ordered by administrative level then code. Import/source `metadata`, internal
ids, and `parent_code` are not exposed.

Search matches the postal code with a case-insensitive **prefix** only
(`ILIKE 'q%'`), consistent with `/v1/areas`. Administrative-area names are not
searched here; use `/v1/areas` for name lookup. An unknown code returns 404
`POSTAL_CODE_NOT_FOUND`; a search that matches nothing returns an empty
`data` array.

`/v1/areas/{code}/postal-codes` is the reverse relation of the area resource,
not a separate primitive. It returns the area `code`, `name`, and the covering
postal codes as a sorted list of code strings.

## Administrative hierarchy

Two navigation styles over the same `administrative_areas` table and the same
query implementation. Pick whichever fits: `children` for generic
walk-up-the-tree code, the fixed routes for selector UIs that already know
which level they are on.

```bash
# Generic: direct children of any area
curl -H 'Authorization: Bearer <api-key>' 'http://localhost:8000/v1/areas/32/children'
curl -H 'Authorization: Bearer <api-key>' 'http://localhost:8000/v1/areas/3274/children'
curl -H 'Authorization: Bearer <api-key>' 'http://localhost:8000/v1/areas/327401/children'

# Convenience: level-specific routes rooted at the provinces
curl -H 'Authorization: Bearer <api-key>' 'http://localhost:8000/v1/areas/provinces'
curl -H 'Authorization: Bearer <api-key>' 'http://localhost:8000/v1/areas/provinces/32/regencies'
curl -H 'Authorization: Bearer <api-key>' 'http://localhost:8000/v1/areas/provinces/32/regencies/3274/districts'
curl -H 'Authorization: Bearer <api-key>' 'http://localhost:8000/v1/areas/provinces/32/regencies/3274/districts/327401/villages'
```

All five return the standard area list shape — `AreaPublic` items in `data`, with
`meta.limit` and `meta.count`:

```json
{
  "data": [
    {
      "code": "327401",
      "name": "...",
      "level": "district",
      "hierarchy": { "province": {"code": "...", "name": "..."}, "...": {} }
    }
  ],
  "meta": { "limit": 20, "count": 1 }
}
```

Behaviour worth knowing:

- **`children` is one level deep only.** A province returns its regencies, not
  the entire subtree. Walk down one request per level.
- **`level` is one of `province`, `regency`, `district`, `village`.** `regency`
  deliberately covers both kabupaten and kota: at this abstraction they are the
  same level, so there is no separate `cities` resource.
- **Ordering is canonical code ascending**, matching the deterministic ordering
  used elsewhere.
- **`limit` is `20` by default, `1..100`.** No offset or page pagination yet.
- **No children is a success, not an error.** A village has none, so
  `/v1/areas/3274011001/children` returns `200` with `"data": []`.
- **Hierarchy paths are fully validated.** `327401` must really be a child of
  `3274` inside province `32`. A code that exists but belongs to a different
  branch returns `404 AREA_NOT_FOUND` rather than a plausible list from the
  wrong subtree, at every level.

All area routes require a valid API key, exactly like the rest of `/v1`.

## Struktur data

Tabel `administrative_areas` menyimpan geometri `MULTIPOLYGON` dalam SRID 4326, kode stabil, level, dan relasi parent. Indeks GiST pada `geometry` dipakai oleh PostGIS saat pencarian titik-dalam-poligon.

| `level` | Cakupan |
| --- | --- |
| 1 | Provinsi |
| 2 | Kabupaten / kota |
| 3 | Kecamatan |
| 4 | Desa / kelurahan |

`db/init/002_sample_data.sql` hanya data berbentuk kotak untuk smoke test—bukan batas resmi. Script dalam `db/init/` hanya berjalan pada volume PostgreSQL baru.

## Mengimpor batas resmi

1. Ambil data batas administratif yang lisensinya mengizinkan penggunaan komersial dan simpan metadata sumber/lisensinya di kolom `metadata`.
2. Normalisasikan ke EPSG:4326 dan validasikan geometri (`ST_MakeValid` jika dibutuhkan).
3. Muat per level ke `administrative_areas`, gunakan kode Kemendagri/BPS yang konsisten dan isi `parent_code`.
4. Setelah mengganti data sampel pada database lokal, gunakan `docker compose down -v` lalu `docker compose up --build` untuk menginisialisasi ulang volume.

Untuk lingkungan SaaS, langkah berikutnya yang disarankan: Alembic untuk migrasi, import pipeline terpisah, cache Redis, rate limit/API key, observability, dan data versioning.

## Import GeoJSON

Importer menerima GeoJSON `FeatureCollection` atau satu `Feature` bergeometri `Polygon`/`MultiPolygon`. Setiap import disimpan dalam `import_runs`, lalu seluruh feature masuk lebih dulu ke `administrative_areas_staging`. Hanya baris yang lolos validasi yang di-upsert ke tabel produksi berdasarkan `code`.

Pada database yang **sudah** dibuat sebelum fitur importer ini ditambahkan, terapkan skema sekali saja:

```bash
docker compose exec -T db psql -U zonatic -d zonatic -f /docker-entrypoint-initdb.d/003_import_pipeline.sql
```

Validasi file tanpa mengubah data produksi:

```bash
docker compose exec api python -m app.importers.cli import \
  --file /app/examples/kelurahan-contoh.geojson \
  --level 4 \
  --code-field kode \
  --name-field nama \
  --parent-code-field kode_kecamatan \
  --source "contoh-internal" \
  --version "2026-08" \
  --license "internal" \
  --dry-run
```

Untuk menjalankan import sebenarnya, hapus `--dry-run`. `--source-srid` dapat dipakai bila file bukan EPSG:4326; importer akan mentransformasikan geometri ke EPSG:4326.

Laporan JSON menampilkan `total`, `imported`, `invalid`, `inserted`, dan `updated`. Baris gagal tetap tersimpan di staging beserta alasan error untuk diaudit.
