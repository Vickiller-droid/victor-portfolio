import Link from "next/link";
import { ArrowUpRight, Github, Mail } from "lucide-react";
import { ThemeToggle, CopyEmail } from "./SiteControls";
import { contactEmail, githubUrl } from "./projects";

export function Header({ home = false }) {
  const prefix = home ? "" : "/";
  return <header className="header"><Link className="wordmark" href="/" aria-label="Victor Alabi Daniel, home">victor<span>.</span></Link><nav className="nav" aria-label="Main navigation"><a href={`${prefix}#work`}>Work</a><a href={`${prefix}#toolkit`}>Skills</a><a href={`${prefix}#about`}>About</a><a href={`${prefix}#contact`}>Contact</a></nav><ThemeToggle/></header>;
}

export function Footer() {
  return <footer className="footer" id="contact"><div className="contactIntro"><p className="eyebrow">LET’S TALK</p><h2>Have something<br/><em>useful in mind?</em></h2><p>For a project, an opportunity, or a technical conversation.</p></div><div className="contactDetails"><a className="emailAddress" href={`mailto:${contactEmail}`}>{contactEmail}</a><div className="contactActions"><a className="primaryButton" href={`mailto:${contactEmail}`}><Mail size={16}/>Email Victor<ArrowUpRight size={16}/></a><a className="secondaryButton" href={githubUrl} target="_blank" rel="noreferrer"><Github size={16}/>GitHub<ArrowUpRight size={16}/></a></div><CopyEmail email={contactEmail}/></div><div className="footerBottom"><Link className="wordmark" href="/">victor<span>.</span></Link><p>Victor Alabi Daniel · Abuja, Nigeria</p><a href="#main-content">Back to top ↑</a></div></footer>;
}
