"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface InfoCardProps {
  icon?: React.ReactNode;
  title: string;
  children: ReactNode;
  variant?: "light" | "dark" | "highlight";
  className?: string;
  delay?: number;
}

export function InfoCard({
  icon,
  title,
  children,
  variant = "dark",
  className = "",
  delay = 0,
}: InfoCardProps) {
  const variants = {
    light: {
      background: "rgba(255, 255, 255, 0.8)",
      border: "1px solid rgba(10, 22, 40, 0.06)",
      titleColor: "#0a1628",
      textColor: "#1e3a61",
      iconBg: "rgba(201, 162, 39, 0.1)",
      iconColor: "#c9a227",
    },
    dark: {
      background: "rgba(15, 31, 56, 0.6)",
      border: "1px solid rgba(201, 162, 39, 0.1)",
      titleColor: "#f8f5f0",
      textColor: "#94a3b8",
      iconBg: "rgba(201, 162, 39, 0.1)",
      iconColor: "#c9a227",
    },
    highlight: {
      background: "linear-gradient(135deg, rgba(201, 162, 39, 0.1) 0%, rgba(201, 162, 39, 0.02) 100%)",
      border: "1px solid rgba(201, 162, 39, 0.2)",
      titleColor: "#0a1628",
      textColor: "#334155",
      iconBg: "rgba(201, 162, 39, 0.2)",
      iconColor: "#c9a227",
    },
  };

  const style = variants[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`group rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${className}`}
      style={{
        background: style.background,
        border: style.border,
        backdropFilter: variant === "light" ? "blur(8px)" : "blur(12px)",
      }}
    >
      {/* Corner Decoration */}
      <div
        className="absolute top-6 right-6 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          borderTop: "2px solid #c9a227",
          borderRight: "2px solid #c9a227",
          position: "absolute",
        }}
      />

      {/* Icon */}
      {icon && (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
          style={{
            backgroundColor: style.iconBg,
            border: `1px solid ${variant === "highlight" ? "rgba(201, 162, 39, 0.3)" : "transparent"}`,
          }}
        >
          <div style={{ color: style.iconColor }}>{icon}</div>
        </div>
      )}

      {/* Title */}
      <h3
        className="font-serif text-xl mb-3"
        style={{ color: style.titleColor }}
      >
        {title}
      </h3>

      {/* Content */}
      <div style={{ color: style.textColor }} className="text-sm leading-relaxed">
        {children}
      </div>

      {/* Bottom Line */}
      <div
        className="absolute bottom-0 left-8 right-8 h-0.5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
        style={{ backgroundColor: "#c9a227" }}
      />
    </motion.div>
  );
}

export default InfoCard;
