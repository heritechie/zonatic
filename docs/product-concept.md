# Zonatic — Rancangan Produk

## Ringkasan

Zonatic adalah **Indonesia Location Intelligence Platform** untuk mengubah koordinat menjadi konteks dan keputusan operasional berbasis wilayah.

Zonatic bukan aplikasi vertikal seperti collection, logistik, atau CRM. Zonatic menyediakan kapabilitas geografis generik yang dapat dipakai sistem-sistem tersebut: wilayah administratif, enrichment data lokasi, coverage, territory, dan verifikasi lokasi lapangan.

> Zonatic membantu bisnis mengubah koordinat menjadi keputusan operasional berbasis wilayah administratif Indonesia.

## Masalah yang diselesaikan

Pelanggan umumnya memiliki koordinat atau alamat, tetapi belum dapat menggunakannya secara konsisten untuk operasi. Mereka perlu menjawab:

- Titik ini berada di provinsi, kota/kabupaten, kecamatan, dan kelurahan mana?
- Dari ribuan titik, bagaimana persebarannya per area administratif?
- Apakah titik ini termasuk area layanan atau wilayah kerja tertentu?
- Bagaimana membentuk wilayah kerja yang jelas dan seimbang dari banyak titik operasional?
- Bagaimana memverifikasi bahwa anggota tim lapangan berada di wilayah tugasnya saat melakukan check-in?

## Kapabilitas produk

```text
Zonatic
│
├─ Administrative Geocoding API
├─ Bulk Location Enrichment
├─ Location Data Quality
├─ Custom Coverage
├─ Territory Builder
└─ Field Location Verification
```

### 1. Administrative Geocoding API

Mengubah satu koordinat WGS84 menjadi hierarchy administratif Indonesia.

```text
latitude, longitude
        ↓
provinsi → kabupaten/kota → kecamatan → desa/kelurahan
```

Contoh endpoint:

```http
GET /v1/reverse-geocode?latitude=-6.19&longitude=106.81
```

Data inti menyimpan batas administratif sebagai `MULTIPOLYGON` di PostGIS dengan SRID EPSG:4326 dan kode wilayah yang stabil.

### 2. Bulk Location Enrichment

Memproses banyak koordinat sekaligus, menambahkan hierarchy administratif pada setiap titik, lalu membuat ringkasan/grouping berdasarkan level yang dipilih.

Input generik:

```json
{
  "group_by_level": "district",
  "points": [
    {"external_id": "REC-001", "latitude": -6.19, "longitude": 106.81}
  ]
}
```

Hasil dapat mencakup data per titik, titik tidak cocok, dan agregasi jumlah titik per provinsi/kota/kecamatan/kelurahan. `external_id` adalah identitas milik pelanggan; Zonatic tidak memerlukan data bisnis atau data pribadi di baliknya.

Untuk payload kecil, proses dapat sinkron. Untuk data besar, gunakan job asinkron dengan status, progres, dan tautan hasil unduhan.

### 3. Location Data Quality

Memvalidasi kualitas data lokasi sebelum dipakai proses bisnis.

- validasi rentang latitude dan longitude;
- deteksi latitude/longitude yang tertukar;
- deteksi titik di luar Indonesia atau di luar batas administratif yang tersedia;
- deteksi titik duplikat;
- laporkan level administratif paling detail yang berhasil ditemukan;
- sediakan daftar baris bermasalah untuk diperbaiki pelanggan.

### 4. Custom Coverage

Pelanggan membuat area milik mereka sendiri dan memeriksa apakah sebuah titik berada di dalam area tersebut.

Coverage dapat dibuat melalui:

- GeoJSON Polygon atau MultiPolygon;
- radius/lingkaran yang dikonversi menjadi poligon;
- gabungan sejumlah wilayah administratif.

Contoh endpoint:

```http
POST /v1/coverages
GET  /v1/coverage-check?latitude=-6.19&longitude=106.81
```

Satu titik dapat cocok dengan lebih dari satu coverage; API mengembalikan seluruh match agar pelanggan dapat menerapkan aturan prioritas mereka sendiri.

### 5. Territory Builder

Territory Builder membantu pengguna menyusun wilayah kerja dari kumpulan titik operasional. Ini bukan sekadar menggambar coverage; sistem memberikan pembagian berbasis area administratif, kepadatan titik, dan target beban kerja.

```text
Upload banyak titik
        ↓
Enrichment & grouping administratif
        ↓
Saran pembagian territory
        ↓
Review/edit pada peta
        ↓
Publish territory dan coverage terkait
```

Mode awal yang direkomendasikan adalah **semi-otomatis**: Zonatic menyarankan pembagian, sementara manager pengguna tetap meninjau dan menyetujui hasilnya.

