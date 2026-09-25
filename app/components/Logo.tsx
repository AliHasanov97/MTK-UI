import Image from "next/image";

export function Logo({
  variant = "header",
}: {
  variant?: "header" | "footer";
}) {
  const brandClassName = variant === "footer" ? "brand footer-brand" : "brand";
  const markClassName =
    variant === "footer" ? "brand-mark brand-mark-footer" : "brand-mark brand-mark-header";

  return (
    <a className={brandClassName} href="#top" aria-label="Babek 87 ana səhifə">
      <Image
        src="/logo.png"
        alt="Babek 87 logo"
        width={186}
        height={106}
        priority={variant === "header"}
        className={markClassName}
      />
      <span>Vahid MTK</span>
    </a>
  );
}
