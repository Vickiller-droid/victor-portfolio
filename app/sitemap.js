import { projects, portfolioUrl } from "./projects";
export default function sitemap() { return [{url:portfolioUrl},...projects.map(p=>({url:`${portfolioUrl}/projects/${p.slug}`}))]; }
