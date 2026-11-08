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
    let peakTilt = 0, tiltRatio = 0, retreatAt = null;
    let flow = 0;
    let paths = [];
    const orbits = [...layer.querySelectorAll(".portfolioOrbit")];

    function aim(dx, dy) {
      const { width, height } = layer.getBoundingClientRect();
      paths = orbits.map((orbit, index) => {
        const left = orbit.offsetLeft, top = orbit.offsetTop;
        const inset = 22 + index * 4;
        const edgeX = dx > 0 ? width - left - orbit.offsetWidth - inset : left - inset;
        const edgeY = dy > 0 ? height - top - orbit.offsetHeight - inset : top - inset;
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
      x = y = targetX = targetY = heldX = heldY = 0;
      heldSince = null;
      flow = peakTilt = tiltRatio = 0;
      retreatAt = null;
      paths = [];
      orbits.forEach(orbit => orbit.style.removeProperty("transform"));
      layer.style.removeProperty("transform");
    }

    function draw(now) {
      const progress = heldSince === null ? 0 : Math.min(1, Math.max(0, (retreatAt ?? now) - heldSince - 600) / 3800);
      const targetFlow = progress * progress * (3 - 2 * progress) * tiltRatio;
      flow += (targetFlow - flow) * .12;
      x += (targetX - x) * .12;
      y += (targetY - y) * .12;
      const moving = Math.abs(targetX - x) + Math.abs(targetY - y) > .06 || Math.abs(targetFlow - flow) > .0002;
      if (!moving) { x = targetX; y = targetY; flow = targetFlow; }
      layer.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      paths.forEach(([dx, dy], index) => {
        orbits[index].style.transform = `translate3d(${(dx * flow).toFixed(2)}px,${(dy * flow).toFixed(2)}px,0)`;
      });
      frame = moving || (heldSince !== null && retreatAt === null && progress < 1) ? requestAnimationFrame(draw) : 0;
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
      const tiltX = roll * Math.cos(angle) + pitch * Math.sin(angle);
      const tiltY = pitch * Math.cos(angle) - roll * Math.sin(angle);
      targetX = shift(tiltX);
      targetY = shift(tiltY);
      const magnitude = Math.hypot(tiltX, tiltY);
      const now = performance.now();
      const projection = tiltX * heldX + tiltY * heldY;

      if (magnitude >= 7 && (heldSince === null || projection < magnitude * .6)) {
        heldSince = now;
        retreatAt = null;
        heldX = tiltX / magnitude;
        heldY = tiltY / magnitude;
        peakTilt = magnitude;
        aim(heldX, heldY);
      }

      if (heldSince !== null) {
        const alongPath = Math.max(0, tiltX * heldX + tiltY * heldY);
        peakTilt = Math.max(peakTilt, alongPath);
        tiltRatio = Math.max(0, (alongPath - 1.5) / (peakTilt - 1.5));
        if (peakTilt - alongPath > 1) {
          retreatAt ??= now;
        } else if (retreatAt !== null) {
          heldSince += now - retreatAt;
          retreatAt = null;
        }
        if (tiltRatio === 0) {
          heldSince = retreatAt = null;
          heldX = heldY = peakTilt = 0;
        }
      }
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
