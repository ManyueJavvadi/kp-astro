"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const variants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** 0 to 1 — how much of element must be visible to trigger. Default 0.2 */
  amount?: number;
  /** If true, uses margin="-100px" for earlier trigger */
  earlier?: boolean;
  as?: "div" | "section";
}

/**
 * Scroll-triggered fade-in-up (GitHub-style).
 * Wrap any element to have it rise softly into view when scrolled to.
 * Only animates ONCE per element.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  amount = 0.2,
  earlier = false,
  as = "div",
}: RevealProps) {
  const Component = as === "section" ? motion.section : motion.div;
  return (
    <Component
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount, margin: earlier ? "-100px" : "0px" }}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </Component>
  );
}

/**
 * Stagger-reveal container. Children use RevealChild.
 */
export function RevealStagger({
  children,
  className,
  staggerDelay = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: staggerDelay, delayChildren: 0.1 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealChild({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={cn(className)} variants={variants}>
      {children}
    </motion.div>
  );
}
