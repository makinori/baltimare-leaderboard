import * as bodyParser from "body-parser";
import * as express from "express";
import * as socketIo from "socket.io";

// lsl script should update every 15 seconds
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
	]
		.join("-")
		.toLowerCase();
}

const OnlineWhere = ["baltimare", "horseheights"] as const;
type OnlineWhere = (typeof OnlineWhere)[number];

export interface IApiOnlineUsers {
	uuid: string;
	x: number;
	y: number;
}

export type IApiOnlineUsersSeperated = Record<OnlineWhere, IApiOnlineUsers[]>;

export interface IApiOnlineUserCombined extends IApiOnlineUsers {
	where: OnlineWhere;
}

export interface IOnlineUser extends IApiOnlineUserCombined {
	expire: number; // date
}

export class ApiLsl {
	private online: Map<string, IOnlineUser> = new Map();

	router = express.Router();

	getOnlineCombined(): IApiOnlineUserCombined[] {
		// TODO: when developing, maybe add a way to get data from baltimare.hotmilk.space

		const now = Date.now();

		return Array.from(this.online.values())
			.filter(user => user.expire > now)
			.map(user => {
				user = JSON.parse(JSON.stringify(user)); // hard copy
				delete user.expire;
				return user;
			});
	}

	getOnlineSeperated(): IApiOnlineUsersSeperated {
		const result = OnlineWhere.reduce((obj, where) => {
			obj[where] = [];
			return obj;
		}, {} as IApiOnlineUsersSeperated);

		const online = this.getOnlineCombined();

		for (const user of online) {
			const where = user.where;
			delete user.where;
			result[where].push(user);
		}

		return result;
	}

	isOnline(uuid: string) {
		// getOnline() should have lower case uuids for keys
		uuid = uuid.toLowerCase();
		return (
			this.getOnlineCombined().findIndex(user => user.uuid == uuid) > -1
		);
	}

	constructor(public readonly io: socketIo.Server) {}

	private initialized = false;

	init() {
		if (this.initialized) return;
		this.initialized = true;

		console.log("Initializing api for lsl scripts, secret: " + secret);

		this.router.use(bodyParser.text());

		this.router.put("/api/lsl/:where", (req, res) => {
			const where = req.params.where as OnlineWhere;

			if (
				req.body == false ||
				req.header("Authorization") != "Bearer " + secret ||
				!OnlineWhere.includes(where)
			) {
				return res.status(400).json({ error: "Bad request" });
			}

			const onlineUsers: IOnlineUser[] = req.body
				.split(";")
				.map((line: string) =>
					line.match(/([0-9a-f]{32})([0-9]+),([0-9]+)/i),
				)
				.map((line: RegExpMatchArray) => ({
					uuid: hexStrToUuid(line[1]),
					x: parseInt(line[2]),
					y: parseInt(line[3]),
					where,
					expire: Date.now() + avatarExpire,
				}));

			for (const user of onlineUsers) {
				this.online.set(user.uuid, user);
			}

			// send output to socket io

			// TODO: this needs to be on a cron

			this.io.emit("positions", {
				[where]: onlineUsers.map(user => {
					user = JSON.parse(JSON.stringify(user));
					delete user.where;
					delete user.expire;
					return user;
				}),
			});
		});

		// reaper reaps so we dont get a massive dictionary

		setInterval(() => {
			const now = Date.now();

			for (const [uuid, user] of this.online.entries()) {
				if (user.expire > now) continue;
				this.online.delete(uuid);
			}
		}, avatarExpire);

		return this;
	}
}
