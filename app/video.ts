/**
 * İctimai saytdakı video məlumatları üçün vahid mənbə.
 *
 * Videolar YouTube-da yerləşir, sayt isə onları öz pleyer qatı ilə göstərir.
 * Tam təqdimat və hər yazılı təlimat üçün uyğun YouTube video ID-si burada
 * saxlanılır.
 */

export const VIDEO_TITLE =
  "MTK — Mənzil Təsərrüfatı Kompleksi İdarəetmə Sistemi | Təqdimat";
export const VIDEO_DESCRIPTION =
  "MTK — binalar, mənzillər, inventar, maliyyə, HR, sakin müraciətləri və rollar üçün vahid idarəetmə sistemi. 24 dəqiqəlik tam təqdimat.";
export const VIDEO_UPLOAD_DATE = "2026-10-26T05:17:18-07:00";
export const VIDEO_DURATION = "24:00";
export const VIDEO_DURATION_SECONDS = 1439.588;

/** Tam təqdimat videosu. */
export const VIDEO_YOUTUBE_ID = "fPo59r8XuUc";
export const VIDEO_YOUTUBE_URL = `https://www.youtube.com/watch?v=${VIDEO_YOUTUBE_ID}`;
export const VIDEO_EMBED_URL = `https://www.youtube.com/embed/${VIDEO_YOUTUBE_ID}`;
export const VIDEO_POSTER = "/video/mtk-taqdimat.jpg";

/**
 * Ana səhifədə reklam xarakterli qısa təqdimat videosu.
 * Ölçü: 2:24.
 */
export const PROMO_VIDEO_TITLE =
  "MTK — Mənzil Təsərrüfatı Kompleksi İdarəetmə Sistemi | Qısa təqdimat";
export const PROMO_VIDEO_YOUTUBE_ID = "xKXjGQqH-XA";
export const PROMO_VIDEO_DURATION = "2:24";
export const PROMO_VIDEO_DURATION_SECONDS = 144;
export const PROMO_VIDEO_POSTER = "/video/mtk-qisa-teqdimat.jpg";

export type GuideVideo = {
  title: string;
  summary: string;
  /** YouTube video ID-si. */
  youtubeId: string;
  /** Tam təqdimatdan götürülən hissə üçün başlanğıc saniyəsi. */
  start?: number;
  poster: string;
  /** Saniyə ilə. */
  duration: number;
};

/**
 * Hər yazılı təlimat üçün birbaşa həmin səhifədə göstərilən video.
 * Eyni video bir neçə əlaqəli təlimatda istifadə oluna bilər.
 */
export const GUIDE_VIDEOS: Record<string, GuideVideo> = {
  binalar: {
    title: "Binalar, mənzillər və sahiblər",
    summary:
      "Bina, mənzil, qaraj və sahib məlumatlarının qeydiyyatı və idarə edilməsi.",
    youtubeId: "R1XeW79mLsE",
    poster: "/video/chapters/05-binalar.jpg",
    duration: 239,
  },
  inventar: {
    title: "İnventar və anbar",
    summary: "Materiallar, anbar daxilolmaları, çıxarışlar və xərclərin uçotu.",
    youtubeId: "LwfNjbQBE6w",
    poster: "/video/chapters/06-inventar.jpg",
    duration: 106,
  },
  muqavileler: {
    title: "Müqavilələr və əməliyyatlar",
    summary:
      "Müqavilələr, ödənişlər, tariflər və əməliyyatların sistemdə idarə edilməsi.",
    youtubeId: "yPdVR8Sc7Mk",
    poster: "/video/chapters/07-emeliyyatlar.jpg",
    duration: 147,
  },
  borclar: {
    title: "Hesablar, borclar və ödənişlər",
    summary: "Aylıq hesablar, borc məlumatları və ödəniş qrafiki ilə işləmə.",
    youtubeId: "8xrZfljX6ms",
    poster: "/video/chapters/09-transaksiyalar.jpg",
    duration: 76,
  },
  maliyye: {
    title: "Maliyyə əməliyyatları",
    summary: "Ödənişlər, xərclər, əlavə gəlirlər, tariflər və müqavilələr.",
    youtubeId: "yPdVR8Sc7Mk",
    poster: "/video/chapters/07-emeliyyatlar.jpg",
    duration: 147,
  },
  tranzaksiyalar: {
    title: "Transaksiyalar",
    summary: "Gəlir və xərclərin vahid maliyyə kitabında izlənməsi.",
    youtubeId: "8xrZfljX6ms",
    poster: "/video/chapters/09-transaksiyalar.jpg",
    duration: 76,
  },
  hesabatlar: {
    title: "Hesabatlar və maliyyə mənzərəsi",
    summary:
      "Ödəniş qrafiki, ümumi hesabat və bina üzrə maliyyə göstəriciləri.",
    youtubeId: "8xrZfljX6ms",
    poster: "/video/chapters/09-transaksiyalar.jpg",
    duration: 76,
  },
  muraciyetler: {
    title: "Sakin müraciətləri",
    summary: "Müraciətin qeydiyyatı, statusu, məsul şəxs və cavablandırılması.",
    youtubeId: VIDEO_YOUTUBE_ID,
    start: 969,
    poster: "/video/chapters/10-muraciyetler.jpg",
    duration: 220,
  },
  hr: {
    title: "HR və əmək haqqı",
    summary: "İşçilər, ərizələr, əmrlər, tabel və əmək haqqı prosesləri.",
    youtubeId: "rQ7CiU_NbsA",
    poster: "/video/chapters/08-hr.jpg",
    duration: 179,
  },
  istifadeciler: {
    title: "İstifadəçilər, rollar və qruplar",
    summary: "İstifadəçi yaratmaq, rol və qrup təyin etmək, giriş hüquqları.",
    youtubeId: VIDEO_YOUTUBE_ID,
    start: 1189,
    poster: "/video/chapters/11-identifikasiya.jpg",
    duration: 91,
  },
  idareetme: {
    title: "Sistem idarəetməsi və audit",
    summary: "Şirkət profili, audit qeydləri və təhlükəsizlik ayarları.",
    youtubeId: VIDEO_YOUTUBE_ID,
    start: 1280,
    poster: "/video/chapters/12-audit.jpg",
    duration: 114,
  },
  profil: {
    title: "Mobil tətbiq və sakin profili",
    summary: "Sakinin mobil tətbiqdə borc, ödəniş və müraciətlərə çıxışı.",
    youtubeId: VIDEO_YOUTUBE_ID,
    start: 1394,
    poster: "/video/chapters/13-mobil.jpg",
    duration: 45.588,
  },
};

export function getGuideVideo(guideSlug: string) {
  return GUIDE_VIDEOS[guideSlug];
}

export function formatVideoTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
