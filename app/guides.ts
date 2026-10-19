import { ROLES, type Role } from "./lib/auth/roleConstants";

export type GuideSection = { title: string; steps: string[] };

export type Guide = {
  slug: string;
  icon: string;
  title: string;
  summary: string;
  /** Panel-dəki yol (təlimatdan "Panelə keç" üçün). */
  panelHref: string;
  roles: Role[];
  sections: GuideSection[];
  tips: string[];
  related: string[];
};

const STAFF = [ROLES.ADMIN, ROLES.BUILDING_MANAGER];

export const guides: Guide[] = [
  {
    slug: "binalar",
    icon: "⌂",
    title: "Binalar, mənzillər və sahiblər",
    summary: "Məhəllənin fondunu qeydiyyata alın: binalar, mənzillər, qarajlar və onların sahibləri.",
    panelHref: "/panel/binalar/bina-siyahisi",
    roles: STAFF,
    sections: [
      {
        title: "Yeni bina əlavə etmək",
        steps: [
          "Panelin yan menyusundan “Binalar” bölməsini açın, “Binalar” tabında olun.",
          "“+ Yeni bina” düyməsini basın.",
          "Bina məlumatlarını doldurub yaradın.",
          "Yaranmış binanı siyahıdan seçib mənzillərini “Mənzillər” tabından idarə edin. Binanın “Sxem” görünüşü də mövcuddur.",
        ],
      },
      {
        title: "Sahib əlavə etmək",
        steps: [
          "“Sahiblər” tabına keçin.",
          "“+ Yeni sahib” düyməsini basın və məlumatları doldurun.",
          "Sahibin səhifəsindən onun mənzillərini, qarajlarını və borcunu izləyin.",
        ],
      },
      {
        title: "Qaraj əlavə etmək",
        steps: ["“Qarajlar” tabına keçin.", "“+ Yeni qaraj” düyməsini basın.", "Qarajı sahibə bağlayın."],
      },
    ],
    tips: [
      "Əvvəlcə bina, sonra mənzil, sonra sahib əlavə edin — hesablar bu ardıcıllıqla qurulur.",
      "Sahiblik tarixçəsi saxlanılır: mənzil əl dəyişəndə köhnə qeyd silinmir.",
    ],
    related: ["muqavileler", "borclar"],
  },
  {
    slug: "inventar",
    icon: "▦",
    title: "İnventar və anbar",
    summary: "Material və avadanlıqların uçotu: anbar, materiallar, daxilolmalar və çıxarışlar.",
    panelHref: "/panel/inventar/anbar",
    roles: STAFF,
    sections: [
      {
        title: "Material əlavə etmək",
        steps: ["“İnventar” bölməsində “Materiallar” tabını açın.", "“+ Yeni material” düyməsini basın.", "Ad və ölçü vahidini daxil edib yaradın."],
      },
      {
        title: "Anbardan çıxarış",
        steps: ["“Çıxarışlar” tabını açın.", "“+ Yeni çıxarış” düyməsini basın.", "Material və miqdarı seçib təsdiq edin."],
      },
      {
        title: "Daxilolma",
        steps: ["“Daxilolmalar” tabında alınmış materialların qəbulunu izləyin.", "Daxilolmalar maliyyə bölməsindəki “Salınmalar” ilə əlaqəlidir."],
      },
    ],
    tips: ["Anbar qalığı daxilolma və çıxarışlardan avtomatik hesablanır."],
    related: ["maliyye"],
  },
  {
    slug: "muqavileler",
    icon: "₼",
    title: "Müqavilələr, müştərilər və tədarükçülər",
    summary: "Xidmət müqavilələrini və tərəfdaşları idarə edin.",
    panelHref: "/panel/muqavileler",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT],
    sections: [
      {
        title: "Müqavilə yaratmaq",
        steps: ["“Əməliyyatlar” bölməsində “Müqavilələr” tabını açın.", "“+ Yeni müqavilə” düyməsini basın.", "Müştərini seçin, xidmətləri və dövrü daxil edin.", "Müqavilənin səhifəsində imzalanmış sənədləri əlavə edin."],
      },
      {
        title: "Müştəri və tədarükçü",
        steps: ["“Müştərilər” tabında “+ Yeni müştəri” ilə müştəri əlavə edin.", "“Tədarükçülər” tabında “+ Yeni tədarükçü” ilə tədarükçü əlavə edin.", "Hər birinin səhifəsində müqavilə və hesab tarixçəsi görünür."],
      },
    ],
    tips: ["Mənzil sahibləri öz müqavilələrini və tədarükçüləri “Müqavilələr” bölməsində görə bilərlər."],
    related: ["borclar", "maliyye"],
  },
  {
    slug: "borclar",
    icon: "◎",
    title: "Hesablar və borclar",
    summary: "Aylıq hesabların yaranması, borcun izlənməsi və ödənişlərin bölüşdürülməsi.",
    panelHref: "/panel/borclar",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT],
    sections: [
      {
        title: "Aylıq hesabları yaratmaq",
        steps: ["“Borclar” tabını açın.", "Hesablaşma dövrünü seçin.", "“Hesabla” düyməsini basın — hesablar tariflər əsasında yaranır.", "Nəticəni siyahıda yoxlayın."],
      },
      {
        title: "Borca baxmaq",
        steps: ["Hər hesab ayrıca kartda göstərilir: məbləğ, ödənilən hissə, qalıq.", "Sahibə görə filtrləyin və ya axtarın."],
      },
    ],
    tips: ["Qismən və avans ödənişlər nəzərə alınır; qalıq borc hər hesab üzrə ayrıca göstərilir."],
    related: ["maliyye", "tranzaksiyalar"],
  },
  {
    slug: "maliyye",
    icon: "₼",
    title: "Maliyyə əməliyyatları",
    summary: "Ödənişlər, xərclər, əlavə gəlirlər, salınmalar, əmək haqqı və tariflər.",
    panelHref: "/panel/maliyye-emeliyyatlari",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT],
    sections: [
      {
        title: "Ödəniş qeydə almaq",
        steps: ["“Maliyyə əməliyyatları” səhifəsində “Ödənişlər” bölməsini açın.", "Sahibi və hesabı seçin, məbləği daxil edin.", "Yadda saxlayın — ödəniş tranzaksiya kitabına düşür."],
      },
      {
        title: "Xərc və əlavə gəlir",
        steps: ["“Xərclər” bölməsində xərci qeyd edin, lazım olsa qəbz əlavə edin.", "“Əlavə gəlirlər” bölməsində digər gəlirləri qeyd edin."],
      },
      {
        title: "Alınan mal və xidmətlər (salınmalar)",
        steps: ["“Salınmalar” bölməsində “+ Yeni salınma” düyməsini basın.", "Tədarükçünü və qaimə sətirlərini daxil edin."],
      },
      {
        title: "Tariflər",
        steps: ["“+ Yeni tarif” ilə xidmət tarifini yaradın.", "Tarif dəyişəndə növbəti hesablama yeni tarifə əsasən aparılır."],
      },
      {
        title: "Əmək haqqı və məzuniyyət",
        steps: ["“Əmək haqqı” bölməsində işçilər üzrə maaş ödənişlərini idarə edin.", "“Məzuniyyət ödənişləri” bölməsində məzuniyyət pulunu izləyin."],
      },
    ],
    tips: ["Hər əməliyyat izlənə bilən qeyd kimi saxlanılır; səhv varsa, silmək əvəzinə düzəliş əməliyyatı edin."],
    related: ["tranzaksiyalar", "hesabatlar", "hr"],
  },
  {
    slug: "tranzaksiyalar",
    icon: "⇄",
    title: "Tranzaksiyalar",
    summary: "Bütün gəlir və xərclərin ümumi mühasibat kitabı.",
    panelHref: "/panel/tranzaksiyalar",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT, ROLES.OWNER],
    sections: [
      {
        title: "Tranzaksiyalara baxmaq",
        steps: ["Yan menyudan “Tranzaksiyalar” bölməsini açın.", "Tarix, növ və ya məbləğə görə sütun filtrlərindən istifadə edin.", "Sətrə basıb əlavə edilmiş sənəd və qəbzlərə baxın."],
      },
    ],
    tips: ["Mənzil sahibi yalnız özünə aid tranzaksiyaları görür."],
    related: ["maliyye", "hesabatlar"],
  },
  {
    slug: "hesabatlar",
    icon: "▩",
    title: "Hesabatlar",
    summary: "Ödəniş qrafiki və ümumi maliyyə hesabatı.",
    panelHref: "/panel/hesabatlar",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT, ROLES.OWNER],
    sections: [
      {
        title: "Ödəniş qrafiki",
        steps: ["“Hesabatlar” bölməsində “Ödəniş qrafiki” tabını açın.", "İli seçin; hər mənzil üçün aylar üzrə ödəniş vəziyyəti rənglə göstərilir.", "Xanaya basıb ətraflı məlumata baxın."],
      },
      {
        title: "Ümumi hesabat",
        steps: ["“Ümumi hesabat” tabını açın.", "Dövr seçin, gəlir-xərc və balansa baxın.", "Lazım olsa Excel-ə ixrac edin."],
      },
    ],
    tips: ["Mənzil sahibi öz hesabatını görür."],
    related: ["tranzaksiyalar", "borclar"],
  },
  {
    slug: "muraciyetler",
    icon: "✳",
    title: "Müraciətlər",
    summary: "Sakin müraciətlərinin qeydiyyatı və izlənməsi.",
    panelHref: "/panel/muracietler",
    roles: [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.OWNER],
    sections: [
      {
        title: "Sakin üçün: müraciət göndərmək",
        steps: ["Yan menyudan “Müraciətlər” bölməsini açın.", "Yeni müraciət yaradın, mövzu və təsvirini yazın.", "Statusunu həmin səhifədən izləyin."],
      },
      {
        title: "İdarə üçün: müraciətə baxmaq",
        steps: ["Müraciətlər siyahısını açın.", "Müraciəti seçib statusunu yeniləyin.", "Məsul şəxsi təyin edin."],
      },
    ],
    tips: ["Problemi dəqiq təsvir edin: bina, mənzil və nə baş verdiyi."],
    related: ["binalar"],
  },
  {
    slug: "hr",
    icon: "◈",
    title: "HR: işçilər, ərizələr, əmrlər, tabel",
    summary: "İşçi heyətinin idarəsi, kadr sənədləri və iş vaxtı uçotu.",
    panelHref: "/panel/hr/isciler",
    roles: STAFF,
    sections: [
      {
        title: "İşçi əlavə etmək",
        steps: ["“HR” bölməsində “İşçilər” tabını açın.", "“+ Yeni işçi” düyməsini basın.", "Şəxsi, əmək və maaş məlumatlarını doldurun.", "İşçinin səhifəsində sənədlər və ödənişlər tabları var."],
      },
      {
        title: "Ərizə və əmr",
        steps: ["“Ərizələr” tabında “+ Yeni ərizə” ilə ərizə yaradın.", "“Əmrlər” tabında “+ Yeni əmr” ilə əmr hazırlayın.", "Hazır sənədi açıb baxın və imzalanmış variantı əlavə edin."],
      },
      {
        title: "Tabel və təqvim",
        steps: ["“Tabel” tabında işçilərin davamiyyətini qeyd edin.", "“Təqvim” tabında istehsalat təqvimini yoxlayın.", "“Lüğətlər” tabı kadr sənədlərində istifadə olunan siyahıları saxlayır."],
      },
    ],
    tips: ["Əmək haqqı və məzuniyyət ödənişləri “Maliyyə əməliyyatları” bölməsindədir."],
    related: ["maliyye"],
  },
  {
    slug: "istifadeciler",
    icon: "◐",
    title: "İstifadəçilər, rollar və qruplar",
    summary: "Kimin sistemdə nəyi görə biləcəyini idarə edin.",
    panelHref: "/panel/istifadeciler",
    roles: [ROLES.ADMIN],
    sections: [
      {
        title: "İstifadəçi yaratmaq",
        steps: ["“İdentifikasiya” bölməsində “İstifadəçilər” tabını açın.", "“+ Yeni istifadəçi” düyməsini basın.", "Məlumatları doldurub uyğun rol təyin edin."],
      },
      {
        title: "Rol və qrup",
        steps: ["“Rollar” tabında “+ Yeni rol”, “Qruplar” tabında “+ Yeni qrup” yaradın.", "İstifadəçiləri rola və ya qrupa əlavə edin."],
      },
    ],
    tips: ["Hər kəsə yalnız işi üçün lazım olan rolu verin."],
    related: ["idareetme"],
  },
  {
    slug: "idareetme",
    icon: "⚙",
    title: "Sistem idarəetməsi və audit",
    summary: "Şirkət profili və dəyişikliklərin audit qeydləri.",
    panelHref: "/panel/idareetme",
    roles: [ROLES.ADMIN],
    sections: [
      {
        title: "Şirkət profili",
        steps: ["“İdarəetmə” bölməsində “Sistem idarəetməsi” tabını açın.", "Şirkət adı, direktor və ünvanı daxil edib yadda saxlayın.", "Şirkət adı saytın bütün yerlərində görünür."],
      },
      {
        title: "Audit qeydləri",
        steps: ["“Audit qeydləri” tabını açın.", "Kim, nə vaxt, nəyi dəyişdi — filtrlərlə axtarın."],
      },
    ],
    tips: ["Audit qeydləri dəyişdirilə bilməz."],
    related: ["istifadeciler"],
  },
  {
    slug: "profil",
    icon: "☺",
    title: "Mənim profilim (sakinlər üçün)",
    summary: "Mənzil sahibi üçün şəxsi bölmə: borc, tariflər, hesabat və müraciətlər.",
    panelHref: "/panel/profil",
    roles: [ROLES.OWNER],
    sections: [
      {
        title: "İlk giriş",
        steps: ["Saytda “Daxil ol” düyməsini basın və hesabınızla daxil olun.", "“Ümumi baxış” səhifəsində cari vəziyyətinizə baxın.", "“Mənim profilim” bölməsində məlumatlarınızı və mənzil/qaraj siyahınızı yoxlayın."],
      },
      {
        title: "Borc və ödənişlər",
        steps: ["Borcunuzu ümumi baxışda görürsünüz.", "“Tranzaksiyalar” bölməsində ödəniş tarixçənizə baxın.", "“Tariflər” bölməsində xidmət qiymətlərini yoxlayın.", "“Hesabatlar” bölməsində şəxsi hesabatınıza baxın."],
      },
      {
        title: "Müraciət",
        steps: ["“Müraciətlər” bölməsində yeni müraciət göndərin və statusunu izləyin."],
      },
    ],
    tips: ["Giriş hesabınız yoxdursa, kooperativin idarəsinə müraciət edin."],
    related: ["muraciyetler", "borclar"],
  },
];

export function getGuide(slug: string) {
  return guides.find((g) => g.slug === slug);
}