Parameter yang dapat dipakai:

- level pembagian: kota/kabupaten, kecamatan, atau kelurahan;
- jumlah territory yang diinginkan;
- target maksimum titik per territory;
- area yang harus tetap berada dalam satu territory;
- territory yang tidak boleh tumpang tindih;
- prioritas atau kapasitas operasional yang diberikan pelanggan.

Output territory menyimpan daftar kode area administratif, coverage hasil gabungan geometri, dan metrik seperti jumlah titik atau titik yang tidak cocok.

### 6. Field Location Verification

Webview mobile ringan untuk memverifikasi lokasi saat event kerja, misalnya check-in kunjungan. Sistem pelanggan membuat sesi bertoken; petugas memberi izin lokasi lalu Zonatic memeriksa wilayah administratif dan membership coverage.

```text
Sistem pelanggan membuat sesi
        ↓
Petugas membuka Webview di ponsel
        ↓
Petugas memilih "Verifikasi lokasi"
        ↓
Zonatic mengecek titik, akurasi GPS, dan coverage
        ↓
Hasil dikirim ke callback/webhook pelanggan
```

Zonatic tidak perlu menyimpan detail bisnis pelanggan. Sesi cukup menggunakan `external_ref`, coverage yang diizinkan, masa berlaku, dan callback URL.

## Contoh penggunaan

### Tim collection

Sistem collection mengirim koordinat banyak akun ke Bulk Location Enrichment, lalu memperoleh jumlah akun per kecamatan. Manager memakai Territory Builder untuk membagi kecamatan dan beban akun ke beberapa territory. Setelah disetujui, sistem collection menggunakan Coverage Check untuk menentukan territory bagi akun baru. Saat check-in, field webview memverifikasi bahwa petugas berada di coverage tugasnya.

### Sales force FMCG

Perusahaan memetakan outlet berdasarkan kecamatan, membentuk territory sales dengan jumlah outlet seimbang, lalu mengirim hasil territory ke CRM mereka.

### Logistik

Operator mengelompokkan alamat pengiriman berdasarkan wilayah administrasi dan coverage hub agar titik pengiriman baru dapat diarahkan ke area operasional yang benar.

## Prinsip desain

- **API-first, Console-assisted.** API dipakai sistem pelanggan; Zonatic Console membantu admin/manager melakukan upload, review peta, dan pengelolaan coverage/territory.
- **Generic.** Zonatic tidak menjadi aplikasi collection, CRM, atau dispatch. Keputusan bisnis dan data domain sensitif tetap berada di sistem pelanggan.
- **Indonesia-first.** Nilai utama adalah data dan hierarchy administratif Indonesia yang akurat, berversi, serta mudah dipakai.
- **Multi-tenant by design.** Semua objek milik pelanggan seperti coverage, territory, batch job, dan API key terisolasi dengan `tenant_id`.
- **Privacy-aware.** Field Webview mengambil lokasi hanya ketika pengguna melakukan aksi dan memberi izin. Simpan akurasi, waktu, dan audit log; hindari tracking kontinu sebagai default.
- **Auditable.** Data batas, import, coverage, dan territory memiliki versi agar hasil keputusan dapat ditelusuri kembali.

## Zonatic Console

Antarmuka web untuk pengguna non-teknis, bukan pengganti API.

- Upload CSV/GeoJSON dan monitor batch job;
- melihat titik serta hasil grouping di peta;
- mengunduh hasil enrichment;
- membuat coverage dari area administratif;
- menyusun, meninjau, dan mempublikasikan territory;
- mengelola API key, usage, dan audit log.

## Prioritas pengembangan

| Tahap | Fokus | Hasil |
| --- | --- | --- |
| 1 | Data batas resmi + reverse geocoding | API dasar yang akurat dan dapat dipercaya |
| 2 | Bulk enrichment + data quality | Upload/batch koordinat dan grouping administratif |
| 3 | Custom coverage | Pembuatan area serta pengecekan point-in-coverage |
| 4 | Zonatic Console | Workflow upload, peta, review, dan ekspor |
| 5 | Territory Builder | Rekomendasi dan pengelolaan pembagian wilayah kerja |
| 6 | Field Webview | Verifikasi lokasi saat event lapangan |

## Batas produk

Zonatic tidak mencakup:

- navigasi/routing dan ETA;
- manajemen piutang, CRM, dispatch, atau workflow collection;
- pelacakan lokasi secara kontinu;
- keputusan otomatis tentang assignment tanpa aturan dan persetujuan pelanggan.

Integrasi dengan produk-produk tersebut dapat dilakukan melalui API dan webhook.
