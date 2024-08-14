import { formatDistanceToNow } from "date-fns";
import express from "express";
import * as path from "path";
import { initCron, IUser, users } from "./users";
import compression from "compression";

initCron();

const app = express();

app.use(compression());


export interface IApiUser extends IUser {
	online: boolean;
	lastSeenText: string;
}

app.get("/api/users", (req, res) => {
	const sortedUsers = users
		.getAllData()
		.sort((a, b) => b.minutes - a.minutes);

	res.json(
		sortedUsers.map(user => {
			const lastSeen = new Date(user.lastSeen);
			const lastSeenSeconds = (Date.now() - lastSeen.getTime()) / 1000;
			const online = lastSeenSeconds < 60 * 2; // within 2 minutes

			let lastSeenText = "online";
			if (!online) {
				lastSeenText = formatDistanceToNow(lastSeen, {
					addSuffix: false,
				})
					.replace("about", "")
					.replace("minute", "min")
					.replace("less than a", "<")
					.trim();
			}

			let apiUser = user as IApiUser;

			apiUser.online = online;
			apiUser.lastSeenText = lastSeenText;

			return apiUser;
		}),
	);
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
