import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SCROLL_STEP_PX = 188;

interface AvatarCarouselStripProps {
  children: React.ReactNode;
  itemCount: number;
}

export const AvatarCarouselStrip: React.FC<AvatarCarouselStripProps> = ({
  children,
  itemCount,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollHints();

    const runUpdate = () => {
      requestAnimationFrame(updateScrollHints);
    };

    el.addEventListener("scroll", updateScrollHints, { passive: true });
    window.addEventListener("resize", runUpdate);

    const observer = new ResizeObserver(runUpdate);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollHints);
      window.removeEventListener("resize", runUpdate);
      observer.disconnect();
    };
  }, [itemCount, updateScrollHints]);

  const scrollByDirection = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({
      left: direction * SCROLL_STEP_PX,
      behavior: "smooth",
    });
  };

  return (
    <div
      className="relative mx-auto w-full min-w-0 max-w-[15.5rem] sm:max-w-[17rem] rounded-xl overflow-hidden"
      role="group"
      aria-label="Opciones de avatar"
    >
      {canScrollLeft && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-9 bg-gradient-to-r from-auth-surface via-auth-surface/90 to-transparent"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => scrollByDirection(-1)}
            aria-label="Ver avatares anteriores"
            className="
              absolute left-0 top-1/2 z-20 -translate-y-1/2
              flex h-8 w-8 items-center justify-center
              rounded-full border border-auth-input-border
              bg-auth-surface/95 text-auth-title shadow-md
              transition-all duration-200
              hover:border-auth-btn/50 hover:text-auth-btn
              active:scale-95
            "
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}

      {canScrollRight && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-9 bg-gradient-to-l from-auth-surface via-auth-surface/90 to-transparent"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => scrollByDirection(1)}
            aria-label="Ver más avatares"
            className="
              absolute right-0 top-1/2 z-20 -translate-y-1/2
              flex h-8 w-8 items-center justify-center
              rounded-full border border-auth-input-border
              bg-auth-surface/95 text-auth-title shadow-md
              transition-all duration-200
              hover:border-auth-btn/50 hover:text-auth-btn
              active:scale-95
            "
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        role="group"
        aria-label="Opciones de avatar disponibles"
        className="
          flex w-full min-w-0 flex-nowrap items-center gap-3
          overflow-x-auto overflow-y-hidden overscroll-x-contain
          scroll-smooth py-1 touch-pan-x
          [scrollbar-width:none]
          [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-auth-btn
          focus-visible:ring-offset-2
          rounded-lg
        "
        style={{
          paddingLeft: canScrollLeft ? "2rem" : undefined,
          paddingRight: canScrollRight ? "2rem" : undefined,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </div>
    </div>
  );
};
