/**
 * Bilingual Privacy Policy content.
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
          "Kebijakan Privasi ini menjelaskan bagaimana [LEGAL ENTITY NAME] mengumpulkan, menggunakan, dan melindungi informasi yang terkait dengan penggunaan Layanan Zonatic. Kebijakan ini bersifat umum dan dapat diperbarui dari waktu ke waktu.",
      },
      {
        title: "Informasi yang Kami Kumpulkan",
        list: [
          "Informasi yang Anda berikan secara langsung saat menggunakan Layanan.",
          "Informasi teknis yang dikumpulkan secara otomatis saat Anda mengakses Layanan.",
          "Informasi lain yang diperlukan untuk menyediakan dan meningkatkan Layanan.",
        ],
      },
      {
        title: "Data Lokasi dan Data Geografis",
        body:
          "Kami hanya memproses data lokasi dan data geografis sesuai dengan tujuan Layanan dan dengan pertimbangan privasi yang tepat. Penggunaan fitur berbasis lokasi dilakukan sesuai dengan kebutuhan layanan yang relevan.",
      },
      {
        title: "Bagaimana Kami Menggunakan Informasi",
        list: [
          "Menyediakan, mengoperasikan, dan memelihara Layanan.",
          "Meningkatkan dan mengembangkan fitur Layanan.",
          "Memantau kinerja dan keamanan Layanan.",
          "Menanggapi permintaan dan dukungan pengguna.",
        ],
      },
      {
        title: "Penyimpanan dan Keamanan Data",
        body:
          "Kami menerapkan langkah-langkah keamanan yang wajar untuk melindungi informasi yang diproses. Namun, tidak ada sistem yang sepenuhnya aman, dan kami terus berupaya meningkatkan perlindungan data.",
      },
      {
        title: "Pihak Ketiga dan Penyedia Layanan",
        body:
          "Kami dapat memanfaatkan penyedia layanan pihak ketiga untuk membantu penyediaan Layanan. Penyedia layanan tersebut hanya diperbolehkan memproses informasi sesuai dengan instruksi yang diperlukan untuk tujuan yang ditentukan.",
      },
      {
        title: "Penyimpanan Data",
        body:
          "Kami menyimpan informasi sesuai dengan kebutuhan operasional dan hukum yang berlaku. Jangka waktu penyimpanan dapat bervariasi tergantung pada jenis informasi dan tujuan pemrosesannya.",
      },
      {
        title: "Hak Pengguna",
        body:
          "Pengguna dapat mengajukan permintaan terkait akses, koreksi, pembatasan, atau penghapusan informasi sesuai dengan ketentuan hukum yang berlaku.",
      },
      {
        title: "Cookies dan Teknologi Serupa",
        body:
          "Layanan dapat menggunakan cookies dan teknologi serupa untuk membantu fungsi, analitik, dan pengalaman pengguna. Pengguna dapat mengelola preferensi terkait cookies melalui pengaturan browser mereka.",
      },
      {
        title: "Perubahan Kebijakan Privasi",
        body:
          "Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan akan diumumkan melalui pembaruan tanggal “Terakhir diperbarui” pada halaman ini.",
      },
      {
        title: "Hubungi Kami",
        body:
          "Jika Anda memiliki pertanyaan terkait Kebijakan Privasi ini, Anda dapat menghubungi kami di [CONTACT EMAIL].",
      },
    ],
    contact: {
      title: "Hubungi Kami",
      body: "Pertanyaan mengenai Kebijakan Privasi dapat dikirimkan ke [CONTACT EMAIL]. Alamat bisnis: [BUSINESS ADDRESS].",
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
          "This Privacy Policy explains how [LEGAL ENTITY NAME] collects, uses, and protects information related to your use of the Zonatic Services. This policy is general in nature and may be updated from time to time.",
      },
      {
        title: "Information We Collect",
        list: [
          "Information you provide directly when using the Services.",
          "Technical information collected automatically when you access the Services.",
          "Other information necessary to provide and improve the Services.",
        ],
      },
      {
        title: "Location and Geographic Data",
        body:
          "We only process location and geographic data as necessary for the purpose of the Services and with appropriate privacy considerations. Location-based features are used only when relevant to the service provided.",
      },
      {
        title: "How We Use Information",
        list: [
          "To provide, operate, and maintain the Services.",
          "To improve and develop new features.",
          "To monitor performance and security.",
          "To respond to requests and provide user support.",
        ],
      },
      {
        title: "Data Storage and Security",
        body:
          "We take reasonable security measures to protect the information we process. However, no system is completely secure, and we continuously work to improve data protection.",
      },
      {
        title: "Third Parties and Service Providers",
        body:
          "We may use third-party service providers to help deliver the Services. These providers are only permitted to process information as instructed and solely for the specified purposes.",
      },
      {
        title: "Data Retention",
        body:
          "We retain information for as long as necessary for operational and legal purposes. Retention periods may vary depending on the type of information and the purpose of processing.",
      },
      {
        title: "User Rights",
        body:
          "Users may request access, correction, restriction, or deletion of their information where permitted by applicable law.",
      },
      {
        title: "Cookies and Similar Technologies",
        body:
          "The Services may use cookies and similar technologies to support functionality, analytics, and user experience. You can manage cookie preferences in your browser settings.",
      },
      {
        title: "Changes to This Privacy Policy",
        body:
          "We may update this Privacy Policy from time to time. Changes will be reflected by updating the “Last updated” date on this page.",
      },
      {
        title: "Contact Us",
        body:
          "If you have questions about this Privacy Policy, you can contact us at [CONTACT EMAIL]. Business address: [BUSINESS ADDRESS].",
      },
    ],
    contact: {
      title: "Contact Us",
      body: "Questions about this Privacy Policy can be sent to [CONTACT EMAIL]. Business address: [BUSINESS ADDRESS].",
    },
    placeholders: {
      entity: "[LEGAL ENTITY NAME]",
      email: "[CONTACT EMAIL]",
      address: "[BUSINESS ADDRESS]",
    },
  },
};
