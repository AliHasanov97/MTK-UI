"use client";

import { useEffect, useState } from "react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href="#top"
      className={`lp-top${visible ? " lp-top-visible" : ""}`}
      aria-label="Yuxarı qayıt"
      tabIndex={visible ? 0 : -1}
    >
      ↑
    </a>
  );
}
