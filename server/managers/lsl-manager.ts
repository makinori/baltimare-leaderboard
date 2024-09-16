import mitt from "mitt";

export const Region = ["baltimare", "horseheights"] as const;
export type Region = (typeof Region)[number];

// lsl script should update every 5 seconds
// will fail if http error code 500 more than 5 times in a minute
// script could handles this and pauses sending for a minute

// online users will expire here on server after 15 seconds

export const LslScriptIntervalSeconds = 5;

interface IOnlineUser {
	uuid: string;
	x: number;
	y: number;
}

function hexStrToUuid(hexStr: string) {
	return [
		hexStr.substring(0, 8),
		hexStr.substring(8, 12),
		hexStr.substring(12, 16),
		hexStr.substring(16, 20),
		hexStr.substring(20, 32),
	]
		.join("-")
		.toLowerCase();
}

export class LslManager {
	private expireTimeMs = 1000 * 15; // seconds

	private online: Map<
		Region,
		{
			onlineUsers: IOnlineUser[];
			expireDate: number;
		}
	> = new Map();

	events = mitt<{ update: null }>();

	constructor() {}

	// handle as a put request

	putData(region: Region, data: string) {
		const onlineUsers = data
			.split(";")
			.map((line: string) =>
				line.match(/([0-9a-f]{32})([0-9]+),([0-9]+)/i),
			)
			.map((line: RegExpMatchArray) => ({
				uuid: hexStrToUuid(line[1]),
				x: parseInt(line[2]),
				y: parseInt(line[3]),
			}));

		this.online.set(region, {
			onlineUsers,
			expireDate: Date.now() + this.expireTimeMs,
		});

		this.events.emit("update");
	}

	getData() {
		const now = Date.now();
		const data: { [region in Region]?: IOnlineUser[] } = {};

		for (const [
			region,
			{ onlineUsers, expireDate },
		] of this.online.entries()) {
			if (now > expireDate) continue;
			data[region] = onlineUsers;
		}

		return data;
	}

	getOnlineUuids() {
		let uuids: string[] = [];

		for (const onlineUsers of Object.values(this.getData())) {
			for (let user of onlineUsers) {
				if (uuids.includes(user.uuid)) continue;
				uuids.push(user.uuid);
			}
		}

		return uuids;
	}

	getHealth() {
		let healthy = true;
		let online: Record<Region, boolean> = {} as any;

		const onlineRegions = Object.keys(this.getData()) as Region[];

		for (const region of Region) {
			const regionHealthy = onlineRegions.includes(region);
			online[region] = regionHealthy;

			if (!regionHealthy) {
				healthy = false;
			}
		}

		return { healthy, online };
	}

	private initialized = false;

	init() {
		if (this.initialized) return;
		this.initialized = true;

		// reaper reaps so we dont get a massive dictionary
		setInterval(() => {
			const now = Date.now();
			for (const [region, { expireDate }] of this.online.entries()) {
				if (expireDate > now) continue;

				this.online.delete(region);

				this.events.emit("update");

				// TODO: could notify with a webhook, cause script went offline
			}
		}, this.expireTimeMs);

		return this;
	}
}
