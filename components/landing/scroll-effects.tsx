"use client";

import { useEffect } from "react";

export function ScrollEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sections = document.querySelectorAll(".marketing .m-section");
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("m-section-entered");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08 });
    sections.forEach(section => observer.observe(section));
    return () => {
      observer.disconnect();
      sections.forEach(section => section.classList.remove("m-section-entered"));
    };
  }, []);
  return null;
}
