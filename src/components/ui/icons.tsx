import type { ReactNode } from "react";

/** Schlichte Linien-Icons (24×24), Farbe über currentColor. Dekorativ: aria-hidden. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const CheckIcon = () => (
  <Icon>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);
export const CrossIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
export const LockIcon = () => (
  <Icon>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </Icon>
);
export const PathIcon = () => (
  <Icon>
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="6" r="2" />
    <path d="M8 18h6a3 3 0 000-6h-4a3 3 0 010-6h6" />
  </Icon>
);
export const RepeatIcon = () => (
  <Icon>
    <path d="M17 3l3 3-3 3" />
    <path d="M4 11V9a3 3 0 013-3h13" />
    <path d="M7 21l-3-3 3-3" />
    <path d="M20 13v2a3 3 0 01-3 3H4" />
  </Icon>
);
export const ExamIcon = () => (
  <Icon>
    <path d="M7 3h8l4 4v14H7z" />
    <path d="M15 3v4h4M10 12h6M10 16h6" />
  </Icon>
);
export const ProfileIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0116 0" />
  </Icon>
);
export const FlameIcon = () => (
  <Icon>
    <path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z" />
  </Icon>
);
export const StarIcon = () => (
  <Icon>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </Icon>
);
export const AlertIcon = () => (
  <Icon>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17.5v.01" />
  </Icon>
);
export const OfflineIcon = () => (
  <Icon>
    <path d="M3 3l18 18" />
    <path d="M5 10a10 10 0 014-2.5M10 5.1A10 10 0 0119 10M8.5 13.5a6 6 0 013-1.5M15.5 13.5a6 6 0 00-1-.8" />
    <path d="M12 18.5v.01" />
  </Icon>
);
export const InboxIcon = () => (
  <Icon>
    <path d="M3 13l3-8h12l3 8v6H3z" />
    <path d="M3 13h5l1 3h6l1-3h5" />
  </Icon>
);
