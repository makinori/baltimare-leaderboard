import bodyParser from "body-parser";
import { Cron } from "croner";
import express from "express";
import Pako from "pako";
import socketIo from "socket.io";
import { Trait, userTraitsMap } from "../../shared/traits";
import { LslManager, LslScriptIntervalSeconds, Region } from "./lsl-manager";
import { IUser, UserManager } from "./user-manager";

export interface IApiUser extends IUser {
	traits: Trait[];
}

export interface IApiOnlineUser {
	_id: string;
	region: string;
	x: number;
	y: number;
}

export type IApiOnlineSims = Record<Region, boolean>;

export class ApiManager {
	private secret = process.env.API_SECRET ?? "dcumwoidaksdjlkajsd";

	router = express.Router();

	constructor(
		private readonly userManager: UserManager,
		private readonly lslManager: LslManager,
		private readonly io: socketIo.Server,
	) {}

	private async getApiUsers() {
		let users = await this.userManager.getAllUsers();

		// sort by time
		users = users.sort((a, b) => b.minutes - a.minutes);

		let apiUsers: IApiUser[] = [];

		for (const user of users) {
			const uuid = user?._id ?? "";
			const traits = userTraitsMap[uuid.toLowerCase()] ?? [];

			let apiUser = user as IApiUser;
			apiUser.traits = traits;

			apiUsers.push(apiUser);
		}

		return apiUsers;
	}

	private async getApiOnlineUsers() {
		// TODO: there can be duplicates here
		const online = this.lslManager.getData();

		let apiOnlineUsers: IApiOnlineUser[] = [];

		for (const [region, onlineUsers] of Object.entries(online)) {
			for (const onlineUser of onlineUsers) {
				apiOnlineUsers.push({
					_id: onlineUser.uuid,
					region,
					x: onlineUser.x,
					y: onlineUser.y,
				});
			}
		}

		return apiOnlineUsers;
	}

	private initialized = false;

	init() {
		if (this.initialized) return;
		this.initialized = true;

		this.router.use(bodyParser.text());

		this.router.put("/api/lsl/:region", (req, res) => {
			const region = req.params.region as Region;

			if (
				!req.body ||
				req.header("Authorization") != "Bearer " + this.secret ||
				!Region.includes(region)
			) {
				res.status(400).json({ error: "Bad request" });
				return;
			}

			try {
				this.lslManager.putData(region, req.body);
			} catch (error) {
				console.error(error);
			}

			res.status(200).json({ success: true });
		});

		this.router.get("/api/health", async (req, res) => {
			res.json(this.lslManager.getHealth());
		});

		this.router.get("/api/users", async (req, res) => {
			try {
				res.json(await this.getApiUsers());
			} catch (error) {
				console.error(error);
				res.status(500).json([]);
			}
		});

		this.router.get("/api/users/online", async (req, res) => {
			try {
				res.json(await this.getApiOnlineUsers());
			} catch (error) {
				console.error(error);
				res.status(500).json([]);
			}
		});

		this.router.get("/api", (req, res) => {
			res.contentType("txt").send(
				[
					"a socket.io endpoint with events: users (gzip), online (gzip), health",
					"",
					"GET /api/health - for monitoring",
					"",
					"GET /api/users - data for leaderboard, refreshes once a minute",
					"GET /api/users/online - output from in-world lsl cube, updates every 15 seconds",
					"",
					"PUT /api/lsl/:where - for the in-world lsl cube to send data to",
				].join("\n"),
			);
		});

		// listen to events

		this.userManager.events.on("update", async () => {
			try {
				this.io.emit(
					"users",
					Pako.gzip(JSON.stringify(await this.getApiUsers())),
				);
			} catch (error) {
				console.log(error);
			}
		});

		// this.lslManager.events.on("update", async () => {})

		// if we use above, will send twice every 5 seconds

		new Cron(`*/${LslScriptIntervalSeconds} * * * * *`, async () => {
			try {
				this.io.emit(
					"online",
					Pako.gzip(JSON.stringify(await this.getApiOnlineUsers())),
				);
				this.io.emit("health", this.lslManager.getHealth().online);
			} catch (error) {
				console.log(error);
			}
		});

		return this;
	}
}
