export const portfolioUrl = "https://victor-portfolio-olive.vercel.app";
export const contactEmail = "alabivictordaniel@gmail.com";
export const githubUrl = "https://github.com/Vickiller-droid";

export const projects = [
  {
    slug: "boothy", number: "01", title: "Boothy", category: "Personal product", status: "Working prototype",
    headline: "Leave the ride. Keep your belongings.",
    summary: "A travel-reminder prototype that keeps the original reason beside each alert, then helps you check your belongings at arrival.",
    stack: ["JavaScript", "Browser APIs", "Local storage"], preview: "boothy",
    repository: `${githubUrl}/boothy`,
    focus: "Trip state, reminder timing, and a clear belongings check.",
    context: "Boothy grew out of forgetting belongings in transit. The problem is the moment of transition: an alarm alone may ring without reminding you why you set it.",
    working: ["Run a simulated trip or start a real countdown from a manual arrival estimate.", "See a belongings warning two minutes before the estimate and confirm arrival before completing a real ride.", "Keep the reminder message, its original reason, item checklist, and saved parking note together."],
    decisions: [
      {title:"A manual estimate before live route detection", text:"The timer and simulation make the reminder workflow testable without pretending the app has reliable background travel detection or routing ETA."},
      {title:"The reason travels with the reminder", text:"An alert carries its message, reason, and belongings instead of becoming a generic alarm. Current-ride data is kept separate from edits for the next ride."},
      {title:"Device-local state", text:"Browser storage preserves ride state and parking notes. Notifications and GPS are requested through explicit user actions; no account or route-history backend is assumed."}
    ],
    evidence: ["28 automated checks passed locally on 21 October 2026 using node --test tests/*.cjs.", "Checks cover timing boundaries, snooze behavior, stored-state recovery, arrival confirmation, notification permissions, and the simulated UI workflow.", "The captures on this page come from the repository running locally with its sample trip."],
    limits: "A browser can suspend background pages. Passing automated checks does not establish reliable locked-phone delivery. Native automatic travel detection, live routing ETA, account sync, and cloud travel history are outside this prototype’s verified scope.",
    next: "Test the manual ride timer on real passenger trips, including screen lock and page resume. Record whether alerts arrive in time before expanding the feature set.",
    sourcePaths: ["README.md", "dist/model.js", "dist/app.js", "tests/"],
  },
  {
    slug: "go-reloaded", number: "02", title: "Go-Reloaded", category: "Command-line tool", status: "Go project",
    headline: "Text rules, made visible.",
    summary: "A Go text processor for case changes, number conversion, punctuation spacing, quotation marks, and article correction.",
    stack: ["Go", "Parsing", "CLI"], preview: "go",
    repository: `${githubUrl}/go-reloaded`,
    focus: "Order-dependent transformations and predictable text output.",
    context: "Text cleanup looks simple until transformations interact. This project applies explicit instructions embedded in an input file and writes the processed result to a separate file.",
    working: ["Read an input file and write a separate output file through a two-argument CLI.", "Convert hexadecimal and binary values and apply upper, lower, or capitalized text transformations.", "Adjust punctuation, quoted text, and articles before words beginning with selected letters."],
    decisions: [
      {title:"A staged transformation pipeline", text:"The implementation splits input into lines and words, processes transformation tags, filters those tags, and then applies article, punctuation, and quotation handling."},
      {title:"Examples beside the source", text:"The repository’s sample.txt and result.txt make the behavior inspectable. The portfolio replays two exact excerpts rather than presenting a fictional terminal run."}
    ],
    evidence: ["The preview uses exact lines from sample.txt and result.txt.", "main.go contains the CLI entry point, tag processing, and formatting functions.", "No new Go-runtime test result is claimed in this portfolio review."],
    limits: "Malformed transformation counts and invalid numeric inputs need stronger validation. The current source has paths that assume the next token exists, so the sample output alone is not evidence that every input is safe.",
    next: "Add table-driven tests for tag ordering, malformed counts, invalid numbers, empty files, and punctuation edge cases before generalizing the parser.",
    sourcePaths: ["main.go", "sample.txt", "result.txt"],
  },
  {
    slug: "ascii-art", number: "03", title: "ASCII-Art", category: "Command-line tool", status: "Go project",
    headline: "From a word to a pattern.",
    summary: "A Go command-line renderer that turns text into eight-row artwork using standard, shadow, or thinkertoy banner files.",
    stack: ["Go", "File parsing", "Text rendering"], preview: "ascii",
    repository: `${githubUrl}/ascii-art`,
    focus: "Character indexing, multiline output, and banner-file structure.",
    context: "A banner file stores character patterns in a fixed structure. The renderer maps each input character to its pattern, then joins corresponding rows to build the final artwork.",
    working: ["Select one of the three included banner files, with standard as the default.", "Render eight rows for each line of text and handle literal newline sequences.", "Check the banner name, command arguments, and expected banner-file line count."],
    decisions: [
      {title:"Data-driven lettering", text:"The artwork lives in banner files rather than separate rendering functions for every letter. Character offsets locate the correct eight-row pattern."},
      {title:"Render one row across the whole word", text:"The renderer loops through the eight output rows, then through the input characters. That preserves alignment between neighboring letter patterns."}
    ],
    evidence: ["The three previews use the actual standard.txt, shadow.txt, and thinkertoy.txt character data.", "generate.go, banner.go, and validate.go show the rendering and validation flow.", "Repository test files exist; they were not executed with a Go toolchain in this review."],
    limits: "The preview is a faithful browser rendering of the stored banner samples, not a Go process running in the browser. Unsupported characters need explicit range validation before indexing into banner data.",
    next: "Verify non-ASCII input handling and expand tests around consecutive newlines, empty input, and corrupt banner files.",
    sourcePaths: ["generate.go", "banner.go", "validate.go", "ascii_test.go"],
  },
  {
    slug: "vicfungo", number: "04", title: "VicFungo", category: "Web application", status: "In development",
    headline: "A clearer place to build a habit.",
    summary: "A habit-tracking application with a growth dashboard, identity anchors, habit cards, guided sessions, and progress views.",
    stack: ["React", "TypeScript", "Tailwind CSS"], preview: "vic",
    repository: `${githubUrl}/habit_tracker`,
    focus: "Habit workflows, deliberate completion, and useful daily feedback.",
    context: "VicFungo explores how to make returning to a useful routine easier. The repository contains a real interface and workflow code, rather than only a proposed habit-tracking concept.",
    working: ["Render a dashboard with identity anchors, first-day quests, and habit cards.", "Store guest profile, habits, and progress state locally.", "Provide guided-session and progress interfaces in the application."],
    decisions: [
      {title:"A habit has more context than a checkbox", text:"Habit data includes a description, schedule, difficulty, reminder settings, and dated records. The interface connects actions with the routine they support."},
      {title:"Represent the current application honestly", text:"The portfolio uses captures of the repository rendered locally with a sample guest session. It does not replace the interface with an invented cleaner product screen."}
    ],
    evidence: ["The preview captures come from the React application running locally with sample guest data.", "src/App.tsx, src/components/HabitCard.tsx, and src/types.ts establish the visible dashboard and habit structures.", "External authentication, AI services, account synchronization, and device integrations were not validated end to end in this review."],
    limits: "A visible feature is not the same as a verified integration. Any physiological or AI-related labels in the application should be treated as interface concepts, not measured health outcomes or independently validated claims.",
    next: "Finish and test one end-to-end habit loop: create a habit, complete it deliberately, reload, and inspect its dated record. Validate service-dependent features separately.",
    sourcePaths: ["src/App.tsx", "src/components/HabitCard.tsx", "src/types.ts", "src/index.css"],
  },
];
