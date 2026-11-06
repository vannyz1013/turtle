import { greeting } from "@edition/greeting";
import { ShuffleBag } from "../util/random";
import { el } from "./dom";

/**
 * The garden without 3D, for browsers that cannot run WebGL 2. Same words, same pocket
 * of wishes, same letter: just painted in CSS instead of rendered.
 */
export function showFallback(root: HTMLElement): void {
  const bag = new ShuffleBag(greeting.pocketMessages);
  const wish = el("p", { class: "fb-wish", attrs: { "aria-live": "polite" } });
  const pocket = el("button", { class: "btn btn-primary", text: greeting.fallback.pocketButton, attrs: { type: "button" } });
  pocket.addEventListener("click", () => {
    wish.textContent = bag.next();
    wish.classList.remove("pop");
    void wish.offsetWidth;
    wish.classList.add("pop");
  });

  const L = greeting.letter;
  const page = el("main", { class: "fallback" }, [
    el("div", { class: "fb-sky", attrs: { "aria-hidden": "true" } }, [el("span", { class: "fb-sun" }), el("span", { class: "fb-cloud c1" }), el("span", { class: "fb-cloud c2" }), el("span", { class: "fb-cloud c3" })]),
    el("section", { class: "fb-section fb-hero" }, [
      el("h1", { class: "panel-title is-hero", text: greeting.welcome.title }),
      el("p", { class: "panel-text", text: greeting.welcome.text }),
      el("p", { class: "fb-note", text: greeting.fallback.note }),
    ]),
    el("section", { class: "fb-section" }, [el("h2", { class: "panel-title", text: greeting.pocket.title }), pocket, wish]),
    el("section", { class: "fb-section" }, [
      el("h2", { class: "panel-title", text: greeting.garden.title }),
      el("ul", { class: "fb-flowers" }, greeting.flowerMessages.map((m) => el("li", { text: m }))),
    ]),
    el("section", { class: "fb-section" }, [
      el("h2", { class: "panel-title", text: L.heading }),
      el("article", { class: "letter-paper fb-letter" }, [
        el("p", { class: "letter-salutation", text: L.salutation }),
        ...L.paragraphs.map((t) => el("p", { text: t })),
        el("p", { class: "letter-closing", text: L.closing }),
        el("p", { class: "letter-signature", text: L.signature }),
      ]),
    ]),
    el("section", { class: "fb-section fb-hero" }, [el("h2", { class: "panel-title is-hero", text: greeting.finale.title }), el("p", { class: "panel-text", text: greeting.finale.text })]),
  ]);
  root.replaceChildren(page);
  document.body.classList.add("is-fallback");
}
