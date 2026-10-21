"use client";



import { useEffect, useState } from "react";

import {

  ArrowDownRight, ArrowUpRight, Sun, Moon, Code2, Terminal, Shapes,

  Lightbulb, BookOpen, Github, Mail, ArrowRight, CheckCircle2

} from "lucide-react";



const projects = [

  { number: "01", title: "Go-Reloaded", type: "GO · TEXT PROCESSING", description: "A Go project focused on transforming and processing text through a set of defined rules.", icon: Terminal, href: "https://github.com/vickiller-droid/go-reloaded", stack: ["Go", "Text processing", "CLI"], challenge: "Apply a defined sequence of transformations to text while keeping the output predictable.", approach: "Build small, testable processing steps and consider how ordering changes the result.", learning: "Parsing, string manipulation, and reasoning about edge cases." },

  { number: "02", title: "Ascii-Art", type: "GO · ASCII ART", description: "A command-line project for generating stylised ASCII art from text input.", icon: Shapes, href: "https://github.com/vickiller-droid/ascii-art", stack: ["Go", "CLI", "Text rendering"], challenge: "Translate text into readable character-based artwork.", approach: "Explore how character patterns and input handling shape a command-line output.", learning: "Input validation, formatting, and output consistency." },

  { number: "03", title: "Boothy", type: "PROTOTYPE · IN DEVELOPMENT", description: "A travel-reminder prototype exploring a simple promise: remember your belongings when the journey ends.", icon: Lightbulb, href: "https://github.com/Vickiller-droid/boothy", stack: ["Travel reminders", "Prototype", "In development"], challenge: "Belongings are easy to forget when stepping out of a vehicle. Boothy began with that real frustration.", approach: "Prototype a journey and belongings-reminder workflow, then test reminder timing on real trips before expanding the feature set.", learning: "Reliable arrival detection and background notifications need real-device testing. Automatic travel detection, account sync, and route history are not claimed as completed features." },

  { number: "04", title: "VicFungo", type: "PERSONAL PROJECT · IN PROGRESS", description: "An evolving habit-tracking concept built around making consistency simpler and reducing friction.", icon: Lightbulb, href: "https://github.com/vickiller-droid", stack: ["Product concept", "Habit design", "In progress"], challenge: "Make it easier to maintain a useful routine without adding unnecessary friction.", approach: "Explore a simple habit-tracking experience, starting with the smallest useful workflow.", learning: "Product scoping and iteration; this is an evolving concept, not a finished release." },

];



const portraitSources = ["/portrait.jpg", "/portrait.png", "/portrait.jpeg", "/Portrait.jpg", "/Portrait.png"];

