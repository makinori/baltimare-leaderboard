import compression from "compression";
import express from "express";
import { initFrontend } from "./frontend";
import { getApiUsers, initCron } from "./users";
import { isProduction } from "./utils";

if (isProduction) {
	console.log("Starting in production mode");
} else {
	console.log("Starting in development mode");
}

(async () => {
	initCron();

	const app = express();

	if (isProduction) {
		app.use(compression());
	}

	app.get("/api/users", (req, res) => {
		res.json(getApiUsers());
	});

	await initFrontend(app);

	const port = Number.parseInt(process.env.PORT ?? "8080");
	app.listen(port, () => {
		console.log("Starting web server at http://127.0.0.1:" + port);
	});
})();
