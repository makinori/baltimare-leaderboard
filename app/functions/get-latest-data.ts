"use server";

import * as fs from "fs/promises";
import * as path from "path";
import type { IApiUser } from "../../server/users";
const cacheDir = path.resolve(process.env.APP_ROOT ?? "", "cache");
import { unstable_noStore as noStore } from "next/cache";

export async function getLatestData() {
	noStore();

	try {
		const apiUsers: IApiUser[] = JSON.parse(
			await fs.readFile(path.resolve(cacheDir, "users.json"), "utf8"),
		);

		return apiUsers;
	} catch (error) {
		console.error(error);
		return [];
	}
}
