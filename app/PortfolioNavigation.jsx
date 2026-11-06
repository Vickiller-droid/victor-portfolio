"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Menu, X, ArrowUpRight } from "lucide-react";

export default function PortfolioNavigation({ theme, chooseTheme }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!wrapper.current?.contains(event.target)) setOpen(false); };
    const escape = event => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    const leave = event => { if (!wrapper.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    document.addEventListener("focusin", leave);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("focusin", leave);
    };
  }, [open]);
  return <div className="portfolioNavControls" ref={wrapper}>
    <button className="portfolioIconButton" type="button" onClick={() => chooseTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      {theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}
    </button>
    <button ref={trigger} className="portfolioIconButton portfolioMenuTrigger" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="portfolio-navigation" onClick={() => setOpen(value => !value)}>
      {open ? <X size={21}/> : <Menu size={21}/>}
    </button>
    <nav className="portfolioDropdown" id="portfolio-navigation" aria-label="Main navigation" hidden={!open}>
      {[['Work', 'work'], ['Toolkit', 'toolkit'], ['About', 'about'], ['Contact', 'contact']].map(([label, target], i) => <a key={target} href={`#${target}`} onClick={() => setOpen(false)}><span className="portfolioNavIndex">0{i + 1}</span><span>{label}</span><ArrowUpRight size={17} aria-hidden="true"/></a>)}
    </nav>
  </div>;
}
