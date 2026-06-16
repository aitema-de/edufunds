"use client";

import { motion } from "framer-motion";

interface SectionHeaderProps {
  label?: string;
  title: string;
  titleAccent?: string;
  description?: string;
  variant?: "light" | "dark";
  align?: "left" | "center" | "right";
}

export function SectionHeader({
  label,
  title,
  titleAccent,
  description,
  variant = "dark",
  align = "center",
}: SectionHeaderProps) {
  const isLight = variant === "light";
  const labelColor = isLight ? "#7a5e12" : "#c9a227";
  const titleColor = isLight ? "#0a1628" : "#f8f5f0";
  const descriptionColor = isLight ? "#1e3a61" : "#94a3b8";
  const accentColor = isLight ? "#7a5e12" : "#c9a227";

  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`mb-12 ${alignClass}`}
    >
      {label && (
        <span
          className="inline-block font-mono text-xs tracking-widest uppercase mb-4"
          style={{ color: labelColor }}
        >
          {label}
        </span>
      )}
      <h2
        className="font-serif mb-4"
        style={{ color: titleColor }}
      >
        {title}
        {titleAccent && (
          <>
            {" "}
            <span style={{ color: accentColor }}>{titleAccent}</span>
          </>
        )}
      </h2>
      <div className={`flex ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : ""} mb-6`}>
        <div
          className="w-16 h-0.5"
          style={{ background: "linear-gradient(90deg, #c9a227, #e4c55a)" }}
        />
      </div>
      {description && (
        <p
          className="text-lg max-w-2xl"
          style={{ color: descriptionColor, margin: align === "center" ? "0 auto" : undefined }}
        >
          {description}
        </p>
      )}
    </motion.div>
  );
}

export default SectionHeader;
