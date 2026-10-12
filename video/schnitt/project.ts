import { makeProject } from "@revideo/core";
import szene from "./szene?scene";

// Revideo-Projekt (SIN-483). Eingaben kommen als Variablen aus render.mjs (Schritte, Farben, Aufnahmelänge).
export default makeProject({
  scenes: [szene],
  variables: { schritte: [], aufnahmeSek: 10, farben: {}, hinweis: "" },
});
