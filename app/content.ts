export type Module = {
  icon: string;
  title: string;
  text: string;
  points: string[];
};

export const modules: Module[] = [
  {
    icon: "⌂",
    title: "Binalar və mənzillər",
    text: "Məhəllənin bütün fondu bir yerdə.",
    points: ["Binalar, mənzillər, qarajlar", "Sahiblər və sahiblik tarixçəsi", "İzometrik bina sxemi"],
  },
  {
    icon: "₼",
    title: "Müqavilə və borclar",
    text: "Tarifə əsasən avtomatik hesablama.",
    points: ["Müqavilələr, müştərilər, tədarükçülər", "Hesablar, avans və qismən ödənişlər", "Sahib üzrə borc izləmə"],
  },
  {
    icon: "⇄",
    title: "Tranzaksiyalar",
    text: "Hər gəlir və xərcin izlənə bilən qeydi.",
    points: ["Ümumi mühasibat kitabı", "Xərc və gəlir daxiletmə formaları", "Qəbz və sənəd əlavələri"],
  },
  {
    icon: "▩",
    title: "Hesabatlar",
    text: "Maliyyə mənzərəsi bir baxışda.",
    points: ["Ödəniş qrafiki", "Ümumi maliyyə hesabatı", "Sahib üçün şəxsi hesabat"],
  },
  {
    icon: "▦",
    title: "İnventar və anbar",
    text: "Material və avadanlıq uçotu.",
    points: ["Anbar və materiallar", "Daxilolmalar (qaimələr)", "Çıxarışlar və qalıq"],
  },
  {
    icon: "◈",
    title: "HR və əmək haqqı",
    text: "İşçi heyətinin tam idarəsi.",
    points: ["İşçilər, ərizələr, əmrlər", "Tabel və istehsalat təqvimi", "Əmək haqqı və məzuniyyət ödənişləri"],
  },
  {
    icon: "✳",
    title: "Müraciətlər",
    text: "Sakinlərlə açıq əlaqə.",
    points: ["Müraciətin qeydiyyatı", "Statusun izlənməsi", "Məsul şəxsə yönləndirmə"],
  },
  {
    icon: "◐",
    title: "İcazələr və audit",
    text: "Hər kəs yalnız öz səlahiyyətində.",
    points: ["İstifadəçilər, rollar, qruplar", "Rol əsaslı giriş", "Audit qeydləri — kim nə etdi"],
  },
];

export const stats = [
  { value: "8", label: "inteqrə modul" },
  { value: "5", label: "istifadəçi rolu" },
  { value: "1", label: "vahid məlumat bazası" },
  { value: "100%", label: "əməliyyat tarixçəsi" },
];

export const steps = [
  {
    icon: "⌂",
    title: "Qeydiyyat",
    text: "Bina, mənzil, sahib və müqavilə məlumatları bir dəfə daxil edilir.",
  },
  {
    icon: "₼",
    title: "Hesablama",
    text: "Tariflər əsasında aylıq hesablar və borclar avtomatik yaranır.",
  },
  {
    icon: "⇄",
    title: "Ödəniş və xərc",
    text: "Daxilolmalar, xərclər və maaşlar tranzaksiya kitabına düşür.",
  },
  {
    icon: "▩",
    title: "Hesabat",
    text: "Eyni məlumat əsasında qrafik və ümumi hesabatlar hazırlanır.",
  },
];

export const roles = [
  {
    name: "İdarəçi",
    text: "Bütün modullar, istifadəçi və rol idarəsi, audit və sistem ayarları.",
  },
  {
    name: "Komandant",
    text: "Binalar, inventar, müqavilələr, müraciətlər və HR.",
  },
  {
    name: "Mühasib",
    text: "Müqavilələr, borclar, maliyyə əməliyyatları, tranzaksiyalar və hesabatlar.",
  },
  {
    name: "Mənzil sahibi",
    text: "Öz borcu, tarifləri, tranzaksiyaları, hesabatı, müraciətləri və profili.",
  },
];
