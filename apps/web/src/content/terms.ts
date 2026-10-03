/**
 * Bilingual Terms of Service content.
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
          "Dengan mengakses atau menggunakan Layanan Zonatic, Anda menyetujui Syarat dan Ketentuan ini. Jika Anda tidak menyetujui ketentuan ini, mohon untuk tidak menggunakan Layanan.",
      },
      {
        title: "Layanan Zonatic",
        body:
          "Zonatic menyediakan infrastruktur location intelligence sebagaimana dijelaskan dalam dokumentasi resmi. Layanan dapat berkembang atau berubah dari waktu ke waktu untuk meningkatkan kualitasnya.",
      },
      {
        title: "Akun Pengguna",
        body:
          "Pengguna bertanggung jawab untuk menjaga kerahasiaan kredensial akun mereka dan atas segala aktivitas yang terjadi melalui akun tersebut.",
      },
      {
        title: "Penggunaan API",
        body:
          "Penggunaan API Zonatic harus mematuhi batas penggunaan yang wajar, dokumentasi API, dan ketentuan keamanan yang berlaku.",
      },
      {
        title: "Data yang Diberikan Pengguna",
        body:
          "Pengguna tetap memiliki hak atas data yang mereka berikan ke Layanan. Pengguna bertanggung jawab untuk memastikan bahwa data yang mereka kirimkan mematuhi hukum yang berlaku dan tidak melanggar hak pihak ketiga.",
      },
      {
        title: "Penggunaan yang Dilarang",
        list: [
          "Menggunakan Layanan untuk tujuan ilegal atau melanggar hukum.",
          "Mencoba merusak, mengakses tanpa izin, atau membebani sistem secara berlebihan.",
          "Menyalahgunakan Layanan dengan cara yang dapat merugikan pengguna lain atau penyedia Layanan.",
          "Menggunakan Layanan untuk mengumpulkan informasi secara tidak sah.",
        ],
      },
      {
        title: "Kekayaan Intelektual",
        body:
          "Hak kekayaan intelektual terkait Layanan, termasuk nama, logo, dan teknologi, tetap dimiliki oleh [LEGAL ENTITY NAME] atau pemiliknya yang sah.",
      },
      {
        title: "Layanan Pihak Ketiga",
        body:
          "Layanan dapat memuat tautan atau berinteraksi dengan layanan pihak ketiga. Kami tidak bertanggung jawab atas konten, kebijakan, atau praktik layanan pihak ketiga tersebut.",
      },
      {
        title: "Ketersediaan Layanan",
        body:
          "Kami berupaya menjaga ketersediaan Layanan, namun tidak menjamin Layanan akan selalu tersedia tanpa gangguan, kesalahan, atau waktu henti.",
      },
      {
        title: "Penafian",
        body:
          "Layanan disediakan “sebagaimana adanya” dan “sebagaimana tersedia”. Kami tidak memberikan jaminan tersurat maupun tersirat terkait akurasi, kelengkapan, atau kesesuaian untuk tujuan tertentu.",
      },
      {
        title: "Pembatasan Tanggung Jawab",
        body:
          "Sejauh diizinkan oleh hukum yang berlaku, [LEGAL ENTITY NAME] tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, konsekuensial, atau hukuman yang timbul dari penggunaan Layanan.",
      },
      {
        title: "Pengakhiran",
        body:
          "Kami dapat menangguhkan atau menghentikan akses Anda ke Layanan jika Anda melanggar Syarat dan Ketentuan ini atau jika diperlukan untuk alasan keamanan atau operasional.",
      },
      {
        title: "Perubahan Ketentuan",
        body:
          "Kami dapat memperbarui Syarat dan Ketentuan ini dari waktu ke waktu. Perubahan akan berlaku setelah diperbarui pada halaman ini dengan tanggal “Terakhir diperbarui” yang baru.",
      },
      {
        title: "Hukum yang Berlaku",
        body:
          "Syarat dan Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum [GOVERNING JURISDICTION], tanpa mengabaikan prinsip konflik hukum.",
      },
      {
        title: "Hubungi Kami",
        body:
          "Jika Anda memiliki pertanyaan terkait Syarat dan Ketentuan ini, silakan hubungi kami di [CONTACT EMAIL].",
      },
    ],
    contact: {
      title: "Hubungi Kami",
      body: "Pertanyaan mengenai Syarat dan Ketentuan dapat dikirimkan ke [CONTACT EMAIL]. Yurisdiksi yang berlaku: [GOVERNING JURISDICTION].",
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
          "By accessing or using the Zonatic Services, you agree to these Terms of Service. If you do not agree to these terms, please do not use the Services.",
      },
      {
        title: "Zonatic Services",
        body:
          "Zonatic provides location intelligence infrastructure as described in the official documentation. The Services may evolve or change over time to improve quality.",
      },
      {
        title: "User Accounts",
        body:
          "Users are responsible for maintaining the confidentiality of their account credentials and for all activity that occurs under their account.",
      },
      {
        title: "API Usage",
        body:
          "Use of the Zonatic API must comply with reasonable rate limits, API documentation, and applicable security requirements.",
      },
      {
        title: "User-Provided Data",
        body:
          "Users retain ownership of data they provide to the Services. Users are responsible for ensuring submitted data complies with applicable law and does not infringe third-party rights.",
      },
      {
        title: "Prohibited Use",
        list: [
          "Using the Services for illegal or unlawful purposes.",
          "Attempting to disrupt, gain unauthorized access to, or overload the system.",
          "Misusing the Services in a way that could harm other users or the provider.",
          "Using the Services to collect information unlawfully.",
        ],
      },
      {
        title: "Intellectual Property",
        body:
          "Intellectual property rights in the Services, including names, logos, and technology, remain the property of [LEGAL ENTITY NAME] or its rightful owners.",
      },
      {
        title: "Third-Party Services",
        body:
          "The Services may link to or interact with third-party services. We are not responsible for the content, policies, or practices of those third parties.",
      },
      {
        title: "Service Availability",
        body:
          "We strive to maintain service availability, but do not guarantee uninterrupted access, error-free operation, or zero downtime.",
      },
      {
        title: "Disclaimer",
        body:
          "The Services are provided “as is” and “as available”. We make no express or implied warranties regarding accuracy, completeness, or fitness for a particular purpose.",
      },
      {
        title: "Limitation of Liability",
        body:
          "To the maximum extent permitted by applicable law, [LEGAL ENTITY NAME] shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from use of the Services.",
      },
      {
        title: "Termination",
        body:
          "We may suspend or terminate your access to the Services if you violate these Terms or if necessary for security or operational reasons.",
      },
      {
        title: "Changes to Terms",
        body:
          "We may update these Terms of Service from time to time. Changes take effect when posted on this page with an updated “Last updated” date.",
      },
      {
        title: "Governing Law",
        body:
          "These Terms are governed by and construed in accordance with the laws of [GOVERNING JURISDICTION], without regard to conflict of law principles.",
      },
      {
        title: "Contact Us",
        body:
          "If you have questions about these Terms of Service, please contact us at [CONTACT EMAIL].",
      },
    ],
    contact: {
      title: "Contact Us",
      body: "Questions about these Terms of Service can be sent to [CONTACT EMAIL]. Governing jurisdiction: [GOVERNING JURISDICTION].",
    },
    placeholders: {
      entity: "[LEGAL ENTITY NAME]",
      jurisdiction: "[GOVERNING JURISDICTION]",
      email: "[CONTACT EMAIL]",
    },
  },
};
