import Image from "next/image";

export function Logo({
  name,
  variant = "header",
}: {
  name: string;
  variant?: "header" | "footer";
}) {
  const brandClassName = variant === "footer" ? "brand footer-brand" : "brand";
  const markClassName =
    variant === "footer" ? "brand-mark brand-mark-footer" : "brand-mark brand-mark-header";

  return (
    <a className={brandClassName} href="#top" aria-label={`${name} ana səhifə`}>
      <Image
        src="/logo.png"
        alt={`${name} logo`}
        width={186}
        height={106}
        priority={variant === "header"}
        className={markClassName}
      />
      <span>{name}</span>
    </a>
  );
}
