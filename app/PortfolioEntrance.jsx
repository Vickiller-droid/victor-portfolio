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
  const tilt = useRef(null);

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

  useEffect(() => {
    const layer = tilt.current;
    const Orientation = window.DeviceOrientationEvent;
    if (!layer || !Orientation || typeof Orientation.requestPermission === "function") return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const screenOrientation = window.screen.orientation;
    let origin;
    let frame = 0;
    let x = 0, y = 0, targetX = 0, targetY = 0;
    let heldSince = null;
    let heldX = 0, heldY = 0;

    function reset() {
      origin = undefined;
      cancelAnimationFrame(frame);
      frame = 0;
      x = y = targetX = targetY = heldX = heldY = 0;
      heldSince = null;
      layer.style.removeProperty("transform");
    }

    function draw(now) {
      const drift = heldSince === null ? 0 : Math.min(3, Math.max(0, now - heldSince - 650) / 2200);
      const nextX = targetX + heldX * drift;
      const nextY = targetY + heldY * drift;
      x += (nextX - x) * .12;
      y += (nextY - y) * .12;
      const moving = Math.abs(nextX - x) + Math.abs(nextY - y) > .06;
      if (!moving) { x = nextX; y = nextY; }
      layer.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      frame = moving || (heldSince !== null && drift < 3) ? requestAnimationFrame(draw) : 0;
    }

    function onTilt({ beta, gamma }) {
      if (preference.matches || document.hidden || !Number.isFinite(beta) || !Number.isFinite(gamma)) return;
      const angle = (screenOrientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
      if (!origin || origin.angle !== angle) {
        reset();
        origin = { beta, gamma, angle };
        return;
      }
      const pitch = ((beta - origin.beta + 540) % 360) - 180;
      const roll = gamma - origin.gamma;
      const shift = value => Math.sign(value) * Math.min(9, Math.max(0, Math.abs(value) - 1.5) * .45);
      targetX = shift(roll * Math.cos(angle) + pitch * Math.sin(angle));
      targetY = shift(pitch * Math.cos(angle) - roll * Math.sin(angle));
      const magnitude = Math.hypot(targetX, targetY);
      if (magnitude >= (heldSince === null ? 2.5 : 1.5)) {
        const directionX = targetX / magnitude;
        const directionY = targetY / magnitude;
        if (heldSince === null || directionX * heldX + directionY * heldY < 5) {
          heldSince = performance.now();
          heldX = directionX * 8;
          heldY = directionY * 8;
        }
      } else {
        heldSince = null;
        heldX = heldY = 0;
      }
      if (!frame && (heldSince !== null ? performance.now() - heldSince < 7250 || Math.abs(x - targetX - heldX * 3) + Math.abs(y - targetY - heldY * 3) > .06 : x !== targetX || y !== targetY)) frame = requestAnimationFrame(draw);
    }

    window.addEventListener("deviceorientation", onTilt, { passive: true });
    preference.addEventListener?.("change", reset);
    screenOrientation?.addEventListener?.("change", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      window.removeEventListener("deviceorientation", onTilt);
      preference.removeEventListener?.("change", reset);
      screenOrientation?.removeEventListener?.("change", reset);
      document.removeEventListener("visibilitychange", reset);
      reset();
    };
  }, []);

  return <div className="portfolioShapes" aria-hidden="true">
    <div ref={tilt} style={{ position: "absolute", inset: 0 }}>
    <div ref={field} className="portfolioShapeField">
      {["square", "ring", "ring", "square", "triangle"].map((kind, index) => (
        <div className="portfolioOrbit" key={index} data-shape={kind}>
          <span className="orbitTrail orbitTrailFar"/>
          <span className="orbitTrail"/>
          <span className="orbitLead">
            {kind === "triangle" ? <svg viewBox="0 0 32 32" focusable="false"><path d="M16 4 29 27H3Z"/></svg> : <i/>}
          </span>
        </div>
      ))}
      <div className="portfolioDust"><i/><i/><i/><i/><i/><i/></div>
    </div>
    </div>
  </div>;
}
