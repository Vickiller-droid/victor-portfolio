"use client";

import { useState } from "react";

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

export function FlowingLines() {
  return <div className="portfolioTrails" aria-hidden="true">
    <span/><span/><span/>
  </div>;
}
