"use client";

import React, { useEffect, useRef, useState } from "react";
import { MASCOT_MODEL_URL } from "./dancingMascot.clips.utils";
import type { MascotSceneHandle } from "./dancingMascot.scene";

export default function DancingMascot() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<MascotSceneHandle | null>(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });
  const [isExcited, setIsExcited] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      const { mountDancingMascotScene } = await import("./dancingMascot.scene");
      if (cancelled || !canvasRef.current) return;
      try {
        const handle = await mountDancingMascotScene(canvasRef.current, {
          modelUrl: MASCOT_MODEL_URL,
          reducedMotion,
          onReady: () => {
            if (!cancelled) setIsReady(true);
          },
        });
        if (cancelled) {
          handle.dispose();
          return;
        }
        sceneRef.current = handle;
      } catch (error) {
        console.warn("3D mascot failed to load", error);
      }
    })();

    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      active: true,
      moved: false,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    if (dx * dx + dy * dy > 36) {
      dragRef.current.moved = true;
    }
  };

  const handlePointerUp = () => {
    const wasTap = dragRef.current.active && !dragRef.current.moved;
    dragRef.current.active = false;
    if (!wasTap) return;
    sceneRef.current?.playExcited();
    setIsExcited(true);
    window.setTimeout(() => setIsExcited(false), 1600);
  };

  return (
    <div
      className={`pet-3d-stage${isExcited ? " pet-excited" : ""}${isReady ? " pet-ready" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        dragRef.current.active = false;
      }}
      title="Drag to look around · click to interact"
      role="img"
      aria-label="3D cartoon standing mascot. Drag to look around, click to interact."
    >
      <canvas
        ref={canvasRef}
        className="pet-3d-canvas"
        aria-hidden={true}
      />
      <div className="pet-speech-pill" aria-hidden={true}>
        <span>Hey! Let&apos;s build! 🚀</span>
      </div>
    </div>
  );
}

