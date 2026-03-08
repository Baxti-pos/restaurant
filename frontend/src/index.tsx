import "./index.css";
import React from "react";
import { render } from "react-dom";
import { App } from "./App";
import { initPwa, registerServiceWorker } from "./lib/pwa";

initPwa();
void registerServiceWorker();

render(<App />, document.getElementById("root"));
