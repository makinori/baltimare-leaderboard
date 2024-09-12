import shrinkRay from "@nitedani/shrink-ray-current";
import express from "express";
import * as http from "http";
import next from "next";
import socketIo from "socket.io";
import * as url from "url";
import { ApiManager } from "./managers/api-manager";
import { LslManager } from "./managers/lsl-manager";
import { UserManager } from "./managers/user-manager";

const port = process.env.PORT ?? 3000;
const dev = process.env.NODE_ENV !== "production";

(async () => {
	// init express and nextjs

	const expressApp = express();
	expressApp.use(shrinkRay());

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

	const io = new socketIo.Server(server);

	// init managers

	const lslManager = new LslManager().init();

	const userManager = await new UserManager(lslManager).init();

	const apiManager = new ApiManager(userManager, lslManager, io).init();
	expressApp.use(apiManager.router);

	server.listen(port);

	console.log(
		`Initializing in ${dev ? "development" : process.env.NODE_ENV} mode`,
	);

	console.log(`Server listening at http://localhost:${port}`);
})();
