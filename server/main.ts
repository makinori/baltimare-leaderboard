import shrinkRay from "@nitedani/shrink-ray-current";
import express from "express";
import * as http from "http";
import next from "next";
import socketIo from "socket.io";
import * as url from "url";
import { CLOUDSDALE } from "../shared/utils";
import { ApiManager } from "./managers/api-manager";
import { LslManager } from "./managers/lsl-manager";
import { UserManager } from "./managers/user-manager";

const PORT = process.env.PORT ?? 3000;
const DEV = process.env.NODE_ENV !== "production";

(async () => {
	// init express and nextjs

	const expressApp = express();
	expressApp.use(shrinkRay());

	const nextApp = next({ dev: DEV });
	await nextApp.prepare();

	const nextHandler = nextApp.getRequestHandler();

	function handler(req: http.IncomingMessage, res: http.ServerResponse) {
		const parsedUrl = url.parse(req.url!, true);

		// this is so gay
		if (parsedUrl.path == "/favicon.png" && req.method == "GET") {
			res.writeHead(307, {
				location: `/favicon-${
					CLOUDSDALE ? "cloudsdale" : "baltimare"
				}.png`,
			});
			res.end();
		}

		if (parsedUrl.path.startsWith("/api")) {
			expressApp(req, res);
		} else {
			nextHandler(req, res, parsedUrl);
		}
	}

	const server = http.createServer(handler);

	const io = new socketIo.Server(server);

	// init managers

	const lslManager = new LslManager().init();

	const userManager = await new UserManager(lslManager).init();

	const apiManager = new ApiManager(userManager, lslManager, io).init();
	expressApp.use(apiManager.router);

	server.listen(PORT);

	console.log(
		`Initializing in ${DEV ? "development" : process.env.NODE_ENV} mode`,
	);

	console.log(`Server listening at http://localhost:${PORT}`);
})();
