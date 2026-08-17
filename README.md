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
    "regency_or_city": {"code": "31.71", "name": "Kota Administrasi Jakarta Pusat", "level": 2, "parent_code": "31", "metadata": {"source": "sample", "type": "city"}},
    "district": {"code": "31.71.01", "name": "Kecamatan Tanah Abang", "level": 3, "parent_code": "31.71", "metadata": {"source": "sample", "type": "district"}},
    "village_or_ward": {"code": "31.71.01.1001", "name": "Kelurahan Gelora", "level": 4, "parent_code": "31.71.01", "metadata": {"source": "sample", "type": "urban_village"}}
  },
  "areas": [
    {"code": "31", "name": "DKI Jakarta", "level": 1, "parent_code": null, "metadata": {"source": "sample", "type": "province"}},
    {"code": "31.71", "name": "Kota Administrasi Jakarta Pusat", "level": 2, "parent_code": "31", "metadata": {"source": "sample", "type": "city"}},
    {"code": "31.71.01", "name": "Kecamatan Tanah Abang", "level": 3, "parent_code": "31.71", "metadata": {"source": "sample", "type": "district"}},
    {"code": "31.71.01.1001", "name": "Kelurahan Gelora", "level": 4, "parent_code": "31.71.01", "metadata": {"source": "sample", "type": "urban_village"}}
  ]
}
```

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
