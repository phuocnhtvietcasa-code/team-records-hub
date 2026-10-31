import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/finance";

export function useChartAnimation() {
  const reduced = useReducedMotion();
  return { isAnimationActive: !reduced, animationDuration: 850, animationBegin: 0, animationEasing: "ease-out" as const };
}

export function AnimatedNumber({ value, format = formatVND }: { value: number; format?: (n: number) => string }) {
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => motionValue.on("change", setDisplay), [motionValue]);
  useEffect(() => {
    if (reduced) { motionValue.set(value); return; }
    const controls = animate(motionValue, value, { duration: 0.95, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, reduced, motionValue]);
  return <span className="inline-grid max-w-full tabular-nums" aria-label={format(value)} data-counter-target={value}><span aria-hidden="true" className="invisible col-start-1 row-start-1">{format(value)}</span><span aria-hidden="true" className="col-start-1 row-start-1">{format(reduced ? value : display)}</span></span>;
}

export const integerNumber = (n: number) => Math.round(n).toLocaleString("vi-VN");
export const percentNumber = (n: number) => `${n.toFixed(1)}%`;