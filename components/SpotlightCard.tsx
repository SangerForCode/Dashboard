"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import "./SpotlightCard.css";

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(255, 255, 255, 0.25)",
}: {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${event.clientX - bounds.left}px`);
    card.style.setProperty("--mouse-y", `${event.clientY - bounds.top}px`);
    card.style.setProperty("--spotlight-color", spotlightColor);
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={`card-spotlight ${className}`}
    >
      {children}
    </div>
  );
}
