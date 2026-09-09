import { mountExperiment } from "./index.js";
import "./style.css";
import "./standalone.css";
window.experiment = mountExperiment(document.getElementById("app"));
