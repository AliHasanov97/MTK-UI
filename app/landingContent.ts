export const compare = {
  before: [
    "Excel cədvəlləri və kağız qeydlər",
    "Borc və ödənişlər müxtəlif faylda",
    "Kim nəyi dəyişdi — bilinmir",
    "Sakin məlumat üçün idarəyə zəng edir",
    "Hesabat əl ilə, gec hazırlanır",
  ],
  after: [
    "Vahid sistem, ortaq məlumat bazası",
    "Hesablar, borclar və ödənişlər bir yerdə",
    "Hər əməliyyatın audit qeydi var",
    "Sakin borcunu və tarixçəsini özü görür",
    "Hesabatlar real vaxtda hazırdır",
  ],
};

export const residentFeatures = [
  { icon: "₼", title: "Borcunuzu görün", text: "Cari borc, hesablar və ödəniş tarixçəsi şəxsi panelinizdədir." },
  { icon: "▩", title: "Hesabat və tariflər", text: "Tarifləri və şəxsi hesabatınızı istədiyiniz vaxt yoxlayın." },
  { icon: "✳", title: "Müraciət göndərin", text: "Problemi qeyd edin, statusunu izləyin, idarəyə zəng etməyə ehtiyac yoxdur." },
  { icon: "☺", title: "Profil", text: "Əlaqə məlumatlarınızı və mənzil/qaraj siyahınızı bir yerdə saxlayın." },
];

export const security = [
  { icon: "◐", title: "Rol əsaslı giriş", text: "Hər istifadəçi yalnız öz səlahiyyətinə aid bölmələri görür." },
  { icon: "✓", title: "Mərkəzləşmiş autentifikasiya", text: "Giriş Keycloak vasitəsilə, ayrıca şifrə saxlanmadan həyata keçirilir." },
  { icon: "≡", title: "Audit qeydləri", text: "Kim, nə vaxt, nəyi dəyişdi — administrator hər şeyi izləyə bilir." },
  { icon: "⇄", title: "İzlənə bilən maliyyə", text: "Hər gəlir və xərc tranzaksiya kitabında sənədlə birlikdə saxlanılır." },
];

export const about = {
  text: [
    "Bu sistem Mənzil-Tikinti Kooperativinin gündəlik işini sadələşdirmək üçün hazırlanıb: binalar, mənzillər, kommunal hesablar, maliyyə, inventar və işçi heyəti ayrı-ayrı cədvəllərdə yox, bir yerdə idarə olunur.",
    "Məqsədimiz idarəetməni şəffaf etməkdir: idarəçi tam mənzərəni, mühasib dəqiq rəqəmləri, sakin isə öz borcunu və müraciətinin gedişatını görür.",
  ],
  values: ["Şəffaflıq", "Dəqiqlik", "Sadəlik", "Hesabatlılıq"],
};

export const changelog = [
  { tag: "Yeni", title: "Əmək haqqı ödənişləri", text: "İşçilər üçün maaş ödənişləri, qəbzlər (PDF) və ödəniş tarixçəsi." },
  { tag: "Yeni", title: "Məzuniyyət ödənişləri", text: "Məzuniyyət pulunun hesablanması və idarə olunması." },
  { tag: "Yeni", title: "Maliyyə əməliyyatları", text: "Xərc və gəlir daxiletməsi, tariflər və yenilənmiş əməliyyatlar səhifəsi." },
  { tag: "Təkmil", title: "Cədvəllər və filtrlər", text: "Sütun filtrləri, çeşidləmə və telefon üçün kart görünüşü." },
];

export const faqs = [
  {
    q: "Sistemə necə giriş əldə edə bilərəm?",
    a: "Giriş hesabları kooperativin idarəsi tərəfindən yaradılır. Hesabınız yoxdursa, idarəyə müraciət edin; yaradıldıqdan sonra “Daxil ol” düyməsi ilə daxil olun.",
  },
  {
    q: "Mənzil sahibi olaraq nəyi görürəm?",
    a: "Öz borcunuzu, tarifləri, tranzaksiyalarınızı, hesabatınızı, müraciətlərinizi və profilinizi. Digər sakinlərin məlumatları sizə görünmür.",
  },
  {
    q: "Borc necə hesablanır?",
    a: "Müqavilə və tariflər əsasında aylıq hesablar avtomatik yaranır. Qismən və avans ödənişlər də nəzərə alınır, qalıq borc hər hesab üzrə göstərilir.",
  },
  {
    q: "Məlumatlarım təhlükəsizdir?",
    a: "Giriş rola görə məhdudlaşdırılıb, autentifikasiya mərkəzləşmiş şəkildə aparılır və bütün dəyişikliklər audit qeydlərində saxlanılır.",
  },
  {
    q: "Müraciətimin nə vəziyyətdə olduğunu necə bilərəm?",
    a: "“Müraciətlər” bölməsində hər müraciətin statusu göstərilir. Yeni müraciəti də oradan göndərə bilərsiniz.",
  },
  {
    q: "Hesabatları yükləmək olar?",
    a: "Bəli, ödəniş qrafiki və ümumi hesabat panelin “Hesabatlar” bölməsindədir. Əmək haqqı qəbzləri isə PDF formatında çıxarıla bilir.",
  },
  {
    q: "Mobil telefondan istifadə etmək olar?",
    a: "Bəli, sistem telefon və planşet ekranlarına uyğunlaşdırılıb; cədvəllər kiçik ekranda kart görünüşünə keçir.",
  },
];

export const contact = [
  { icon: "✉", label: "E-poçt", value: "info@mtk.az", href: "mailto:info@mtk.az" },
  { icon: "☎", label: "Telefon", value: "Əlavə olunacaq", href: undefined },
  { icon: "⌂", label: "Ünvan", value: "Əlavə olunacaq", href: undefined },
  { icon: "◷", label: "İş saatları", value: "Əlavə olunacaq", href: undefined },
];
