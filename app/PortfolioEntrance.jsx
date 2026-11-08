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
    const orbits = [...layer.querySelectorAll(".portfolioOrbit")];
    const positions = orbits.map(() => [0, 0]);
    let directionX = 0, directionY = 0, strength = 0;
    let heldSince = 0, anchorStrength = 0, anchorX = 0, anchorY = 0;
    let lastDraw = null;
    let paths = [];

    function aim(dx, dy) {
      const { width, height } = layer.getBoundingClientRect();
      paths = orbits.map((orbit, index) => {
        const inset = 22 + index * 4;
        const edgeX = dx > 0 ? width - orbit.offsetLeft - orbit.offsetWidth - inset : orbit.offsetLeft - inset;
        const edgeY = dy > 0 ? height - orbit.offsetTop - orbit.offsetHeight - inset : orbit.offsetTop - inset;
        const distance = Math.max(0, Math.min(
          Math.abs(dx) > .01 ? edgeX / Math.abs(dx) : Infinity,
          Math.abs(dy) > .01 ? edgeY / Math.abs(dy) : Infinity
        ));
        return [dx * distance, dy * distance];
      });
    }

    function reset() {
      origin = undefined;
      cancelAnimationFrame(frame);
      frame = 0;
      directionX = directionY = strength = anchorStrength = anchorX = anchorY = heldSince = 0;
      lastDraw = null;
      paths = [];
      orbits.forEach((orbit, i) => {
        positions[i] = [0, 0];
        orbit.style.removeProperty("transform");
      });
    }

    function draw(now) {
      const blend = 1 - Math.exp(-Math.min(50, now - (lastDraw ?? now - 16)) / 420);
      lastDraw = now;
      const canFlow = strength >= .18 && Math.abs(strength - anchorStrength) < .12;
      const hold = canFlow ? Math.min(1, Math.max(0, now - heldSince - 900) / 5200) : 0;
      const nudge = strength * .08;
      const drift = hold * hold * (3 - 2 * hold);
      const travel = nudge + (1 - nudge) * drift;
      let moving = false;
      orbits.forEach((orbit, i) => {
        const [dx, dy] = paths[i] ?? [0, 0];
        const targetX = dx * travel, targetY = dy * travel;
        const position = positions[i];
        const unsettled = Math.abs(targetX - position[0]) + Math.abs(targetY - position[1]) > .15;
        position[0] = unsettled ? position[0] + (targetX - position[0]) * blend : targetX;
        position[1] = unsettled ? position[1] + (targetY - position[1]) * blend : targetY;
        orbit.style.transform = `translate3d(${position[0].toFixed(2)}px,${position[1].toFixed(2)}px,0)`;
        moving ||= unsettled;
      });
      frame = moving || (canFlow && hold < 1) ? requestAnimationFrame(draw) : 0;
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
      const tiltX = roll * Math.cos(angle) + pitch * Math.sin(angle);
      const tiltY = pitch * Math.cos(angle) - roll * Math.sin(angle);
      const magnitude = Math.hypot(tiltX, tiltY);
      strength = Math.min(1, Math.max(0, (magnitude - 2) / 18));
      directionX = strength ? tiltX / magnitude : 0;
      directionY = strength ? tiltY / magnitude : 0;
      if (!strength || Math.abs(strength - anchorStrength) >= .12 || directionX * anchorX + directionY * anchorY < .9) {
        heldSince = performance.now();
        anchorStrength = strength;
        anchorX = directionX;
        anchorY = directionY;
      }
      if (strength) aim(directionX, directionY);
      if (!frame) frame = requestAnimationFrame(draw);
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
