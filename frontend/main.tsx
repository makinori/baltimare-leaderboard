import ReactDOM from "react-dom/client";
import { App } from "./components/App";

const appEl = document.getElementById("app");
if (appEl != null) {
	const root = ReactDOM.createRoot(appEl);
	root.render(<App />);
}
