import Link from "next/link";
import { ArrowRightIcon } from "./icons";

export function SectionHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="c-sec-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <Link className="c-pill-link" href={action.href}>
          {action.label}
          <ArrowRightIcon size={14} />
        </Link>
      )}
    </div>
  );
}
