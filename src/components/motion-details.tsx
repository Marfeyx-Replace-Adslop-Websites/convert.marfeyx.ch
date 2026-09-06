/** Adapted from Magic UI components on 21st.dev. See THIRD_PARTY_NOTICES.md. */
import { useId, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react";

export function BlurFade({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 8, filter: "blur(3px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function DotPattern() {
  const id = useId();
  return (
    <svg className="dot-pattern" aria-hidden="true">
      <defs>
        <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".8" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export function BorderBeam() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <div className="border-beam" aria-hidden="true">
      <motion.div
        style={{ width: 100, offsetPath: "rect(0 auto auto 0 round 18px)" }}
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "100%" }}
        transition={{ repeat: Infinity, ease: "linear", duration: 8 }}
      />
    </div>
  );
}

export function MagicCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const reduced = useReducedMotion();
  const background = useMotionTemplate`radial-gradient(220px circle at ${x}px ${y}px, #7561ac12, transparent 80%)`;
  return (
    <div
      className={`magic-card ${className}`}
      onPointerMove={(event) => {
        if (reduced || event.pointerType === "touch") return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left);
        y.set(event.clientY - rect.top);
      }}
      onPointerLeave={() => {
        x.set(-400);
        y.set(-400);
      }}
    >
      <motion.div className="magic-highlight" style={{ background }} aria-hidden="true" />
      {children}
    </div>
  );
}
