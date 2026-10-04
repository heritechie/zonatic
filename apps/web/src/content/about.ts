/**
 * Bilingual About page content.
 */
import type { Locale } from "./types";

export type AboutSection = {
  title: string;
  body?: string;
  list?: string[];
};

export type AboutContent = {
  title: string;
  hero: string;
  description: string;
  sections: AboutSection[];
  ctas: { primary: string; secondary: string };
};

export const about: Record<Locale, AboutContent> = {
  id: {
    title: "Tentang Zonatic",
    hero: "Infrastruktur geografis untuk Indonesia.",
    description:
      "Zonatic membantu tim memahami data lokasi, memperkaya informasi geografis, menentukan zona, dan membangun aplikasi dengan dukungan data lokasi.",
    sections: [
      {
        title: "Apa itu Zonatic?",
        body:
          "Zonatic adalah infrastruktur geografis yang membantu mengubah data lokasi menjadi informasi geografis yang dapat digunakan oleh aplikasi dan tim.",
      },
      {
        title: "Apa yang kami bangun?",
        list: [
          "Data Lokasi",
          "Geographic Intelligence",
          "Zona",
          "Location APIs",
        ],
      },
      {
        title: "Untuk siapa?",
        body:
          "Zonatic dapat digunakan oleh tim yang bekerja dengan data lokasi di berbagai industri, termasuk finance, retail, logistics, insurance, dan field operations.",
      },
    ],
    ctas: {
      primary: "Mulai menggunakan Zonatic",
      secondary: "Lihat dokumentasi",
    },
  },
  en: {
    title: "About Zonatic",
    hero: "Geographic infrastructure for Indonesia.",
    description:
      "Zonatic helps teams understand location data, enrich geographic information, define zonas, and build location-aware applications.",
    sections: [
      {
        title: "What is Zonatic?",
        body:
          "Zonatic is geographic infrastructure that helps turn location data into geographic information that teams and applications can use.",
      },
      {
        title: "What we build?",
        list: [
          "Location Data",
          "Geographic Intelligence",
          "Zona",
          "Location APIs",
        ],
      },
      {
        title: "Who is it for?",
        body:
          "Zonatic can be used by teams working with location data across industries including finance, retail, logistics, insurance, and field operations.",
      },
    ],
    ctas: {
      primary: "Get started",
      secondary: "View documentation",
    },
  },
};
