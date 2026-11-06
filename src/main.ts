import "./styles/main.css";
import { greeting } from "./data/greeting";

// Placeholder until the 3D garden is built: proves the toolchain and the
// Pages deployment work end to end. Replace with the scene bootstrap.
const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `<p class="placeholder">${greeting.title}<br /><small>coming soon</small></p>`;
}
