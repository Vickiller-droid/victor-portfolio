"use client";

import { useEffect, useState } from "react";
import styles from "./not-found.module.css";

export default function NotFound() {
  const [theme, setTheme] = useState();
  useEffect(() => {
    try {
      const saved = localStorage.getItem("victor-portfolio-theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);

  return (
    <main className={styles.page} data-theme={theme}>
      <header className={styles.header}><a href="/">victoralabi<span>.</span></a></header>
      <div className={styles.content}>
        <div className={styles.digits} aria-hidden="true">
          <span>4</span><span className={styles.zero}>0<i className={styles.dot}/></span><span>4</span>
        </div>
        <p className={styles.label}>404 / Page not found</p>
        <h1>Well, this is embarrassing.</h1>
        <p className={styles.description}>We could’ve sworn this page was here five minutes ago. Clearly, it had other plans.</p>
        <nav className={styles.actions} aria-label="Find your way back">
          <a className={styles.home} href="/">Back home <span aria-hidden="true">↗</span></a>
          <a href="/#work">View my work</a>
        </nav>
      </div>
    </main>
  );
}
