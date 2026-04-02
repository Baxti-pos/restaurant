import "./index.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initPwa, registerServiceWorker } from "./lib/pwa";

initPwa();
void registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
