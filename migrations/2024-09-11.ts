// const a = {
// 	_id: "ec407203-a2be-48d7-a272-7b576ba9878b",
// 	minutes: 1,
// 	lastSeen: { $$date: 1726091761092 },
// 	info: {
// 		lastUpdated: { $$date: 1726091761273 },
// 		username: "rubywastaken",
// 		displayName: "Ruby",
// 		imageId: "c9c45454-cb80-9548-6579-e9bb8749faad",
// 	},
// };

import Datastore from "@seald-io/nedb";
import * as path from "path";
import * as fs from "fs/promises";

if (process.argv.pop() != "--confirm") {
	console.log("Make sure to backup the database, then run with: --confirm");
	process.exit(1);
}

const dbPath = path.resolve(__dirname, "../db/users.db");

(async () => {
	// compact db first

	const db = new Datastore({
		filename: dbPath,
	});

	await db.loadDatabaseAsync();
	await db.compactDatafileAsync();

	// now rewrite

	const users = db.getAllData();

	for (const user of users) {
		await db.updateAsync(
			{ _id: user._id },
			{
				_id: user._id,
				minutes: user.minutes,
				lastSeen: user.lastSeen,
				info: {
					lastUpdated: user.lastUpdated,
					username: user.username,
					displayName: user.displayName,
					imageId: user.imageId,
				},
			},
		);
	}

	await db.compactDatafileAsync();
})();
