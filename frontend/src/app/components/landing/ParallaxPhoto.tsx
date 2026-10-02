"use client";

import { motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import Image from "next/image";

interface ParallaxPhotoProps {
  /** Scroll progress (0 to 1) of the section this photo sits in. */
  progress: MotionValue<number>;
  /** Vertical travel at progress 0 and 1. The photo moves slower than the page, which reads as depth. */
  from: string;
  to: string;
  /** Optional pointer offset (-0.5 to 0.5) so the photo drifts against the cursor. */
  mouseX?: MotionValue<number>;
  mouseY?: MotionValue<number>;
  /** Preload. Use for the hero only; the closing section stays lazy. */
  priority?: boolean;
}

const PHOTO_SRC = "/images/hero-bg-landscape.jpg";
const MOUSE_SHIFT_PX = 26;

export function ParallaxPhoto({ progress, from, to, mouseX, mouseY, priority = false }: ParallaxPhotoProps) {
  const reduceMotion = useReducedMotion();
  const y = useTransform(progress, [0, 1], [from, to]);
  const scale = useTransform(progress, [0, 1], [1.12, 1.02]);
  const dragX = useTransform(mouseX ?? progress, (value) => (mouseX ? value * -MOUSE_SHIFT_PX : 0));
  const dragY = useTransform(mouseY ?? progress, (value) => (mouseY ? value * -MOUSE_SHIFT_PX : 0));

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-lp-surface">
      <motion.div
        style={reduceMotion ? undefined : { y, scale }}
        className="absolute inset-x-[-4%] inset-y-[-14%]"
      >
        <motion.div style={reduceMotion ? undefined : { x: dragX, y: dragY }} className="relative h-full w-full">
          <Image
            src={PHOTO_SRC}
            alt=""
            fill
            sizes="100vw"
            priority={priority}
            className="object-cover dark:brightness-75"
          />
        </motion.div>
      </motion.div>
      <div className="absolute inset-0 bg-black/35" />
    </div>
  );
}
