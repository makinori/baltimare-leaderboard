import { initUsersCron } from "./users";
import * as path from "path";
import * as fs from "fs/promises";

(async () => {
	const cacheDir = path.resolve(__dirname, "../cache");
	await fs.mkdir(cacheDir, { recursive: true });

	const usersPath = path.resolve(cacheDir, "users.json");

	await initUsersCron(async apiUsers => {
		fs.writeFile(usersPath, JSON.stringify(apiUsers));
	});
})();
