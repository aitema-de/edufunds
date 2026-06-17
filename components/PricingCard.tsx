"use client";

import { motion } from "framer-motion";
import { Check, X, Sparkles, Zap, Building2, Users } from "lucide-react";
import Link from "next/link";

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingCardProps {
  name: string;
  description: string;
  price: string;
  priceSubtext?: string;
  period?: string;
  features: PricingFeature[];
  ctaText: string;
  ctaLink: string;
  highlighted?: boolean;
  badge?: string;
  icon: React.ElementType;
  delay?: number;
}

export function PricingCard({
  name,
  description,
  price,
  priceSubtext,
  period,
  features,
  ctaText,
  ctaLink,
  highlighted = false,
  badge,
  icon: Icon,
  delay = 0,
}: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative group h-full ${highlighted ? "lg:-mt-4 lg:mb-4" : ""}`}
    >
      {/* Highlighted Border Glow */}
      {highlighted && (
        <div
          className="absolute -inset-0.5 rounded-2xl opacity-60 blur-sm group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "linear-gradient(135deg, #d97706 0%, #fbbf24 50%, #d97706 100%)",
          }}
        />
      )}

      {/* Card */}
      <div
        className={`relative h-full flex flex-col rounded-2xl transition-all duration-500 ${
          highlighted
            ? "bg-[#1c1917] border-2 border-[#d97706]/50"
            : "bg-[#1c1917]/60 border border-[#d97706]/10 hover:border-[#d97706]/30"
        }`}
      >
        {/* Badge */}
        {badge && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
            <div
              className="px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap"
              style={{
                background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                color: "#1c1917",
              }}
            >
              {badge}
            </div>
          </div>
        )}

        <div className="p-8 flex flex-col h-full">
          {/* Icon & Name */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: highlighted ? "rgba(217, 119, 6, 0.2)" : "rgba(217, 119, 6, 0.1)",
                border: `1px solid ${highlighted ? "rgba(217, 119, 6, 0.4)" : "rgba(217, 119, 6, 0.2)"}`,
              }}
            >
              <Icon
                className="w-6 h-6"
                style={{ color: highlighted ? "#fbbf24" : "#d97706" }}
              />
            </div>
            <div>
              <h3
                className="font-serif text-xl mb-1"
                style={{ color: "#fdfdfc" }}
              >
                {name}
              </h3>
              <p
                className="text-sm"
                style={{ color: "#a8a29e" }}
              >
                {description}
              </p>
            </div>
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span
                className="text-4xl font-serif"
                style={{ color: "#fdfdfc" }}
              >
                {price}
              </span>
              {period && (
                <span
                  className="text-sm"
                  style={{ color: "#a8a29e" }}
                >
                  {period}
                </span>
              )}
            </div>
            {priceSubtext && (
              <p
                className="text-sm mt-1"
                style={{ color: "#a8a29e" }}
              >
                {priceSubtext}
              </p>
            )}
          </div>

          {/* Divider */}
          <div
            className="h-px w-full mb-6"
            style={{ backgroundColor: "rgba(217, 119, 6, 0.15)" }}
          />

          {/* Features */}
          <ul className="space-y-3 mb-8 flex-grow">
            {features.map((feature, index) => (
              <li
                key={index}
                className="flex items-start gap-3"
              >
                {feature.included ? (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: "rgba(26, 77, 77, 0.3)" }}
                  >
                    <Check className="w-3 h-3" style={{ color: "#1a4d4d" }} />
                  </div>
                ) : (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                  >
                    <X className="w-3 h-3" style={{ color: "#78716c" }} />
                  </div>
                )}
                <span
                  className={`text-sm ${
                    feature.included ? "" : "line-through opacity-50"
                  }`}
                  style={{ color: feature.included ? "#fdfdfc" : "#78716c" }}
                >
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <Link
            href={ctaLink}
            className={`w-full py-3.5 rounded-xl font-semibold text-center flex items-center justify-center gap-2 transition-colors ${
              highlighted
                ? "bg-amber-600 text-[#1c1917] hover:bg-amber-500"
                : "border-2 border-amber-600 text-amber-500 hover:bg-amber-600 hover:text-[#1c1917]"
            }`}
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
