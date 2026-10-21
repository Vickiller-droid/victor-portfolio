"use client";
import { useRef, useState } from "react";
import { ArrowRight, BatteryFull, Wifi, LockKeyhole, Rotate3D, Pause, Play, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import banners from "./previewData.json";

function WindowBar({ title }) {
  return <div className="mockWindowBar"><span className="mockDots" aria-hidden="true"><i/><i/><i/></span><span>{title}</span></div>;
}

export function BoothyMockup() {
  const zoom = useRef(null);
  const [turning, setTurning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [screen, setScreen] = useState("alert");
  return <figure className="deviceShowcase">
    <div className="deviceScene">
      <div className={`deviceBody${turning ? " isTurning" : ""}${paused ? " isPaused" : ""}`} onAnimationEnd={() => { setTurning(false); setPaused(false); }}>
        <div className="deviceBack" aria-hidden="true"><div className="deviceCameras"><i/><i/><i/><b/><em/></div></div>
        {Array.from({length:8}, (_,index) => <div className="deviceRim" style={{transform:`translateZ(${index-4}px)`}} key={index} aria-hidden="true"/>)}
        <div className="deviceFront">
          <div className="deviceStatus" aria-hidden="true"><span>9:41</span><span className="deviceIsland"/><span><Wifi size={12}/><BatteryFull size={16}/></span></div>
          <div className="deviceCapture"><img src={`/previews/boothy-${screen}.webp`} width="780" height="1688" alt={screen === "alert" ? "Actual Boothy simulation: two-minute belongings reminder with its original reason and item list" : "Actual Boothy ride setup, sample route, and Ride, Reminders, Parking navigation"} loading="eager" fetchPriority="high" decoding="async"/></div>
          <div className="deviceBrowser" aria-hidden="true"><ChevronLeft size={13}/><span><LockKeyhole size={10}/> Boothy · Web prototype</span><Share2 size={13}/></div>
          <div className="deviceHome" aria-hidden="true"/>
        </div>
      </div>
    </div>
    <div className="mockControls" role="group" aria-label="Boothy preview controls">
      <button type="button" data-screen="ride" aria-pressed={screen === "ride"} onClick={() => {setScreen("ride");setTurning(false);}}>Ride setup</button>
      <button type="button" data-screen="alert" aria-pressed={screen === "alert"} onClick={() => {setScreen("alert");setTurning(false);}}>Arrival alert</button>
      <button type="button" data-open-screen aria-haspopup="dialog" onClick={() => zoom.current?.showModal()}>View screen</button>
      <button type="button" data-rotate onClick={() => { if(turning) setPaused(!paused); else {setPaused(false);setTurning(true);} }} aria-label={turning ? paused ? "Resume rotation" : "Pause rotation" : "Rotate phone 360 degrees"}>{turning ? paused ? <Play size={13}/> : <Pause size={13}/> : <Rotate3D size={14}/>} {turning ? paused ? "Resume" : "Pause" : "Rotate 360°"}</button>
    </div>
    <dialog ref={zoom} className="screenDialog" aria-label="Boothy screen at reading size"><form method="dialog"><button type="submit">Close screen ×</button></form><img src={`/previews/boothy-${screen}.webp`} width="780" height="1688" alt="Actual Boothy prototype screen at reading size"/></dialog>
    <figcaption>Actual prototype captures · Sample trip in simulation mode</figcaption>
  </figure>;
}

export function GoMockup() {
  const [ran, setRan] = useState(false);
  return <figure className="codeShowcase">
    <div className="mockWindow"><WindowBar title="go-reloaded / sample → result"/>
      <div className="mockTerminal"><p className="terminalLabel">sample.txt</p><p>Simply add 42 <mark>(hex)</mark> and 10 <mark>(bin)</mark> and you will see the result is 68.</p><p>There is no greater agony than bearing <mark>a untold</mark> story inside you.</p><div className="mockCommand"><span aria-hidden="true">❯</span> go run . sample.txt result.txt</div>
        <div className="terminalOutput" aria-live="polite"><p className="terminalLabel">result.txt</p>{ran ? <div className="outputReveal"><p>Simply add <strong>66</strong> and <strong>2</strong> and you will see the result is 68.</p><p>There is no greater agony than bearing <strong>an untold</strong> story inside you.</p></div> : <p className="terminalHint">Run the preview to reveal the repository’s saved output.</p>}</div>
      </div>
      <div className="mockWindowFooter"><span>Hex · Binary · Article correction</span><button type="button" data-run-go onClick={() => setRan(!ran)}>{ran ? "Reset preview" : "Run preview"} <ArrowRight size={14}/></button></div>
    </div><figcaption>Repository input and output · Saved example replay</figcaption>
  </figure>;
}

export function AsciiMockup() {
  const [font, setFont] = useState("standard");
  return <figure className="codeShowcase"><div className="mockWindow"><WindowBar title="ascii-art / banner renderer"/>
    <div className="asciiToolbar"><span>“Hello”</span><div className="mockControls" role="group" aria-label="ASCII banner font">{Object.keys(banners).map(name => <button type="button" key={name} data-font={name} aria-pressed={font === name} onClick={() => setFont(name)}>{name}</button>)}</div></div>
    <div className="asciiCommand">❯ go run . "Hello" {font}</div>
    <div className="asciiCanvas"><pre aria-label={`Hello in the repository’s ${font} banner`} aria-live="polite">{banners[font]}</pre></div>
    <div className="mockWindowFooter"><span>8 rows. Character by character.</span><span>Three repository banners</span></div>
  </div><figcaption>Actual repository banners · “Hello” in three styles</figcaption></figure>;
}

export function VicFungoMockup() {
  const zoom = useRef(null);
  const [view, setView] = useState("dashboard");
  return <figure className="dashboardShowcase"><div className="mockWindow"><WindowBar title="VicFungo / habit tracker"/>
    <div className="dashboardCapture"><img src={`/previews/vicfungo-${view}.webp`} width="1280" height="900" alt={view === "dashboard" ? "Actual VicFungo Growth Dashboard with identity anchor, first-day quests and sidebar navigation; seeded local guest session" : "Actual VicFungo dashboard scrolled to habit and progress content; seeded local guest session"} loading="lazy" decoding="async"/></div>
    <div className="mockWindowFooter"><span>Guest session · Sample state</span><div className="mockControls"><button type="button" onClick={() => zoom.current?.showModal()} aria-haspopup="dialog">View capture</button><button type="button" data-vic-view="dashboard" aria-pressed={view === "dashboard"} onClick={() => setView("dashboard")}>Overview</button><button type="button" data-vic-view="habits" aria-pressed={view === "habits"} onClick={() => setView("habits")}>Habits & progress</button></div></div>
  </div><dialog ref={zoom} className="screenDialog dashboardDialog" aria-label="VicFungo capture at reading size"><form method="dialog"><button type="submit">Close capture ×</button></form><img src={`/previews/vicfungo-${view}.webp`} width="1280" height="900" alt="VicFungo running locally with sample guest data"/></dialog><figcaption>Actual application · Local sample guest session</figcaption></figure>;
}
