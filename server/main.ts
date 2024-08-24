import express from "express";
import * as http from "http";
import next from "next";
import * as url from "url";
import { ApiLsl } from "./api/lsl";
import { ApiUsers } from "./api/users";

(async () => {
	const port = process.env.PORT ?? 3000;
	const dev = process.env.NODE_ENV !== "production";
	const nextApp = next({ dev });
	const nextHandler = nextApp.getRequestHandler();

	const expressApp = express();

	const apiLsl = new ApiLsl().init();
	expressApp.use(apiLsl.router);

	const apiUsers = await new ApiUsers(apiLsl).init();
	expressApp.use(apiUsers.router);

	function handler(req: http.IncomingMessage, res: http.ServerResponse) {
		const parsedUrl = url.parse(req.url!, true);

		if (parsedUrl.path.startsWith("/api/")) {
			expressApp(req, res);
		} else {
			nextHandler(req, res, parsedUrl);
		}
	}

	nextApp.prepare().then(() => {
		http.createServer(handler).listen(port);
	});

	console.log(
		`> Server listening at http://localhost:${port} as ${
			dev ? "development" : process.env.NODE_ENV
		}`,
	);
})();
