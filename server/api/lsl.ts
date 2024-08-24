import * as express from "express";
import * as bodyParser from "body-parser";

// lsl script should update every 30 seconds
// will fail if http error code 500 more than 5 times in a minute
// script could handle this and just pause sending for a minute, but doesnt

// uuids will expire here on server after 30 seconds

const secret = process.env.API_SECRET ?? "dcumwoidaksdjlkajsd";
const avatarExpire = 1000 * 30;

function hexStrToUuid(hexStr: string) {
	return [
		hexStr.substring(0, 8),
		hexStr.substring(8, 12),
		hexStr.substring(12, 16),
		hexStr.substring(16, 20),
		hexStr.substring(20, 32),
	].join("-");
}

export class ApiLsl {
	private currentlyOnline: Map<string, number> = new Map();

	router = express.Router();

	getOnlineUuids() {
		const now = Date.now();

		return Array.from(this.currentlyOnline.entries())
			.filter(o => o[1] > now)
			.map(o => o[0]);
	}

	private initialized = false;

	init() {
		if (this.initialized) return;
		this.initialized = true;

		console.log("Initializing api for lsl scripts, secret: " + secret);

		this.router.use(bodyParser.text());

		this.router.put("/api/lsl/online", (req, res) => {
			if (
				req.body == false ||
				req.header("Authorization") != "Bearer " + secret
			) {
				return res.status(400).json({ error: "Bad request" });
			}

			for (let i = 0; i < req.body.length; i += 32) {
				const uuid = hexStrToUuid(req.body.substring(i, i + 32));
				this.currentlyOnline.set(uuid, Date.now() + avatarExpire);
			}
		});

		// reaper reaps so we dont get a massive dictionary

		setInterval(() => {
			const now = Date.now();
			for (const [uuid, expire] of this.currentlyOnline.entries()) {
				if (expire > now) continue;
				this.currentlyOnline.delete(uuid);
			}
		}, avatarExpire);

		return this;
	}
}
