/**
 * Bilingual Terms of Service content.
 *
 * This file is the single source of truth for both Bahasa Indonesia and
 * English copies of the Terms. Sections are ordered identically across the
 * two locales; titles differ in wording only.
 *
 * Placeholders (`[LEGAL ENTITY NAME]`, `[BUSINESS ADDRESS]`, `[YYYY-MM-DD]`)
 * are intentionally left verbatim until the legal entity, registered address,
 * and effective date are confirmed by counsel.
 */
import type { Locale } from "./types";

export type TermsSection = {
  title: string;
  body?: string;
  list?: string[];
};

export type TermsContent = {
  title: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  sections: TermsSection[];
  contact: { title: string; body: string };
  placeholders: { entity: string; jurisdiction: string; email: string };
};

export const terms: Record<Locale, TermsContent> = {
  id: {
    title: "Syarat dan Ketentuan",
    lastUpdatedLabel: "Terakhir diperbarui",
    lastUpdated: "[YYYY-MM-DD]",
    sections: [
      {
        title: "Penerimaan Ketentuan",
        body:
          "Dengan mengakses atau menggunakan situs web, Console, API, atau layanan Zonatic lainnya, Anda menyetujui Syarat dan Ketentuan ini. Jika Anda tidak menyetujui ketentuan ini, mohon untuk tidak menggunakan Layanan.",
      },
      {
        title: "Definisi",
        list: [
          "“Zonatic” adalah platform location intelligence beserta layanan pendukung yang disediakan untuk pasar Indonesia.",
          "“Layanan” adalah situs web, Console, API, dokumentasi, dan materi terkait lainnya yang disediakan Zonatic.",
          "“User” adalah individu yang mengakses atau menggunakan Layanan.",
          "“Customer” adalah entitas yang memiliki Workspace dan menggunakan Layanan untuk tujuan bisnis atau profesional.",
          "“Workspace” adalah lingkungan terisolasi yang disediakan Zonatic untuk setiap Customer, tempat API Key, sumber daya, dan konfigurasi Customer dikelola.",
          "“API Key” adalah token kredensial yang diterbitkan Zonatic untuk mengidentifikasi dan mengotorisasi permintaan API atas nama Customer.",
          "“Customer Data” adalah data yang dikirimkan, diunggah, atau disediakan oleh Customer ke Layanan untuk diproses oleh Zonatic.",
          "“Geographic Data” adalah dataset geografis, administratif, pos, atau lokasi terkait lainnya yang digunakan atau disediakan oleh Zonatic untuk menghasilkan keluaran Layanan.",
        ],
      },
      {
        title: "Layanan Zonatic",
        body:
          "Zonatic adalah platform location intelligence yang menyediakan kemampuan pemrosesan data geografis dan infrastruktur terkait untuk pasar Indonesia. Kemampuan Layanan dapat mencakup antara lain administrative geocoding, administrative directory, bulk location enrichment, location data quality, custom coverage, territory management, field location verification, serta akses melalui Console dan API. Zonatic menyediakan data geografis dan kemampuan pemrosesan; keputusan bisnis dan operasional tetap menjadi tanggung jawab Customer kecuali disepakati lain secara eksplisit.",
      },
      {
        title: "Akun dan Workspace",
        body:
          "Setiap User menggunakan Layanan melalui Workspace yang dimiliki Customer. Customer bertanggung jawab atas keakuratan informasi yang diberikan saat pembuatan dan pemeliharaan Workspace. User bertanggung jawab menjaga kerahasiaan kredensial akun dan atas seluruh aktivitas yang terjadi pada akunnya. Zonatic tidak bertanggung jawab atas kerugian yang timbul akibat kelalaian User atau Customer dalam menjaga kredensial.",
      },
      {
        title: "Penggunaan API dan API Key",
        body:
          "API Key adalah kredensial yang diterbitkan Zonatic untuk Customer. Customer wajib menjaga kerahasiaan API Key dan tidak mengeksposnya secara publik ketika seharusnya tetap rahasia. Customer bertanggung jawab atas seluruh permintaan API yang menggunakan API Key-nya, termasuk yang dilakukan oleh User di dalam Workspace-nya. Jika API Key dicurigai atau diketahui terkompromi, Customer wajib segera melakukan rotasi atau pencabutan melalui Console. Zonatic dapat memberlakukan rate limit, kuota, atau pembatasan penggunaan lainnya atas API. Customer dilarang menghindari, merekayasa balik, atau menyalahgunakan mekanisme rate limit, kuota, atau pembatasan tersebut.",
      },
      {
        title: "Customer Data",
        body:
          "Customer tetap memiliki hak atas Customer Data sejauh hak tersebut memang dimiliki atau dikuasainya. Customer memberikan Zonatic hak terbatas, hanya sejauh yang diperlukan untuk meng-host, menyimpan, memproses, mengirimkan, mengamankan, dan menyediakan Layanan dengan menggunakan Customer Data tersebut. Zonatic tidak memperoleh kepemilikan atas Customer Data hanya karena menyediakan Layanan. Customer bertanggung jawab untuk memastikan bahwa Customer Data yang dikirimkannya dilakukan dengan hak, izin, dan dasar hukum yang sah. Customer Data dapat berupa antara lain lintang-bujur, alamat, referensi eksternal, CSV, GeoJSON, data coverage, atau data territory. Zonatic tidak akan menggunakan Customer Data untuk kepentingan yang tidak terkait dengan penyediaan Layanan, termasuk untuk periklanan atau pelatihan model di luar konteks Layanan, kecuali disepakati lain secara eksplisit.",
      },
      {
        title: "Data Geografis dan Administratif",
        body:
          "Zonatic dapat menggunakan dataset geografis, administratif, pos, dan dataset lokasi terkait lainnya dari sumber publik, resmi, atau pihak ketiga untuk menyediakan Layanan. Karakteristik dataset seperti ketersediaan, cakupan, akurasi, kelengkapan, versi, dan atribut lainnya dapat bervariasi antar sumber. Informasi terkait sumber, versi, provenance, dan lisensi dapat disediakan melalui dokumentasi atau materi layanan yang berlaku. Zonatic tidak menjamin bahwa seluruh data geografis berasal dari sumber resmi, dan tidak menjamin akurasi atau otoritas hukum data untuk semua tujuan.",
      },
      {
        title: "Penggunaan yang Dilarang",
        list: [
          "Menggunakan Layanan untuk aktivitas yang melanggar hukum.",
          "Mencoba mendapatkan akses tanpa izin, mengganggu, atau membebani sistem Layanan secara berlebihan.",
          "Membagikan kredensial akun atau API Key kepada pihak yang tidak berwenang.",
          "Menghindari, memanipulasi, atau merekayasa balik mekanisme rate limit, kuota, atau perlindungan Layanan.",
          "Menyalahgunakan infrastruktur Zonatic untuk serangan otomatis, malicious request, atau eskalasi hak istimewa.",
          "Melakukan scraping atau ekstraksi data massal di luar penggunaan yang diizinkan.",
          "Mengganggu ketersediaan, keamanan, atau integritas Layanan atau penggunanya.",
        ],
      },
      {
        title: "Kekayaan Intelektual",
        body:
          "Hak kekayaan intelektual atas perangkat lunak, platform, API, dokumentasi, merek, dan materi Zonatic lainnya tetap dimiliki oleh Zonatic atau pemberi lisensi yang sah. Customer dan User hanya menerima hak terbatas yang diperlukan untuk menggunakan Layanan sesuai dengan Syarat dan Ketentuan ini. Ketentuan ini tidak mengalihkan hak kekayaan intelektual Zonatic apa pun kepada Customer. Customer tetap memiliki hak atas Customer Data yang disediakannya.",
      },
      {
        title: "Layanan dan Integrasi Pihak Ketiga",
        body:
          "Zonatic dapat bergantung pada infrastruktur, penyedia data, penyedia autentikasi, layanan hosting, penyedia peta dan data geografis, serta layanan pihak ketiga lainnya untuk menyediakan Layanan. Zonatic tidak menjamin ketersediaan, kinerja, atau konten pihak ketiga tersebut. Penggunaan layanan pihak ketiga tunduk pada ketentuan masing-masing penyedia.",
      },
      {
        title: "Ketersediaan dan Perubahan Layanan",
        body:
          "Layanan dapat mengalami pemeliharaan, gangguan, perubahan, atau interupsi. Zonatic tidak menjanjikan tingkat ketersediaan spesifik (SLA) untuk bagian Layanan apa pun. Zonatic dapat mengubah, meningkatkan, menghentikan, atau mengganti bagian Layanan, sepanjang tidak melanggar ketentuan yang berlaku.",
      },
      {
        title: "Penafian",
        body:
          "Data geografis dan administratif yang digunakan atau disediakan Zonatic dapat mengandung ketidakakuratan, kekurangan, perubahan, atau perbedaan antar versi dataset. Hasil Layanan bergantung pada input, koordinat, dataset, versi, pemrosesan, dan faktor teknis lainnya. Zonatic tidak menjamin bahwa hasil geografis yang dihasilkan sesuai untuk setiap tujuan bisnis atau operasional tertentu. Customer bertanggung jawab untuk meninjau dan memvalidasi hasil yang digunakan untuk pengambilan keputusan. Zonatic menyediakan data dan kemampuan pemrosesan geografis; keputusan bisnis, operasional, kepatuhan, kredit, wilayah layanan, territory, atau keputusan lain yang didasarkan pada Layanan tetap menjadi tanggung jawab Customer.",
      },
      {
        title: "Pembatasan Tanggung Jawab",
        body:
          "Zonatic tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, konsekuensial, atau hukuman yang timbul dari atau terkait dengan penggunaan Layanan. Batasan ini tidak mengecualikan atau membatasi tanggung jawab yang tidak dapat dikecualikan atau dibatasi menurut hukum yang berlaku.",
      },
      {
        title: "Penangguhan dan Pengakhiran",
        body:
          "Zonatic dapat menangguhkan akses Customer atau User ke Layanan, sebagian atau seluruhnya, jika Zonatic memiliki alasan yang wajar untuk menganggap adanya insiden keamanan atau aktivitas yang mengancam keamanan Layanan, kompromi terhadap kredensial akun atau API Key, penyalahgunaan API atau pelanggaran rate limit, pelanggaran terhadap Syarat dan Ketentuan ini, aktivitas yang melanggar hukum, atau keadaan darurat teknis atau operasional. Zonatic dapat menghentikan akses Customer ke Layanan apabila pelanggaran tidak diperbaiki dalam jangka waktu yang wajar setelah pemberitahuan, atau apabila diperlukan karena keadaan darurat. Setelah pengakhiran, akses Customer ke Layanan dan Console dapat dinonaktifkan, API Key dapat dicabut, penanganan Customer Data tunduk pada kebijakan retensi dan penghapusan yang berlaku, serta klausul yang secara alamiah berlaku setelah pengakhiran tetap berlaku.",
      },
      {
        title: "Perubahan Ketentuan",
        body:
          "Zonatic dapat memperbarui Syarat dan Ketentuan ini dari waktu ke waktu. Perubahan material akan dikomunikasikan melalui cara yang sesuai. Penggunaan Layanan yang berlanjut setelah tanggal berlaku perubahan dianggap sebagai penerimaan terhadap Ketentuan yang diperbarui, sepanjang diperbolehkan oleh hukum yang berlaku.",
      },
      {
        title: "Hukum yang Berlaku",
        body:
          "Syarat dan Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia.",
      },
      {
        title: "Hubungi Kami",
        body:
          "Jika Anda memiliki pertanyaan terkait Syarat dan Ketentuan ini, silakan menghubungi kami di hello@zonatic.id. Entitas hukum: [LEGAL ENTITY NAME]. Alamat: [BUSINESS ADDRESS].",
      },
    ],
    contact: {
      title: "Hubungi Kami",
      body:
        "Pertanyaan mengenai Syarat dan Ketentuan dapat dikirimkan ke hello@zonatic.id. Entitas hukum: [LEGAL ENTITY NAME]. Alamat: [BUSINESS ADDRESS]. Hukum yang berlaku: hukum Republik Indonesia.",
    },
    placeholders: {
      entity: "[LEGAL ENTITY NAME]",
      jurisdiction: "[GOVERNING JURISDICTION]",
      email: "[CONTACT EMAIL]",
    },
  },
  en: {
    title: "Terms of Service",
    lastUpdatedLabel: "Last updated",
    lastUpdated: "[YYYY-MM-DD]",
    sections: [
      {
        title: "Acceptance of Terms",
        body:
          "By accessing or using the website, Console, API, or other Zonatic services, you agree to these Terms of Service. If you do not agree to these terms, please do not use the Services.",
      },
      {
        title: "Definitions",
        list: [
          "“Zonatic” means the location intelligence platform and related services provided for the Indonesian market.",
          "“Services” means the website, Console, API, documentation, and other related materials provided by Zonatic.",
          "“User” means an individual who accesses or uses the Services.",
          "“Customer” means the entity that owns a Workspace and uses the Services for business or professional purposes.",
          "“Workspace” means the isolated environment Zonatic provides for each Customer, in which API Keys, resources, and the Customer's configuration are managed.",
          "“API Key” means a credential token issued by Zonatic to identify and authorize API requests on behalf of a Customer.",
          "“Customer Data” means data submitted, uploaded, or otherwise provided by a Customer to the Services for Zonatic to process.",
          "“Geographic Data” means geographic, administrative, postal, or other location-related datasets used or provided by Zonatic to produce the output of the Services.",
        ],
      },
      {
        title: "Zonatic Services",
        body:
          "Zonatic is a location intelligence platform that provides geographic data processing capabilities and related infrastructure for the Indonesian market. Service capabilities may include administrative geocoding, an administrative directory, bulk location enrichment, location data quality, custom coverage, territory management, field location verification, and access through the Console and API. Zonatic provides geographic data and processing capabilities; business and operational decisions remain the responsibility of the Customer unless explicitly agreed otherwise.",
      },
      {
        title: "Account and Workspace",
        body:
          "Each User uses the Services through a Workspace owned by a Customer. The Customer is responsible for the accuracy of the information provided when creating and maintaining the Workspace. Users are responsible for keeping their account credentials confidential and for all activity that occurs under their account. Zonatic is not responsible for any loss arising from a User's or Customer's failure to safeguard credentials.",
      },
      {
        title: "API and API Key Usage",
        body:
          "API Keys are credentials issued by Zonatic to a Customer. The Customer must keep API Keys confidential and must not expose them publicly where they are intended to remain secret. The Customer is responsible for all API requests made using its API Keys, including those made by Users within its Workspace. If an API Key is suspected or known to be compromised, the Customer must immediately rotate or revoke it through the Console. Zonatic may apply rate limits, quotas, or other usage restrictions to the API. The Customer must not circumvent, reverse engineer, or otherwise abuse these mechanisms.",
      },
      {
        title: "Customer Data",
        body:
          "The Customer retains its rights in Customer Data to the extent those rights are held or controlled by the Customer. The Customer grants Zonatic a limited license, only to the extent necessary, to host, store, process, transmit, secure, and provide the Services using that Customer Data. Zonatic does not acquire ownership of Customer Data merely by providing the Services. The Customer is responsible for ensuring that it has the necessary rights, permissions, and legal basis to submit Customer Data to Zonatic. Customer Data may include, for example, latitude/longitude coordinates, addresses, external references, CSV or GeoJSON files, coverage data, or territory data. Zonatic will not use Customer Data for purposes unrelated to providing the Services, including for advertising or for training models outside the Service context, unless explicitly agreed otherwise.",
      },
      {
        title: "Geographic and Administrative Data",
        body:
          "Zonatic may use geographic, administrative, postal, and other location-related datasets from public, official, or third-party sources to provide the Services. Dataset characteristics such as availability, coverage, accuracy, completeness, version, and other attributes may vary between sources. Information regarding source, version, provenance, and licensing may be made available through documentation or applicable Service materials. Zonatic does not warrant that all of its geographic data originates from official sources, nor does it guarantee the accuracy or legal authority of the data for every purpose.",
      },
      {
        title: "Prohibited Use",
        list: [
          "Using the Services for unlawful activity.",
          "Attempting unauthorized access to, disrupting, or overloading the Services.",
          "Sharing account credentials or API Keys with unauthorized parties.",
          "Circumventing, manipulating, or reverse engineering rate limits, quotas, or other Service protections.",
          "Abusing Zonatic infrastructure for automated attacks, malicious requests, or privilege escalation.",
          "Scraping or bulk-extracting data beyond what the Services explicitly permit.",
          "Interfering with the availability, security, or integrity of the Services or their other users.",
        ],
      },
      {
        title: "Intellectual Property",
        body:
          "Intellectual property rights in the Zonatic software, platform, API, documentation, branding, and other Zonatic materials remain with Zonatic or its licensors. The Customer and its Users receive only the limited rights necessary to use the Services under these Terms. Nothing in these Terms transfers any of Zonatic's intellectual property to the Customer. The Customer retains its rights in the Customer Data it provides.",
      },
      {
        title: "Third-Party Services and Integrations",
        body:
          "Zonatic may rely on infrastructure, data providers, authentication services, hosting, mapping and geographic providers, and other third-party services to provide the Services. Zonatic does not warrant the availability, performance, or content of those third parties. Use of third-party services is subject to each provider's own terms.",
      },
      {
        title: "Service Availability and Changes",
        body:
          "The Services may experience maintenance, outages, changes, or interruptions. Zonatic does not promise a specific service level (SLA) for any part of the Services. Zonatic may modify, improve, discontinue, or replace parts of the Services, subject to applicable obligations.",
      },
      {
        title: "Disclaimer",
        body:
          "The geographic and administrative data used or provided by Zonatic may contain inaccuracies, omissions, changes, or differences between dataset versions. Results depend on inputs, coordinates, datasets, versions, processing, and other technical factors. Zonatic does not warrant that geographic results are suitable for every specific business or operational purpose. The Customer is responsible for reviewing and validating any results used for decision-making. Zonatic provides geographic data and processing capabilities; business, operational, compliance, credit, service-area, territory, or other decisions based on the Services remain the responsibility of the Customer.",
      },
      {
        title: "Limitation of Liability",
        body:
          "Zonatic is not liable for any indirect, incidental, special, consequential, or punitive damages arising from or related to the use of the Services. Nothing in this section excludes or limits any liability that cannot be excluded or limited under applicable law.",
      },
      {
        title: "Suspension and Termination",
        body:
          "Zonatic may suspend a Customer's or User's access to the Services, in whole or in part, if Zonatic has reasonable grounds to believe that there has been a security incident or activity threatening the security of the Services, a compromise of account credentials or API Keys, API abuse or a violation of rate limits, a breach of these Terms, unlawful activity, or a technical or operational emergency. Zonatic may terminate the Customer's access to the Services if the breach is not remedied within a reasonable time after notice, or if required by an emergency. Following termination, the Customer's access to the Services and the Console may be disabled, API Keys may be revoked, Customer Data handling follows the applicable retention and deletion policy, and clauses that by their nature survive termination remain effective.",
      },
      {
        title: "Changes to These Terms",
        body:
          "Zonatic may update these Terms of Service from time to time. Material changes will be communicated through appropriate means. Continued use of the Services after the effective date of any change constitutes acceptance of the updated Terms where permitted by applicable law.",
      },
      {
        title: "Governing Law",
        body:
          "These Terms are governed by and construed in accordance with the laws of the Republic of Indonesia.",
      },
      {
        title: "Contact Us",
        body:
          "If you have questions about these Terms of Service, please contact us at hello@zonatic.id. Legal entity: [LEGAL ENTITY NAME]. Address: [BUSINESS ADDRESS].",
      },
    ],
    contact: {
      title: "Contact Us",
      body:
        "Questions about these Terms of Service can be sent to hello@zonatic.id. Legal entity: [LEGAL ENTITY NAME]. Address: [BUSINESS ADDRESS]. Governing law: the laws of the Republic of Indonesia.",
    },
    placeholders: {
      entity: "[LEGAL ENTITY NAME]",
      jurisdiction: "[GOVERNING JURISDICTION]",
      email: "[CONTACT EMAIL]",
    },
  },
};