export default function HomePage() {

  const [portraitIndex, setPortraitIndex] = useState(0);
  const [phonePaused, setPhonePaused] = useState(false);

  const [theme, setTheme] = useState("light");

  const [expandedProject, setExpandedProject] = useState(null);



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

          <a href="#work">Work</a><a href="#toolkit">Toolkit</a><a href="#about">About</a><a href="#contact">Contact</a>

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

          <div className="heroActions"><a className="heroActionPrimary" href="#work">Explore selected work <ArrowDownRight size={16}/></a><a className="heroActionSecondary" href="https://github.com/vickiller-droid" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={15}/></a></div><p className="heroNote">Curious by nature. Practical by design.</p>

        </div>

        <aside className="heroAside revealOnScroll" aria-label="Portrait and introduction">

          <div className="portraitFrame">

            {portraitIndex < portraitSources.length ? <img key={portraitIndex} className="portrait" src={portraitSources[portraitIndex]} alt="Portrait of Victor Alabi Daniel" onError={() => setPortraitIndex((index) => index + 1)}/> : <div className="portraitPlaceholder" role="img" aria-label="Victor Alabi Daniel"><span>VAD<span>.</span></span><small>VICTOR ALABI DANIEL</small></div>}


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

          <div><p className="eyebrow">SELECTED WORK <span className="headingIndex">/ 01—04</span></p><h2>Things I’m building.</h2></div>

          <p className="sectionAside">A closer look at the problems, decisions, and lessons behind the work.</p>

        </div>

        <article className="boothyFeature" aria-labelledby="boothy-title">
          <div className="boothyCopy">
            <p className="eyebrow">FEATURED EXPLORATION / BOOTHY</p>
            <span className="boothyStatus">Prototype · In development</span>
            <h3 id="boothy-title">Leave the ride.<br/><em>Keep your belongings.</em></h3>
            <p>A reminder with a reason. Boothy explores how a timely prompt can help you remember what you brought along.</p>
            <p className="boothyHonesty">Currently prototyping and testing the core journey-reminder experience.</p>
            <a className="heroActionSecondary" href="https://github.com/Vickiller-droid/boothy" target="_blank" rel="noreferrer">Explore on GitHub <ArrowUpRight size={16}/></a>
          </div>
          <figure className={`boothyStage${phonePaused ? " isPaused" : ""}`}>
            <div className="boothyPhone" role="img" aria-label="Illustrative Boothy reminder screen, not a screenshot of the current application">
              <div className="phoneBack" aria-hidden="true"><div className="phoneCameras"><i/><i/><i/></div><span>boothy<span>.</span></span><small>Bring it all with you.</small></div>
              {Array.from({length: 10}, (_, index) => <div key={index} className="phoneEdge" style={{transform: `translateZ(${index - 5}px)`}} aria-hidden="true"/>)}
              <div className="boothyScreen">
                <div className="phoneStatus" aria-hidden="true"><span>9:41</span><span>● ▰</span></div>
                <div className="phoneIsland" aria-hidden="true"/>
                <div className="phoneBrand">boothy<span>.</span></div>
                <p className="phoneKicker">A LITTLE NUDGE</p>
                <h4>Before you<br/>step out.</h4>
                <p className="phoneMessage">Take a moment to check what you brought along.</p>
                <div className="phoneReminder"><Lightbulb size={22}/><div><strong>Your belongings</strong><span>Power bank · Earbuds · Bag</span></div></div>
                <div className="phonePrompt">A quick check.<br/>One less thing left behind.</div>
                <div className="phoneHome" aria-hidden="true"/>
              </div>
            </div>
            <button className="phoneMotionToggle" type="button" aria-pressed={phonePaused} onClick={() => setPhonePaused((paused) => !paused)}>{phonePaused ? "Resume rotation" : "Pause to read"}</button>
            <figcaption>Illustrative interface · Actual app screen to follow</figcaption>
          </figure>
        </article>

        <div className="projectList">{projects.map((project) => {

          const Icon = project.icon;

          return <article className="project" key={project.number}>

            <div className="projectNumber">{project.number}</div><div className="projectIcon"><Icon size={23} strokeWidth={1.6}/></div>

            <div className="projectInfo"><p className="projectType">{project.type}</p><h3>{project.title}</h3><p className="projectDescription">{project.description}</p><div className="stackTags">{project.stack.map((item) => <span key={item}>{item}</span>)}</div><button className="caseToggle" type="button" aria-expanded={expandedProject === project.number} aria-controls={`case-${project.number}`} onClick={() => setExpandedProject(expandedProject === project.number ? null : project.number)}>{expandedProject === project.number ? "Close project notes" : "Read project notes"} <ArrowRight size={15}/></button></div>

            {project.href ? <a className="projectLink" href={project.href} target="_blank" rel="noreferrer" aria-label={`View ${project.title} on GitHub`}><ArrowUpRight size={21}/></a> : <span className="projectLink projectLinkInactive" aria-label="Boothy has no public repository yet"><Lightbulb size={19}/></span>}

            {expandedProject === project.number && <div className="caseNotes" id={`case-${project.number}`}><div><span>01 / THE PROBLEM</span><p>{project.challenge}</p></div><div><span>02 / THE APPROACH</span><p>{project.approach}</p></div><div><span>03 / THE LEARNING</span><p>{project.learning}</p></div></div>}

          </article>;

        })}</div>

      </section>



      <section className="toolkit" id="toolkit" aria-labelledby="toolkit-heading">

        <div className="toolkitIntro"><p className="eyebrow">THE TOOLKIT <span className="headingIndex">/ 02</span></p><h2 id="toolkit-heading">Skills in motion.</h2><p>Tools and concepts I am actively learning and using. No inflated proficiency scores—just an honest picture of the journey.</p></div>

        <div className="toolkitGrid"><div><Terminal size={22}/><h3>Programming</h3><p>Go · Python fundamentals</p><span>Building fluency through exercises and projects</span></div><div><Code2 size={22}/><h3>Web development</h3><p>HTML · CSS · JavaScript · Next.js</p><span>Exploring responsive interfaces and practical web products</span></div><div><CheckCircle2 size={22}/><h3>Workflow</h3><p>Git · GitHub · VS Code · Vercel</p><span>Version control, iteration, and shipping to the web</span></div></div>

      </section>



      <section className="about" id="about">

        <div className="aboutLead revealOnScroll"><p className="eyebrow">A LITTLE ABOUT ME <span className="headingIndex">/ 03</span></p><h2>Turning curiosity<br/>into <em>useful work.</em></h2></div>

        <div className="aboutBody">

          <p>I’m a software developer focused on understanding problems, building practical solutions, and continuously improving my craft.</p>

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

        <div className="revealOnScroll"><p className="eyebrow">HAVE SOMETHING IN MIND? <span className="headingIndex">/ 04</span></p><h2>Let’s make it useful.</h2><p className="footerSub">For projects, collaboration, or a good technical conversation.</p></div>

        <div className="contactActions"><a className="primaryButton" href="mailto:alabivictordaniel@gmail.com"><Mail size={17}/> Email me <ArrowUpRight size={17}/></a><a className="contactGithub" href="https://github.com/vickiller-droid" target="_blank" rel="noreferrer"><Github size={17}/> GitHub <ArrowUpRight size={16}/></a></div>

        <div className="footerBottom"><a className="wordmark" href="#top">victor<span>.</span></a><p>Made with intention. © {new Date().getFullYear()}</p><a href="#top" className="backTop">Back to top ↑</a></div>

      </footer>

    </main>

  );

}
