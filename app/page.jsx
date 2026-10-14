"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, Sun, Moon, Code2, Terminal, Shapes,
  Lightbulb, BookOpen
} from "lucide-react";

const projects = [
  { number: "01", title: "Go-Reloaded", type: "GO · TEXT PROCESSING", description: "A Go project focused on transforming and processing text through a set of defined rules.", icon: Terminal, href: "https://github.com/vickiller-droid/go-reloaded" },
  { number: "02", title: "Ascii-Art", type: "GO · ASCII ART", description: "A command-line project for generating stylised ASCII art from text input.", icon: Shapes, href: "https://github.com/vickiller-droid" },
  { number: "03", title: "VicFungo", type: "PERSONAL PROJECT · IN PROGRESS", description: "An evolving habit-tracking concept built around making consistency simpler and reducing friction.", icon: Lightbulb, href: "https://github.com/vickiller-droid" },
];

export default function HomePage() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("victor-portfolio-theme");
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch {}
    const targets = document.querySelectorAll(".revealOnScroll");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((el) => el.classList.add("isVisible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("isVisible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function chooseTheme(next) {
    setTheme(next);
    document.body.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("victor-portfolio-theme", next); } catch {}
  }

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <main className="site">
      <header className="header">
        <a className="wordmark" href="#top" aria-label="Victor, home">victor<span>.</span></a>
        <nav className="nav" aria-label="Main navigation">
          <a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a>
        </nav>
        <div className="themeToggle" role="group" aria-label="Color theme">
          <button type="button" onClick={() => chooseTheme("light")} aria-pressed={theme === "light"} aria-label="Use light mode"><Sun size={16}/><span>Light</span></button>
          <button type="button" onClick={() => chooseTheme("dark")} aria-pressed={theme === "dark"} aria-label="Use dark mode"><Moon size={16}/><span>Dark</span></button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="heroCopy revealOnScroll">
          <p className="eyebrow"><span className="statusDot"/> SOFTWARE DEVELOPER · LEARNING BY BUILDING</p>
          <h1>Thoughtful software.<br/><em>Practical solutions.</em></h1>
          <p className="intro">I build useful digital products through code, experimentation, and problem-solving.</p>
          <p className="heroNote">Curious by nature. Practical by design.</p>
        </div>
        <aside className="heroAside revealOnScroll" aria-label="Portrait and introduction">
          <div className="portraitFrame">
            <img className="portrait" src="/portrait.jpg" alt="Portrait of Victor Alabi Daniel" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.classList.add("portraitMissing"); }}/>
            <span className="portraitFallback" aria-hidden="true">VAD<span>.</span></span>
          </div>
          <div className="portraitCaption"><span>VICTOR ALABI DANIEL</span><span>SOFTWARE DEVELOPER · LEARNING BY BUILDING</span></div>
          <div className="asideRule"/>
          <p className="asideLabel">CURRENT FOCUS</p>
          <p className="asideTitle">Learning by building.</p>
          <p className="asideText">Small steps, real problems, and software that earns its place.</p>
          <a href="#about" className="scrollLink">A little about me <ArrowDownRight size={17}/></a>
        </aside>
      </section>

      <section className="work" id="work">
        <div className="sectionHeading revealOnScroll">
          <div><p className="eyebrow">SELECTED WORK <span className="headingIndex">/ 01—03</span></p><h2>Things I’m building.</h2></div>
          <p className="sectionAside">Experiments, learning projects, and ideas in progress.</p>
        </div>
        <div className="projectList">{projects.map((project) => {
          const Icon = project.icon;
          return <article className="project" key={project.number}>
            <div className="projectNumber">{project.number}</div><div className="projectIcon"><Icon size={23} strokeWidth={1.6}/></div>
            <div className="projectInfo"><p className="projectType">{project.type}</p><h3>{project.title}</h3><p className="projectDescription">{project.description}</p></div>
            <a className="projectLink" href={project.href} target="_blank" rel="noreferrer" aria-label={`View ${project.title} on GitHub`}><ArrowUpRight size={21}/></a>
          </article>;
        })}</div>
      </section>

      <section className="about" id="about">
        <div className="aboutLead revealOnScroll"><p className="eyebrow">A LITTLE ABOUT ME <span className="headingIndex">/ 02</span></p><h2>Turning curiosity<br/>into <em>useful work.</em></h2></div>
        <div className="aboutBody">
          <p>I’m a developer in the making who enjoys breaking problems down, learning how things work, and turning ideas into practical software.</p>
          <p>I care about writing clear code, staying curious, and building things that solve actual problems—not just things that look impressive in a screenshot.</p>
          <a className="textLink" href="https://github.com/vickiller-droid" target="_blank" rel="noreferrer">Follow the work on GitHub <ArrowUpRight size={16}/></a>
        </div>
        <div className="values">
          <div><Code2 size={20}/><div><h3>Clear code</h3><p>Readable, considered, and built to be understood.</p></div></div>
          <div><Lightbulb size={20}/><div><h3>Practical thinking</h3><p>Start with the problem. Keep the solution useful.</p></div></div>
          <div><BookOpen size={20}/><div><h3>Always learning</h3><p>Build, test, reflect, and improve the next version.</p></div></div>
        </div>
      </section>

      <footer className="footer" id="contact">
        <div className="revealOnScroll"><p className="eyebrow">HAVE SOMETHING IN MIND? <span className="headingIndex">/ 03</span></p><h2>Let’s make it useful.</h2><p className="footerSub">For projects, collaboration, or a good technical conversation.</p></div>
        <a className="primaryButton" href="mailto:alabivictordaniel@gmail.com">Email me <ArrowUpRight size={17}/></a>
        <div className="footerBottom"><a className="wordmark" href="#top">victor<span>.</span></a><p>Made with intention. © {new Date().getFullYear()}</p><a href="#top" className="backTop">Back to top ↑</a></div>
      </footer>
    </main>
  );
}
