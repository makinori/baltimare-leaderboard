import Cron from "croner";
import { JSDOM } from "jsdom";
import { LslManager } from "./lsl-manager";
import mitt from "mitt";
import Datastore from "@seald-io/nedb";
import * as path from "path";

interface IUserInfo {
	lastUpdated: Date;
	username: string;
	displayName?: string;
	imageId?: string;
}

export interface IUser {
	_id: string;
	minutes: number;
	lastSeen: Date;
	info: IUserInfo;
}

const usernameRegex = / \(([^(]+?)\)$/;

const uuidRegex =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const nullUuidRegex = /^0{8}-0{4}-0{4}-0{4}-0{12}$/;

export class UserManager {
	private expireUserInfoMs = 1000 * 60 * 60 * 24; // 1 day

	private users = new Datastore<IUser>({
		filename: path.resolve(__dirname, "../../db/users.db"),
	});

	events = mitt<{ update: null }>();

	constructor(private readonly lslManager: LslManager) {}

	private async getFreshUserInfo(uuid: string) {
		const res = await fetch(
			"https://world.secondlife.com/resident/" + uuid,
		);

		if (!res.ok || res.status != 200) {
			throw new Error("Failed to get user info");
		}

		const html = await res.text();
		const document = new JSDOM(html).window.document;

		const name = document.querySelector(`title`)?.textContent ?? "";

		let username: string = null;
		let displayName: string = null;

		const usernameMatches = name.match(usernameRegex);
		if (usernameMatches != null) {
			username = usernameMatches[1];
			displayName = name.replace(usernameRegex, "").trim();
		} else {
			username = name.trim();
			displayName = "";
		}

		let imageId =
			document
				.querySelector(`meta[name="imageid"]`)
				?.getAttribute("content") ?? "";

		if (
			!imageId ||
			!uuidRegex.test(imageId) ||
			nullUuidRegex.test(imageId)
		) {
			imageId = null;
		}

		console.log("Fetched fresh for " + username);

		return { username, displayName, imageId };
	}

	private async getUserInfo(
		uuid: string,
		userInfo: IUserInfo,
	): Promise<IUserInfo> {
		const lastUpdated = userInfo?.lastUpdated?.getTime();

		if (lastUpdated + this.expireUserInfoMs > Date.now()) {
			return userInfo; // dont need to update
		} else {
			try {
				const { username, displayName, imageId } =
					await this.getFreshUserInfo(uuid);

				return {
					lastUpdated: new Date(),
					username,
					displayName,
					imageId: imageId,
				};
			} catch (error) {
				console.error(error);

				return {
					lastUpdated: new Date(0),
					username: "",
					displayName: "",
					imageId: null,
				};
			}
		}
	}

	// private userToApiUser(user: IUser): IApiUser {
	// 	return {
	// 		_id: user._id.toString(),
	// 		minutes: user.minutes,
	// 		lastSeen: user.lastSeen.toISOString(),
	// 		info: {
	// 			lastUpdated: user.info.lastUpdated.toISOString(),
	// 			username: user.info.username,
	// 			displayName: user.info.displayName,
	// 			imageId: user.info.imageId.toString(),
	// 		},
	// 	};
	// }

	async getAllUsers(): Promise<IUser[]> {
		// const users = await User.find({});
		// return users.map(user => this.userToApiUser(user));
		return await this.users.findAsync({});
	}

	// only run this function once a minute!
	private async cronInterval() {
		let onlineUuids = this.lslManager.getOnlineUuids();

		for (const uuid of onlineUuids) {
			try {
				let user = await this.users.findOneAsync({ _id: uuid });

				if (user == null) {
					this.users.insert({
						_id: uuid,
						minutes: 1,
						// user has to be online within the cron interval for this to update
						lastSeen: new Date(),
						info: await this.getUserInfo(uuid, null),
					});
				} else {
					user.minutes++;
					user.lastSeen = new Date();
					user.info = await this.getUserInfo(uuid, user.info);
					await this.users.updateAsync({ _id: uuid }, user);
				}
			} catch (error) {
				console.error(error);
			}
		}

		await this.users.compactDatafileAsync();

		this.events.emit("update");
	}

	private initialized = false;

	async init() {
		if (this.initialized) return;
		this.initialized = true;

		await this.users.loadDatabaseAsync();

		// only run once a minute!
		Cron("0 * * * * *", this.cronInterval.bind(this));

		console.log("Started cron job for user minutes");

		return this;
	}
}
