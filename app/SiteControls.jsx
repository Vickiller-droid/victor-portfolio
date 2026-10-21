"use client";
import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Copy, Check } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState(null);
  useEffect(() => { setTheme(document.documentElement.dataset.theme || "light"); }, []);
  function choose(next) {
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem("victor-portfolio-theme", next); } catch {}
  }
  return <div className="themeToggle" role="group" aria-label="Color theme"><button type="button" onClick={() => choose("light")} aria-pressed={theme === "light"} aria-label="Use light mode"><Sun size={16}/><span>Light</span></button><button type="button" onClick={() => choose("dark")} aria-pressed={theme === "dark"} aria-label="Use dark mode"><Moon size={16}/><span>Dark</span></button></div>;
}

export function CopyEmail({ email }) {
  const [status, setStatus] = useState("");
  const timeout = useRef(null);
  useEffect(() => () => clearTimeout(timeout.current), []);
  async function copy() {
    clearTimeout(timeout.current);
    try { await navigator.clipboard.writeText(email); setStatus("Email copied"); }
    catch { setStatus("Select the email address above to copy it."); }
    timeout.current = setTimeout(() => setStatus(""), 3500);
  }
  return <div className="copyEmail"><button type="button" className="quietButton" onClick={copy}>{status === "Email copied" ? <Check size={15}/> : <Copy size={15}/>}Copy email</button><span className="copyStatus" role="status">{status}</span></div>;
}

export function Portrait() {
  const [failed, setFailed] = useState(false);
  return <div className="portraitFrame">{failed ? <div className="portraitPlaceholder" role="img" aria-label="Victor Alabi Daniel">VAD.</div> : <img className="portrait" src="/portrait.webp" width="567" height="850" alt="Victor Alabi Daniel, software developer" loading="eager" fetchPriority="high" onError={() => setFailed(true)}/>}</div>;
}
