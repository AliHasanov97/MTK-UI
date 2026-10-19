export type NewsItem = {
  slug: string;
  title: string;
  date: string; // ISO
  category: "Yenilik" | "Elan";
  excerpt: string;
  body: string[];
};

/**
 * Xəbərlər hələlik burada saxlanılır (backend-də xəbər modulu yoxdur).
 * Yeni xəbər əlavə etmək üçün siyahının əvvəlinə yeni element əlavə edin.
 */
export const news: NewsItem[] = [
  {
    slug: "emek-haqqi-odenisleri",
    title: "Əmək haqqı ödənişləri modulu əlavə olundu",
    date: "2026-10-18",
    category: "Yenilik",
    excerpt: "İşçilər üçün maaş ödənişləri, qəbzlər və ödəniş tarixçəsi artıq sistemdədir.",
    body: [
      "“Maliyyə əməliyyatları” bölməsində işçilər üzrə əmək haqqı ödənişlərini idarə etmək mümkündür.",
      "Hər ödəniş üçün PDF qəbz çıxarmaq və işçinin səhifəsində ödəniş tarixçəsinə baxmaq olar.",
    ],
  },
  {
    slug: "mezuniyyet-odenisleri",
    title: "Məzuniyyət ödənişləri",
    date: "2026-10-18",
    category: "Yenilik",
    excerpt: "Məzuniyyət pulunun hesablanması və ödənilməsi ayrıca bölmədə izlənir.",
    body: [
      "Məzuniyyət ödənişləri işçinin səhifəsindən və “Maliyyə əməliyyatları” bölməsindən idarə olunur.",
      "Ödənişlər tranzaksiya kitabına avtomatik düşür.",
    ],
  },
  {
    slug: "yeni-sayt-ve-telimatlar",
    title: "Yenilənmiş ana səhifə və istifadə təlimatları",
    date: "2026-10-19",
    category: "Elan",
    excerpt: "Sistemin ana səhifəsi yeniləndi, hər bölmə üçün istifadə təlimatı əlavə olundu.",
    body: [
      "Ana səhifədə sistemin imkanları, rollar və tez-tez verilən suallar toplanıb.",
      "“Təlimat” bölməsində hər modul üçün addım-addım izahat var; rolunuza uyğun təlimatları seçə bilərsiniz.",
    ],
  },
];

export function getNews(slug: string) {
  return news.find((n) => n.slug === slug);
}

export function formatNewsDate(iso: string) {
  return new Date(iso).toLocaleDateString("az-AZ", { day: "numeric", month: "long", year: "numeric" });
}
