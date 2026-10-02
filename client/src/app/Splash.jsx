import { useEffect, useState } from "react";

const APP_NAME = "DigiLog";
const TAGLINE = "Track to the tail";

// How long the launch screen stays, then how long it takes to fade.
const SHOW_MS = 2000;
const FADE_MS = 300;

// The launch screen: app name and tagline over the theme's hero gradient,
// shown once each time the app starts (not when it comes back from the
// background). Tap to skip. `onDone` fires once it has gone.
export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), SHOW_MS);
    return () => clearTimeout(fade);
  }, []);

  useEffect(() => {
    if (!leaving) return undefined;
    const done = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(done);
  }, [leaving, onDone]);

  return (
    <div className={`splash ${leaving ? "is-leaving" : ""}`} onClick={() => setLeaving(true)} role="presentation">
      <div className="splash-content">
        <h1 className="splash-name">{APP_NAME}</h1>
        <p className="splash-tagline">{TAGLINE}</p>
      </div>
    </div>
  );
}
