"use client";

import { useEffect, useRef, useState } from "react";

function Words({ text, offset = 0 }) {
  let index = offset;
  return text.split(" ").map((word, w) => (
    <span className="assemblyWord" key={w} style={{ marginRight: w < text.split(" ").length - 1 ? ".22em" : 0 }}>
      {Array.from(word).map((letter, i) => {
        const n = index++;
        return <span key={i} className="assemblyLetter" style={{ "--letter": n }}>{letter}</span>;
      })}
      {w < text.split(" ").length - 1 ? " " : null}
    </span>
  ));
}

export default function PortfolioEntrance() {
  const [replay, setReplay] = useState(0);
  return <>
    <h1 className="portfolioAssembly" key={replay} aria-label="Thoughtful software. Practical solutions.">
      <span aria-hidden="true"><Words text="Thoughtful software."/><br/><em><Words text="Practical solutions." offset={19}/></em></span>
    </h1>
    <button className="entranceReplay" type="button" onClick={() => setReplay(n => n + 1)}>Replay entrance <span aria-hidden="true">↻</span></button>
  </>;
}

export function FloatingShapes() {
  const field = useRef(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastY = window.scrollY;
    let lastNudge = -Infinity;
    let nudge;

    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      const now = performance.now();
      if (!delta || motion.matches || now - lastNudge < 600 || !field.current?.animate) return;

      lastNudge = now;
      const offset = Math.sign(delta) * -7;
      nudge?.cancel();
      nudge = field.current.animate(
        [{ transform: "translateY(0)" }, { transform: `translateY(${offset}px)`, offset: 0.28 }, { transform: "translateY(0)" }],
        { duration: 580, easing: "ease-out" }
      );
    }

    function onMotionChange() {
      if (motion.matches) nudge?.cancel();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    motion.addEventListener?.("change", onMotionChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      motion.removeEventListener?.("change", onMotionChange);
      nudge?.cancel();
    };
  }, []);

  return <div className="portfolioShapes" aria-hidden="true">
    <div ref={field} className="portfolioShapeField">
      <span/><span/><span/><span/>
    </div>
  </div>;
}
