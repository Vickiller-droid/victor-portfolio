import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { projects } from "../../projects";
import { Header, Footer } from "../../SiteChrome";
import ProjectPreview from "../../ProjectPreview";

export const dynamicParams = false;
export function generateStaticParams() { return projects.map(({slug}) => ({slug})); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = projects.find(p=>p.slug===slug);
  if (!project) return {};
  return { title: `${project.title} — Case study`, description: project.summary, alternates: { canonical: `/projects/${slug}` }, openGraph: {title: `${project.title} — Victor Alabi Daniel`,description:project.summary,url:`/projects/${slug}`}};
}
export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const project = projects.find(p=>p.slug===slug);
  if (!project) notFound();
  const next = projects[(projects.indexOf(project)+1)%projects.length];
  return <div className="site"><Header/><main id="main-content" tabIndex={-1} className="casePage"><Link className="backLink" href={`/#${slug}`}><ArrowLeft size={16}/>Back to selected work</Link><header className="caseHero"><p className="eyebrow">{project.category} / {project.status}</p><h1>{project.title}<span>.</span></h1><p className="caseLead">{project.summary}</p><ul className="stackTags" aria-label="Technologies">{project.stack.map(s=><li key={s}>{s}</li>)}</ul><a className="secondaryButton" href={project.repository} target="_blank" rel="noreferrer">Explore source code<ArrowUpRight size={16}/></a></header><div className={`casePreview ${slug === "boothy" ? "casePhone" : ""}`}><ProjectPreview variant={project.preview}/></div><div className="caseNarrative"><section><p className="eyebrow">01 / THE PROBLEM</p><h2>Why this exists.</h2><p>{project.context}</p></section><section><p className="eyebrow">02 / CURRENT BEHAVIOR</p><h2>What you can inspect.</h2><ul>{project.working.map(t=><li key={t}>{t}</li>)}</ul></section><section><p className="eyebrow">03 / ENGINEERING DECISIONS</p><h2>The choices behind it.</h2><div className="decisionList">{project.decisions.map(d=><div key={d.title}><h3>{d.title}</h3><p>{d.text}</p></div>)}</div></section><section><p className="eyebrow">04 / EVIDENCE</p><h2>What supports the claims.</h2><ul>{project.evidence.map(t=><li key={t}>{t}</li>)}</ul><details className="sourceDetails"><summary>Source files behind these notes</summary><ul>{project.sourcePaths.map(path=><li key={path}><code>{path}</code></li>)}</ul></details></section><section><p className="eyebrow">05 / LIMITS & NEXT STEP</p><h2>Where the work goes next.</h2><p>{project.limits}</p><div className="nextStep"><span>NEXT ITERATION</span><p>{project.next}</p></div></section></div><Link className="nextProject" href={`/projects/${next.slug}`}><span>Explore another project<strong>{next.title}</strong></span><ArrowRight size={25}/></Link></main><Footer/></div>;
}
