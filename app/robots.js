import { portfolioUrl } from "./projects";
export default function robots() { return {rules:{userAgent:"*",allow:"/"},sitemap:`${portfolioUrl}/sitemap.xml`}; }
