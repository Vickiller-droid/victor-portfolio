"use client";



import { useEffect, useState, useRef } from "react";

import {

  ArrowDownRight, ArrowUpRight, Sun, Moon, Code2, Terminal, Shapes,

  Lightbulb, BookOpen, Github, Mail, ArrowRight, CheckCircle2

} from "lucide-react";



const boothyWaitlistHref = "mailto:alabivictordaniel@gmail.com?subject=Boothy%20waitlist&body=Hi%20Victor%2C%0A%0APlease%20add%20me%20to%20the%20Boothy%20waitlist%20and%20email%20me%20when%20it%20launches.%0A%0AMy%20name%3A%20";

const projects = [

  { number: "01", title: "Go-Reloaded", type: "GO · TEXT PROCESSING", description: "A Go project focused on transforming and processing text through a set of defined rules.", icon: Terminal, href: "https://github.com/vickiller-droid/go-reloaded", stack: ["Go", "Text processing", "CLI"], challenge: "Apply a defined sequence of transformations to text while keeping the output predictable.", approach: "Build small, testable processing steps and consider how ordering changes the result.", learning: "Parsing, string manipulation, and reasoning about edge cases." },

  { number: "02", title: "Ascii-Art", type: "GO · ASCII ART", description: "A command-line project for generating stylised ASCII art from text input.", icon: Shapes, href: "https://github.com/vickiller-droid/ascii-art", stack: ["Go", "CLI", "Text rendering"], challenge: "Translate text into readable character-based artwork.", approach: "Explore how character patterns and input handling shape a command-line output.", learning: "Input validation, formatting, and output consistency." },

  { number: "03", title: "Boothy", type: "PROTOTYPE · IN DEVELOPMENT", description: "Before you get out of a bus, taxi or keke, Boothy reminds you to take your things.", icon: Lightbulb, href: "https://github.com/Vickiller-droid/boothy", stack: ["Travel reminders", "Prototype", "In development"], challenge: "Belongings are easy to forget when stepping out of a vehicle. Boothy began with that real frustration.", approach: "Prototype a journey and belongings-reminder workflow, then test reminder timing on real trips before expanding the feature set.", learning: "Reliable arrival detection and background notifications need real-device testing. Automatic travel detection, account sync, and route history are not claimed as completed features." },

  { number: "04", title: "VicFungo", type: "PERSONAL PROJECT · IN PROGRESS", description: "An evolving habit-tracking concept built around making consistency simpler and reducing friction.", icon: Lightbulb, href: "https://github.com/vickiller-droid", stack: ["Product concept", "Habit design", "In progress"], challenge: "Make it easier to maintain a useful routine without adding unnecessary friction.", approach: "Explore a simple habit-tracking experience, starting with the smallest useful workflow.", learning: "Product scoping and iteration; this is an evolving concept, not a finished release." },

];



export default function HomePage() {

  const cursorRef = useRef(null);
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



  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const cursor = cursorRef.current;
    let frame = 0;
    const move = (event) => {
      if (!media.matches || event.pointerType === 'touch') return;
      cancelAnimationFrame(frame);
      const {clientX, clientY, target} = event;
      frame = requestAnimationFrame(() => {
        cursor.style.transform = `translate3d(${clientX}px,${clientY}px,0)`;
        cursor.classList.add('isVisible');
        cursor.classList.toggle('isInteractive', Boolean(target.closest('a,button,summary')));
      });
    };
    const hide = () => cursor.classList.remove('isVisible');
    window.addEventListener('pointermove', move, {passive:true});
    document.documentElement.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    media.addEventListener('change', hide);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
      media.removeEventListener('change', hide);
    };
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
      <div ref={cursorRef} className="cursorHalo" aria-hidden="true"><span/></div>

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

            <img className="portrait" src="/portrait.webp" width="680" height="850" loading="eager" fetchPriority="high" alt="Portrait of Victor Alabi Daniel" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.classList.add("portraitMissing"); }}/>

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

          <div><p className="eyebrow">SELECTED WORK <span className="headingIndex">/ 01—04</span></p><h2>Things I’m building.</h2></div>

          <p className="sectionAside">A closer look at the problems, decisions, and lessons behind the work.</p>

        </div>

        <article className="boothyFeature" aria-labelledby="boothy-title">
          <div className="boothyCopy">
            <p className="eyebrow">FEATURED EXPLORATION / BOOTHY</p>
            <span className="boothyStatus">Prototype · In development</span>
            <h3 id="boothy-title">Leave the ride.<br/><em>Keep your belongings.</em></h3>
            <p>Before you get out of a bus, taxi or keke, Boothy reminds you to take your things.</p>
            <p className="boothyHonesty">Not ready yet. Join the waitlist to hear when it launches.</p>
            <div className="boothyActions"><a className="heroActionPrimary" href={boothyWaitlistHref} aria-label="Join the Boothy waitlist by email">Join the waitlist <Mail size={16}/></a><a className="heroActionSecondary" href="/boothy/index.html" target="_blank" rel="noreferrer">Try the prototype <ArrowUpRight size={16}/></a></div>
            <p className="boothyWaitlistNote">Join by email · <a href="https://github.com/Vickiller-droid/boothy" target="_blank" rel="noreferrer">View source <ArrowUpRight size={12}/></a></p>
          </div>
          <figure className="boothyStage">
            <div className="boothyPhone" role="img" aria-label="Boothy arrival reminder preview on a rotating iPhone mockup">
              <div className="phoneBack" aria-hidden="true"><div className="phoneCameras"><i/><i/><i/><b/></div><img className="phoneAppleMark" src="/previews/apple-mark.svg" width="38" height="46" alt=""/></div>
              {Array.from({length:16}, (_,i)=><div key={i} className="phoneEdge" style={{transform:`translateZ(${i-7.5}px)`}} aria-hidden="true"/>)}
              <div className="phoneSideButton" aria-hidden="true"/>
              <div className="boothyScreen">
                <div className="boothyDemoScreen" aria-hidden="true">
                  <div className="demoBrand"><span className="demoBrandIcon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>boothy<span className="demoBrandDot">.</span></div>
                  <div className="demoArrival"><span className="demoLiveDot"/> ARRIVING SOON</div>
                  <div className="demoCountdown">2<span>min</span></div>
                  <h4>Check your<br/>belongings.</h4>
                  <div className="demoReason"><span>YOUR REASON</span><p>Don’t leave your power bank on the seat.</p></div>
                  <div className="demoItems"><span>✓ Phone</span><span>○ Power bank</span><span>○ Earbuds</span></div>
                  <div className="demoReady">I’m getting ready <span>→</span></div>
                  <div className="demoBottom"><span>Ride</span><span>Reminders</span><span>Parking</span></div>
                </div>
                <div className="phoneHardwareStatus" aria-hidden="true"><span>9:41</span><span>▮▮▮ ▰</span></div>
                <div className="phoneIsland" aria-hidden="true"/>
                <div className="phoneHome" aria-hidden="true"/>
              </div>
            </div>
            <figcaption>Boothy · Arrival reminder preview</figcaption>
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
