/**
 * Bilingual Privacy Policy content.
 *
 * This file is the single source of truth for both Bahasa Indonesia and
 * English copies of the Privacy Policy. Sections are ordered identically
 * across the two locales; titles differ in wording only.
 *
 * Placeholders (`[LEGAL ENTITY NAME]`, `[CONTACT EMAIL]`,
 * `[BUSINESS ADDRESS]`, `[YYYY-MM-DD]`) are intentionally left verbatim
 * until the legal entity, registered address, contact details, and
 * effective date are confirmed by counsel.
 *
 * Vendor names, encryption algorithms, retention periods, DPO contact
 * details, and data-centre locations are deliberately omitted: they are
 * not confirmed and must not be invented.
 */
import type { Locale } from "./types";

export type PrivacySection = {
  title: string;
  body?: string;
  list?: string[];
};

export type PrivacyContent = {
  title: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  sections: PrivacySection[];
  contact: { title: string; body: string };
  placeholders: { entity: string; email: string; address: string };
};

export const privacy: Record<Locale, PrivacyContent> = {
  id: {
    title: "Kebijakan Privasi",
    lastUpdatedLabel: "Terakhir diperbarui",
    lastUpdated: "[YYYY-MM-DD]",
    sections: [
      {
        title: "Pendahuluan",
        body:
          "Kebijakan Privasi ini menjelaskan bagaimana [LEGAL ENTITY NAME] ('Zonatic') mengumpulkan, menggunakan, melindungi, dan menangani informasi yang terkait dengan penggunaan Layanan Zonatic. Kebijakan ini dapat diperbarui dari waktu ke waktu; tanggal 'Terakhir diperbarui' di bagian bawah halaman ini mencerminkan versi yang berlaku.",
      },
      {
        title: "Informasi yang Kami Kumpulkan",
        body:
          "Informasi yang Zonatic kumpulkan bergantung pada cara Customer dan User menggunakan Layanan. Informasi tersebut dapat mencakup empat kategori berikut:",
        list: [
          "Account Data — informasi yang diberikan saat membuat atau menggunakan akun serta Workspace, misalnya nama, email, informasi autentikasi yang diperlukan Zonatic, dan informasi Workspace.",
          "Service & Usage Data — data teknis dan operasional yang diperlukan untuk menjalankan dan mengamankan Layanan, seperti waktu request, endpoint atau operasi yang dipanggil, status atau error, identifier atau metadata API Key, alamat IP, dan informasi keamanan atau audit.",
          "Customer Data — data yang dikirimkan Customer ke Zonatic melalui API atau Console, seperti lintang-bujur, alamat, referensi eksternal, CSV, GeoJSON, coverage, territory, atau data geografis lain yang diproses atas instruksi atau konfigurasi Customer.",
          "Device Location — untuk fitur tertentu yang relevan, termasuk Field Location Verification, Zonatic dapat memproses lokasi perangkat ketika pengguna melakukan tindakan yang relevan dan memberikan izin yang diperlukan. Layanan tidak dirancang untuk continuous location tracking sebagai perilaku default, dan tidak semua penggunaan Layanan melibatkan pemrosesan lokasi perangkat.",
        ],
      },
      {
        title: "Data Lokasi dan Data Geografis",
        body:
          "Zonatic membedakan tiga sumber data terkait lokasi: (a) Customer Data yang dikirimkan oleh Customer melalui API atau Console, (b) Geographic Data yang disediakan atau digunakan Zonatic sebagai bagian dari Layanan — termasuk administrative boundaries, dataset pos, dan dataset lokasi terkait — yang dapat berasal dari sumber publik, resmi, atau pihak ketiga, dan (c) Device Location yang berasal dari perangkat pengguna untuk fitur tertentu. Zonatic tidak menyatakan bahwa seluruh Geographic Data selalu resmi, selalu akurat, atau selalu bersumber dari otoritas pemerintah; ketersediaan, cakupan, akurasi, kelengkapan, dan versi dapat bervariasi antar sumber. Informasi mengenai sumber, versi, provenance, dan lisensi dapat disediakan melalui dokumentasi atau materi layanan.",
      },
      {
        title: "Bagaimana Kami Menggunakan Informasi",
        body:
          "Tujuan pemrosesan informasi oleh Zonatic dapat mencakup:",
        list: [
          "Menyediakan, mengoperasikan, dan memelihara Layanan.",
          "Memproses Customer Data sesuai konfigurasi atau instruksi Customer.",
          "Menyediakan fungsionalitas akun dan Workspace.",
          "Autentikasi, otorisasi, dan keamanan.",
          "Mencegah abuse, akses tanpa izin, fraud, dan insiden keamanan.",
          "Usage metering atau monitoring sepanjang diperlukan untuk pengoperasian Layanan.",
          "Troubleshooting dan dukungan pelanggan.",
          "Meningkatkan atau mengembangkan Layanan berdasarkan informasi yang tidak mengidentifikasi individu atau penggunaan data yang diizinkan sesuai hubungan kontraktual dengan Customer dan hukum yang berlaku.",
          "Memenuhi kewajiban hukum yang berlaku.",
        ],
      },
      {
        title: "Penyimpanan dan Keamanan Data",
        body:
          "Zonatic menerapkan langkah-langkah perlindungan yang wajar untuk melindungi informasi yang diproses, yang dapat mencakup pengendalian akses, autentikasi dan otorisasi, pemantauan keamanan, serta pencatatan aktivitas dan kejadian keamanan sesuai kebutuhan Layanan. Tidak ada sistem yang sepenuhnya aman; Zonatic terus berupaya meningkatkan perlindungan data sejalan dengan perkembangan teknis dan hukum yang berlaku.",
      },
      {
        title: "Pihak Ketiga dan Penyedia Layanan",
        body:
          "Zonatic dapat menggunakan penyedia layanan pihak ketiga untuk membantu menyediakan, mengamankan, mengoperasikan, atau meningkatkan bagian tertentu dari Layanan. Jenis informasi yang diproses oleh setiap penyedia bergantung pada fungsi yang mereka berikan. Zonatic meminta penyedia yang relevan untuk menangani informasi sesuai kebutuhan Layanan, kewajiban kontraktual, dan hukum yang berlaku.",
      },
      {
        title: "Penyimpanan Data",
        body:
          "Jangka waktu penyimpanan informasi bervariasi tergantung pada kategori informasi dan tujuan pemrosesannya, termasuk kebutuhan operasional Layanan, siklus hidup akun dan Workspace, log penggunaan dan keamanan, Customer Data, serta kewajiban hukum, keamanan, atau penyelesaian sengketa. Setelah hubungan berakhir atau akses dihentikan, informasi dapat dihapus, dikembalikan, atau dipertahankan sepanjang diperlukan sesuai kebijakan Zonatic, kewajiban kontraktual, kebutuhan keamanan, dan hukum yang berlaku.",
      },
      {
        title: "Hak Pengguna",
        body:
          "Pengguna dapat mengajukan permintaan terkait akses, koreksi, pembatasan, atau penghapusan informasi sesuai dengan hukum yang berlaku. Untuk informasi yang diproses Zonatic atas nama Customer sebagai bagian dari Customer Data, permintaan pada umumnya perlu diarahkan kepada Customer yang menentukan tujuan dan penggunaan data tersebut, dan Zonatic dapat membantu Customer sesuai perjanjian kontraktual dan hukum yang berlaku.",
      },
      {
        title: "Cookies dan Teknologi Serupa",
        body:
          "Layanan dapat menggunakan cookies dan teknologi serupa untuk fungsionalitas, keamanan, preferensi, dan, sepanjang relevan, analitik. Pengguna dapat mengelola preferensi cookies melalui pengaturan browser mereka.",
      },
      {
        title: "Perubahan Kebijakan Privasi",
        body:
          "Zonatic dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan akan diumumkan melalui pembaruan tanggal 'Terakhir diperbarui' pada halaman ini.",
      },
      {
        title: "Hubungi Kami",
        body:
          "Jika Anda memiliki pertanyaan terkait Kebijakan Privasi ini, Anda dapat menghubungi kami melalui kontak yang tercantum di bagian bawah halaman ini.",
      },
    ],
    contact: {
      title: "Hubungi Kami",
      body:
        "Pertanyaan mengenai Kebijakan Privasi dapat dikirimkan ke [CONTACT EMAIL]. Entitas hukum: [LEGAL ENTITY NAME]. Alamat: [BUSINESS ADDRESS].",
    },
    placeholders: {
      entity: "[LEGAL ENTITY NAME]",
      email: "[CONTACT EMAIL]",
      address: "[BUSINESS ADDRESS]",
    },
  },
  en: {
    title: "Privacy Policy",
    lastUpdatedLabel: "Last updated",
    lastUpdated: "[YYYY-MM-DD]",
    sections: [
      {
        title: "Introduction",
        body:
          "This Privacy Policy describes how [LEGAL ENTITY NAME] ('Zonatic') collects, uses, protects, and otherwise handles information related to your use of the Zonatic Services. This Policy may be updated from time to time; the 'Last updated' date at the bottom of this page reflects the version in force.",
      },
      {
        title: "Information We Collect",
        body:
          "The information Zonatic collects depends on how Customers and Users use the Services. The information Zonatic processes may include the following four categories:",
        list: [
          "Account Data — information provided when creating or using an account and a Workspace, such as name, email, the authentication information required by Zonatic, and Workspace information.",
          "Service and Usage Data — technical and operational data needed to run and secure the Services, such as request time, the endpoint or operation called, status or error information, API Key identifiers or metadata, IP address, and security or audit information.",
          "Customer Data — data submitted by Customers to Zonatic through the API or Console, such as latitude/longitude coordinates, addresses, external references, CSV or GeoJSON files, coverage, territories, or other geographic data processed at the Customer's instruction or configuration.",
          "Device Location — for certain relevant features, including Field Location Verification, Zonatic may process device location when the user takes an action that requires it and grants the necessary permission. The Services are not designed for continuous location tracking as a default behaviour, and not every use of the Services involves the processing of device location.",
        ],
      },
      {
        title: "Location and Geographic Data",
        body:
          "Zonatic distinguishes three sources of location-related data: (a) Customer Data submitted by Customers via the API or Console; (b) Geographic Data provided or used by Zonatic as part of the Services — including administrative boundaries, postal datasets, and other related location datasets — which may originate from public, official, or third-party sources; and (c) Device Location obtained from end-user devices for certain features. Zonatic does not represent that all Geographic Data is official, accurate, or sourced from government authorities; availability, coverage, accuracy, completeness, and version may vary between sources. Information regarding source, version, provenance, and licensing may be made available through documentation or applicable service materials.",
      },
      {
        title: "How We Use Information",
        body:
          "Zonatic's purposes for processing information may include:",
        list: [
          "providing, operating, and maintaining the Services;",
          "processing Customer Data in accordance with Customer's configuration or instructions;",
          "providing account and Workspace functionality;",
          "authentication, authorization, and security;",
          "preventing abuse, fraud, unauthorized access, and security incidents;",
          "usage metering or monitoring where necessary to operate the Services;",
          "troubleshooting and customer support;",
          "improving or developing the Services based on non-identifying information or other data uses permitted by the Customer relationship and applicable law; and",
          "complying with legal obligations.",
        ],
      },
      {
        title: "Data Storage and Security",
        body:
          "Zonatic applies reasonable safeguards to protect the information it processes, which may include access controls, authentication and authorization, security monitoring, and logging of activities and security events as appropriate for the Services. No system is completely secure; Zonatic continuously works to improve data protection in line with technical developments and applicable law.",
      },
      {
        title: "Third Parties and Service Providers",
        body:
          "Zonatic may use third-party service providers to help provide, secure, operate, or improve parts of the Services. The information processed by each provider depends on the function it performs. Zonatic requires relevant providers to handle information in accordance with the needs of the Services, contractual obligations, and applicable law.",
      },
      {
        title: "Data Retention",
        body:
          "Retention periods vary by category of information and purpose of processing, including the operational needs of the Services, account and Workspace lifecycle, service and security logs, Customer Data, and legal, security, or dispute-resolution obligations. After the relationship ends or access is terminated, information may be deleted, returned, or retained as long as necessary under Zonatic's policies, contractual obligations, security needs, and applicable law.",
      },
      {
        title: "User Rights",
        body:
          "Users may request access, correction, restriction, or deletion of their information where permitted by applicable law. Where information is processed by Zonatic on behalf of a Customer as Customer Data, requests should generally be directed to that Customer, which sets the purposes and use of the data, and Zonatic may assist the Customer in accordance with contractual agreements and applicable law.",
      },
      {
        title: "Cookies and Similar Technologies",
        body:
          "The Services may use cookies and similar technologies for functionality, security, preferences, and, where applicable, analytics. Users can manage cookie preferences through their browser settings.",
      },
      {
        title: "Changes to This Privacy Policy",
        body:
          "Zonatic may update this Privacy Policy from time to time. Changes will be reflected by updating the 'Last updated' date on this page.",
      },
      {
        title: "Contact Us",
        body:
          "If you have questions about this Privacy Policy, you can reach us via the contact details listed at the bottom of this page.",
      },
    ],
    contact: {
      title: "Contact Us",
      body:
        "Questions about this Privacy Policy can be sent to [CONTACT EMAIL]. Legal entity: [LEGAL ENTITY NAME]. Address: [BUSINESS ADDRESS].",
    },
    placeholders: {
      entity: "[LEGAL ENTITY NAME]",
      email: "[CONTACT EMAIL]",
      address: "[BUSINESS ADDRESS]",
    },
  },
};
