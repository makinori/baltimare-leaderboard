import express from "express";
import * as path from "path";
import { initCron, users } from "./users";

initCron();

const app = express();

const staticDir = path.resolve(__dirname, "../static");

app.get("/api/users", (req, res) => {
	res.json(users.getAllData().sort((a, b) => b.minutes - a.minutes));
});

app.use(express.static(staticDir));

app.get("/", (req, res) => {
	res.sendFile(path.resolve(staticDir, "index.html"));
});

app.get("*", (req, res) => {
	res.redirect("/");
});

const port = Number.parseInt(process.env.PORT ?? "8080");
app.listen(port, () => {
	console.log("Starting web server at *:" + port);
});
