import Datastore from "@seald-io/nedb";
import { Cron } from "croner";
import { formatDistanceToNow } from "date-fns";
import { JSDOM } from "jsdom";
import * as path from "path";
import { Trait, userTraitsMap } from "../shared/traits";
import { getDirname } from "./utils";

const __dirname = getDirname(import.meta);

export interface IUser {
	_id: string;
	minutes: number;
	name: string;
	imageId: string;
	lastSeen: Date;
	lastUpdated: Date;
}

export const users = new Datastore<IUser>({
	filename: path.resolve(__dirname, "../db/users.db"),
	autoload: true,
});

const cacheUserInfoSeconds = 60 * 60 * 24; // 1 day

const uuidRegex =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// const nullUuidRegex = /^0{8}-0{4}-0{4}-0{4}-0{12}$/;

const onlineUsersUrls = [
	"https://api.baltimare.org/hhapi/getavatarpositions",
	"https://api.baltimare.org/corrade/getavatarpositions",
];

async function getOnlineUuids() {
	let onlineUuids: string[] = [];

	for (const onlineUsersUrl of onlineUsersUrls) {
		try {
			const res = await fetch(onlineUsersUrl);
			const users = JSON.parse(await res.text());

			for (let user of users) {
				if (uuidRegex.test(user.user_uuid)) {
					onlineUuids.push(user.user_uuid);
				}
			}
		} catch (error) {}
	}

	return onlineUuids;
}

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

async function processUser(uuid: string) {
	let foundUser = await users.findOneAsync({ _id: uuid });

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

		await users.insertAsync(user);
	} else {
		foundUser.minutes++;
		foundUser.lastSeen = new Date();

		let secondsSinceLastUpdated = Infinity;

		if (foundUser.lastUpdated != null) {
			secondsSinceLastUpdated =
				(Date.now() - foundUser.lastUpdated.getTime()) / 1000;
		}

		if (secondsSinceLastUpdated > cacheUserInfoSeconds) {
			try {
				const { name, imageId } = await getUserInfo(uuid);
				foundUser.name = name;
				foundUser.imageId = imageId;
				foundUser.lastUpdated = new Date();
			} catch (err) {
				console.log("Failed to get user info for: " + uuid);
			}
		}

		await users.updateAsync({ _id: uuid }, foundUser);
	}
}

async function logUsers() {
	try {
		const onlineUuids = await getOnlineUuids();

		for (const uuid of onlineUuids) {
			try {
				await processUser(uuid);
			} catch (error) {
				console.error("Failed to process user: " + uuid);
			}
		}

		await users.compactDatafileAsync();
	} catch (error) {
		console.error("Failed to log users...");
	}
}

export interface IApiUser extends IUser {
	online: boolean;
	lastSeenText: string;
	traits: Trait[];
	username: string;
	displayName: string;
}

const usernameRegex = / \(([^(]+?)\)$/;

function getApiUsersResponse() {
	const sortedUsers = users
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
			apiUser.displayName = user.name.replace(usernameRegex, "").trim();
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

let cachedApiUsersResponse: IApiUser[];

export function getApiUsers() {
	if (cachedApiUsersResponse == null) {
		cachedApiUsersResponse = getApiUsersResponse();
	}

	return cachedApiUsersResponse;
}

let cronInitialized = false;

export function initCron() {
	if (cronInitialized) return;
	cronInitialized = true;

	console.log("Initializing cron for once a minute");

	// every minute at 0 seconds
	Cron("0 * * * * *", logUsers);

	// every minute at 15 seconds
	Cron("15 * * * * *", () => {
		// invalidate cache
		cachedApiUsersResponse = null;
	});

	// cause at 30 seconds the client will pull
}
