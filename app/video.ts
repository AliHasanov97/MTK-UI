/**
 * İctimai saytdakı video məlumatları üçün vahid mənbə.
 *
 * Tam təqdimat saytın öz serverindən oynadılır. Hər yazılı təlimatın
 * səhifəsində isə yalnız həmin təlimata aid qısa video göstərilir.
 */

export const VIDEO_TITLE =
  "MTK — Mənzil Təsərrüfatı Kompleksi İdarəetmə Sistemi | Təqdimat";
export const VIDEO_DESCRIPTION =
  "MTK — binalar, mənzillər, inventar, maliyyə, HR, sakin müraciətləri və rollar üçün vahid idarəetmə sistemi. 24 dəqiqəlik tam təqdimat.";
export const VIDEO_UPLOAD_DATE = "2026-10-26T05:17:18-07:00";
export const VIDEO_DURATION = "24:00";
export const VIDEO_DURATION_SECONDS = 1439.588;

/** Saytın özündə saxlanılan tam video və afişa. */
export const VIDEO_SRC = "/video/mtk-taqdimat.mp4";
export const VIDEO_POSTER = "/video/mtk-taqdimat.jpg";

export type GuideVideo = {
  title: string;
  summary: string;
  src: string;
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
    src: "/video/chapters/05-binalar.mp4",
    poster: "/video/chapters/05-binalar.jpg",
    duration: 239,
  },
  inventar: {
    title: "İnventar və anbar",
    summary: "Materiallar, anbar daxilolmaları, çıxarışlar və xərclərin uçotu.",
    src: "/video/chapters/06-inventar.mp4",
    poster: "/video/chapters/06-inventar.jpg",
    duration: 106,
  },
  muqavileler: {
    title: "Müqavilələr və əməliyyatlar",
    summary:
      "Müqavilələr, ödənişlər, tariflər və əməliyyatların sistemdə idarə edilməsi.",
    src: "/video/chapters/07-emeliyyatlar.mp4",
    poster: "/video/chapters/07-emeliyyatlar.jpg",
    duration: 147,
  },
  borclar: {
    title: "Hesablar, borclar və ödənişlər",
    summary: "Aylıq hesablar, borc məlumatları və ödəniş qrafiki ilə işləmə.",
    src: "/video/chapters/09-transaksiyalar.mp4",
    poster: "/video/chapters/09-transaksiyalar.jpg",
    duration: 76,
  },
  maliyye: {
    title: "Maliyyə əməliyyatları",
    summary: "Ödənişlər, xərclər, əlavə gəlirlər, tariflər və müqavilələr.",
    src: "/video/chapters/07-emeliyyatlar.mp4",
    poster: "/video/chapters/07-emeliyyatlar.jpg",
    duration: 147,
  },
  tranzaksiyalar: {
    title: "Transaksiyalar",
    summary: "Gəlir və xərclərin vahid maliyyə kitabında izlənməsi.",
    src: "/video/chapters/09-transaksiyalar.mp4",
    poster: "/video/chapters/09-transaksiyalar.jpg",
    duration: 76,
  },
  hesabatlar: {
    title: "Hesabatlar və maliyyə mənzərəsi",
    summary:
      "Ödəniş qrafiki, ümumi hesabat və bina üzrə maliyyə göstəriciləri.",
    src: "/video/chapters/09-transaksiyalar.mp4",
    poster: "/video/chapters/09-transaksiyalar.jpg",
    duration: 76,
  },
  muraciyetler: {
    title: "Sakin müraciətləri",
    summary: "Müraciətin qeydiyyatı, statusu, məsul şəxs və cavablandırılması.",
    src: "/video/chapters/10-muraciyetler.mp4",
    poster: "/video/chapters/10-muraciyetler.jpg",
    duration: 220,
  },
  hr: {
    title: "HR və əmək haqqı",
    summary: "İşçilər, ərizələr, əmrlər, tabel və əmək haqqı prosesləri.",
    src: "/video/chapters/08-hr.mp4",
    poster: "/video/chapters/08-hr.jpg",
    duration: 179,
  },
  istifadeciler: {
    title: "İstifadəçilər, rollar və qruplar",
    summary: "İstifadəçi yaratmaq, rol və qrup təyin etmək, giriş hüquqları.",
    src: "/video/chapters/11-identifikasiya.mp4",
    poster: "/video/chapters/11-identifikasiya.jpg",
    duration: 91,
  },
  idareetme: {
    title: "Sistem idarəetməsi və audit",
    summary: "Şirkət profili, audit qeydləri və təhlükəsizlik ayarları.",
    src: "/video/chapters/12-audit.mp4",
    poster: "/video/chapters/12-audit.jpg",
    duration: 114,
  },
  profil: {
    title: "Mobil tətbiq və sakin profili",
    summary: "Sakinin mobil tətbiqdə borc, ödəniş və müraciətlərə çıxışı.",
    src: "/video/chapters/13-mobil.mp4",
    poster: "/video/chapters/13-mobil.jpg",
    duration: 46,
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
