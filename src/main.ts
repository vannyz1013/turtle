import "@edition/theme.css";
import "./styles/main.css";
import "./styles/panel.css";
import "./styles/labels.css";
import "./styles/letter.css";
import "./styles/loader.css";
import "./styles/fallback.css";
import { detectCapabilities } from "./core/capabilities";
import { Loader } from "./ui/loader";
import { showFallback } from "./ui/fallback";

async function boot(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) return;
  const caps = detectCapabilities();
  const loader = new Loader(document.body);
  loader.set(0.04);

  if (!caps.webgl2) {
    showFallback(app);
    await loader.done();
    return;
  }

  try {
    // Fonts first (briefly), so text never pops in a different typeface.
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
    loader.set(0.12);
    const { startExperience } = await import("./experience");
    loader.set(0.3);
    const dispose = await startExperience(app, caps, (p) => loader.set(0.3 + p * 0.7));
    // Free GPU memory when the page really goes away (not when it is only cached for "back").
    window.addEventListener("pagehide", (e) => {
      if (!e.persisted) dispose();
    });
  } catch (err) {
    console.error("A Little Sunshine: 3D could not start, showing the 2D garden instead.", err);
    app.replaceChildren();
    showFallback(app);
  }
  await loader.done();
}

void boot();
