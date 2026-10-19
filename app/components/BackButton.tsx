"use client";

import { useRouter } from "next/navigation";

export function BackButton({ className, children = "← Geri qayıt" }: { className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        // Tarixçə yoxdursa (səhifə birbaşa açılıbsa) ana səhifəyə qayıt.
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
    >
      {children}
    </button>
  );
}
