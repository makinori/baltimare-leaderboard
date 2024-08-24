import Datastore from "@seald-io/nedb";
import { Cron } from "croner";
import { formatDistanceToNow } from "date-fns";
import { JSDOM } from "jsdom";
import * as path from "path";
import { Trait, userTraitsMap } from "../../shared/traits";
import express from "express";
import { ApiLsl } from "./lsl";

export interface IUser {
	_id: string;
	minutes: number;
	name: string;
	imageId: string;
	lastSeen: Date;
	lastUpdated: Date;
}

export interface IApiUser extends IUser {
	online: boolean;
	lastSeenText: string;
	traits: Trait[];
	username: string;
	displayName: string;
}

const usernameRegex = / \(([^(]+?)\)$/;

// these apis are inconsistent cause they use bots that aren't always in baltimare
// there should be scripts in world ive made that keep track of who's here

// const uuidRegex =
// 	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// const nullUuidRegex = /^0{8}-0{4}-0{4}-0{4}-0{12}$/;

// const onlineUsersUrls = [
// 	"https://api.baltimare.org/hhapi/getavatarpositions", // horse heights
// 	"https://api.baltimare.org/corrade/getavatarpositions", // baltimare
// ];

// async function getOnlineUuids() {
// 	let onlineUuids: string[] = [];

// 	for (const onlineUsersUrl of onlineUsersUrls) {
// 		try {
// 			const res = await fetch(onlineUsersUrl);
// 			const users = JSON.parse(await res.text());

// 			for (let user of users) {
// 				if (uuidRegex.test(user.user_uuid)) {
// 					onlineUuids.push(user.user_uuid);
// 				}
// 			}
// 		} catch (error) {}
// 	}

// 	return onlineUuids;
// }

async function getUserInfo(uuid: string) {
	const res = await fetch("https://world.secondlife.com/resident/" + uuid);

	if (!res.ok || res.status != 200) {
		throw new Error("Failed to get user info");
	}

	const html = await res.text();
	const document = new JSDOM(html).window.document;

	const name = document.querySelector(`title`)?.textContent ?? "";
	const imageId =
		document
			.querySelector(`meta[name="imageid"]`)
			?.getAttribute("content") ?? "";

	// let imageUrl = "";
	// if (uuidRegex.test(imageId) && !nullUuidRegex.test(imageId)) {
	// 	imageUrl = `https://picture-service.secondlife.com/${imageId}/256x192.jpg`;
	// }

	return { name, imageId };
}

export class ApiUsers {
	private users = new Datastore<IUser>({
		filename: path.resolve(__dirname, "../../db/users.db"),
	});

	private cacheUserInfoSeconds = 60 * 60 * 24; // 1 day

	private async processUser(uuid: string) {
		let foundUser = await this.users.findOneAsync({ _id: uuid });

		if (foundUser == null) {
			let user: IUser = {
				_id: uuid,
				minutes: 1,
				name: "",
				imageId: "",
				lastSeen: new Date(),
				lastUpdated: new Date(),
			};

			try {
				const { name, imageId } = await getUserInfo(uuid);
				user.name = name;
				user.imageId = imageId;
			} catch (err) {
				console.log("Failed to get user info for: " + uuid);
			}

			await this.users.insertAsync(user);
		} else {
			foundUser.minutes++;
			foundUser.lastSeen = new Date();

			let secondsSinceLastUpdated = Infinity;

			if (foundUser.lastUpdated != null) {
				secondsSinceLastUpdated =
					(Date.now() - foundUser.lastUpdated.getTime()) / 1000;
			}

			if (secondsSinceLastUpdated > this.cacheUserInfoSeconds) {
				try {
					const { name, imageId } = await getUserInfo(uuid);
					foundUser.name = name;
					foundUser.imageId = imageId;
					foundUser.lastUpdated = new Date();
				} catch (err) {
					console.log("Failed to get user info for: " + uuid);
				}
			}

			await this.users.updateAsync({ _id: uuid }, foundUser);
		}
	}

	private async logUsers() {
		try {
			for (const uuid of this.apiLsl.getOnlineUuids()) {
				try {
					await this.processUser(uuid);
				} catch (error) {
					console.error("Failed to process user: " + uuid);
				}
			}

			await this.users.compactDatafileAsync();
		} catch (error) {
			console.error("Failed to log users...");
		}
	}

	private getApiUsersResponse(): IApiUser[] {
		const sortedUsers = this.users
			.getAllData()
			.sort((a, b) => b.minutes - a.minutes);

		return sortedUsers.map(user => {
			const lastSeen = new Date(user.lastSeen);
			const lastSeenSeconds = (Date.now() - lastSeen.getTime()) / 1000;
			const online = lastSeenSeconds < 60 * 2; // within 2 minutes

			let lastSeenText = "online";
			if (!online) {
				lastSeenText = formatDistanceToNow(lastSeen, {
					addSuffix: false,
				})
					.replace("about", "")
					.replace("minute", "min")
					.replace("less than a", "<")
					.trim();
			}

			let apiUser = user as IApiUser;

			apiUser.online = online;
			apiUser.lastSeenText = lastSeenText;

			const usernameMatches = user.name.match(usernameRegex);
			if (usernameMatches != null) {
				apiUser.username = usernameMatches[1];
				apiUser.displayName = user.name
					.replace(usernameRegex, "")
					.trim();
			} else {
				apiUser.username = user.name;
				apiUser.displayName = "";
			}

			apiUser.traits = [];

			for (const trait of Object.keys(userTraitsMap) as Trait[]) {
				const apiUsername = apiUser.username
					.toLowerCase()
					.replace(/ /g, ".");

				if (userTraitsMap[trait].includes(apiUsername)) {
					apiUser.traits.push(trait);
				}
			}

			return apiUser;
		});
	}

	constructor(public readonly apiLsl: ApiLsl) {}

	router = express.Router();

	private initialized = false;

	async init() {
		if (this.initialized) return;
		this.initialized = true;

		console.log("Initializing db and cron for once a minute");

		await this.users.loadDatabaseAsync();

		// client should request at 15 or 30 second mark

		// log users at 0 second mark and when done, cache api users response

		let cachedApiUsersResponse: IApiUser[] = this.getApiUsersResponse();

		Cron("0 * * * * *", async () => {
			// only run this function once a minute!!
			await this.logUsers();

			cachedApiUsersResponse = this.getApiUsersResponse();
		});

		// init api

		this.router.get("/api/users", (req, res) => {
			res.json(cachedApiUsersResponse);
		});

		return this;
	}
}
