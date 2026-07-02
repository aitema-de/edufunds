"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageHeroProps {
  badge?: {
    icon?: React.ReactNode;
    text: string;
  };
  title: string;
  titleAccent?: string;
  subtitle?: string;
  variant?: "light" | "dark";
  children?: ReactNode;
}

export function PageHero({
  badge,
  title,
  titleAccent,
  subtitle,
  variant = "dark",
  children,
}: PageHeroProps) {
  const isLight = variant === "light";
  const bgColor = isLight ? "#fdfdfc" : "#1c1917";
  const textColor = isLight ? "#1c1917" : "#fdfdfc";
  const subtitleColor = isLight ? "#57534e" : "#a8a29e";
  const accentColor = isLight ? "#1e3d32" : "#d4af37";

  return (
    <section
      className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32"
      style={{ backgroundColor: bgColor }}
    >
      {/* Geometric Background */}
      <div
        className="absolute inset-0 geometric-grid"
        style={{ opacity: isLight ? 0.08 : 0.15 }}
      />
      <div
        className="absolute inset-0 dots-pattern"
        style={{ opacity: isLight ? 0.06 : 0.08 }}
      />

      {/* Floating Shapes */}
      <div
        className="absolute top-[20%] right-[8%] w-64 h-64 hidden lg:block"
        style={{
          background: isLight
            ? "linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(217, 119, 6, 0.02) 100%)"
            : "linear-gradient(135deg, rgba(217, 119, 6, 0.06) 0%, transparent 100%)",
          borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[25%] left-[5%] w-48 h-48 hidden lg:block"
        style={{
          background: isLight
            ? "linear-gradient(135deg, rgba(28, 25, 23, 0.05) 0%, rgba(28, 25, 23, 0.01) 100%)"
            : "linear-gradient(135deg, rgba(26, 77, 77, 0.15) 0%, transparent 100%)",
          borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
          animation: "float 10s ease-in-out infinite",
          animationDelay: "-3s",
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          {badge && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs tracking-wider uppercase mb-8"
              style={{
                backgroundColor: isLight
                  ? "rgba(28, 25, 23, 0.05)"
                  : "rgba(217, 119, 6, 0.1)",
                border: `1px solid ${
                  isLight ? "rgba(28, 25, 23, 0.1)" : "rgba(217, 119, 6, 0.2)"
                }`,
                color: isLight ? "#1c1917" : "#d4af37",
              }}
            >
              {badge.icon}
              <span>{badge.text}</span>
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-serif mb-6"
            style={{ color: textColor }}
          >
            {title}
            {titleAccent && (
              <>
                {" "}
                <span style={{ color: accentColor }}>{titleAccent}</span>
              </>
            )}
          </motion.h1>

          {/* Accent Line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center mb-6"
          >
            <div
              className="w-16 h-0.5"
              style={{
                background: "linear-gradient(90deg, #1e3d32, #d4af37)",
              }}
            />
          </motion.div>

          {/* Subtitle */}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-lg md:text-xl leading-relaxed"
              style={{ color: subtitleColor, maxWidth: "700px", margin: "0 auto" }}
            >
              {subtitle}
            </motion.p>
          )}

          {/* Additional Content */}
          {children && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-10"
            >
              {children}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export default PageHero;
