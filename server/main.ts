import express from "express";
import * as http from "http";
import next from "next";
import * as url from "url";
import { ApiLsl } from "./api/lsl";
import { ApiUsers } from "./api/users";
import socketIo from "socket.io";

const port = process.env.PORT ?? 3000;
const dev = process.env.NODE_ENV !== "production";

(async () => {
	// create express and next server

	const expressApp = express();

	const nextApp = next({ dev });
	await nextApp.prepare();

	const nextHandler = nextApp.getRequestHandler();

	function handler(req: http.IncomingMessage, res: http.ServerResponse) {
		const parsedUrl = url.parse(req.url!, true);

		if (parsedUrl.path.startsWith("/api")) {
			expressApp(req, res);
		} else {
			nextHandler(req, res, parsedUrl);
		}
	}

	const server = http.createServer(handler);

	// create apis

	// TODO: need to refactor. make a user data cache and push data more frequently

	const io = new socketIo.Server(server);

	const apiLsl = new ApiLsl(io).init();
	expressApp.use(apiLsl.router);

	const apiUsers = await new ApiUsers(apiLsl, io).init();
	expressApp.use(apiUsers.router);

	expressApp.get("/api", (req, res) => {
		res.contentType("html").send(
			[
				"a socket.io endpoint with events: users, positions",
				"",
				"GET /api/users - data for leaderboard, refreshes once a minute",
				"GET /api/users/positions - output from in-world lsl cube, updates every 15 seconds",
				"",
				"PUT /api/lsl/:where - for the in-world lsl cube to send data to",
			].join("<br />"),
		);
	});

	// listen

	server.listen(port);

	console.log(
		`> Server listening at http://localhost:${port} as ${
			dev ? "development" : process.env.NODE_ENV
		}`,
	);
})();
