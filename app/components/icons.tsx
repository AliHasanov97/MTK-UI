import type { ReactNode } from "react";

type IconProps = { size?: number; className?: string };

function Icon({
  children,
  size = 20,
  className,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Binalar / mənzillər */
export function BuildingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
      <path d="M14 9h5a1 1 0 0 1 1 1v11" />
      <path d="M2 21h20" />
      <path d="M7 8h4M7 12h4M7 16h4M17 13h.01M17 17h.01" />
    </Icon>
  );
}

/** Müqavilə / borc / ödəniş */
export function ReceiptIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-2-2-3 2V4a1 1 0 0 1 1-1z" />
      <path d="M9 8h6M9 12h4" />
    </Icon>
  );
}

/** Tranzaksiya */
export function SwapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8h13l-3-3" />
      <path d="M20 16H7l3 3" />
    </Icon>
  );
}

/** Hesabat */
export function AnalyticsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 17v-5M12 17V7M17 17v-3" />
    </Icon>
  );
}

/** İnventar / anbar */
export function InventoryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </Icon>
  );
}

/** HR / işçi */
export function HrIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="5" width="16" height="16" rx="3" />
      <path d="M9 3h6v4H9z" />
      <path d="M8 12h8M8 16h5" />
    </Icon>
  );
}

/** Müraciət / dəstək */
export function SupportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="2" y="13" width="4" height="7" rx="2" />
      <rect x="18" y="13" width="4" height="7" rx="2" />
      <path d="M20 20a4 4 0 0 1-4 3h-2" />
    </Icon>
  );
}

/** İcazə / audit / təhlükəsizlik */
export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9.3 12.4l2 2 3.6-4" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </Icon>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6c-1.6-1.6-4.2-2-7.5-2v14c3.3 0 5.9.4 7.5 2 1.6-1.6 4.2-2 7.5-2V4c-3.3 0-5.9.4-7.5 2z" />
      <path d="M12 6v14" />
    </Icon>
  );
}

export function NewsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5h12a1 1 0 0 1 1 1v14H6a2 2 0 0 1-2-2z" />
      <path d="M17 9h2a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2" />
      <path d="M7 9h6M7 13h6M7 17h3" />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </Icon>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z" />
    </Icon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </Icon>
  );
}

export function LoginIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" />
      <path d="M10 8l4 4-4 4M3 12h11" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 6L9 17l-5-5" />
    </Icon>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v11m0 0l-4-4m4 4l4-4" />
      <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </Icon>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 3L3 11l7 3 3 7z" />
      <path d="M10 14L21 3" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
  );
}
