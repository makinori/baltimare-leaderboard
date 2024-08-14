import compression from "compression";
import express from "express";
import * as path from "path";
import { getApiUsers, initCron } from "./users";

initCron();

const app = express();

app.use(compression());

app.get("/api/users", (req, res) => {
	res.json(getApiUsers());
});

const frontendDir = path.resolve(__dirname, "../frontend/dist");
const staticDir = path.resolve(__dirname, "../static");

app.use(express.static(frontendDir));
app.use(express.static(staticDir));

app.get("/", (req, res) => {
	res.sendFile(path.resolve(frontendDir, "index.html"));
});

app.get("*", (req, res) => {
	res.redirect("/");
});

const port = Number.parseInt(process.env.PORT ?? "8080");
app.listen(port, () => {
	console.log("Starting web server at http://127.0.0.1:" + port);
});
