"use server";

import { unstable_noStore as noStore } from "next/cache";
import { App } from "../components/App";
import type {
	IApiOnlineSims,
	IApiOnlineUser,
	IApiUser,
} from "../server/managers/api-manager";

export interface IAppInitialData {
	users: IApiUser[];
	online: IApiOnlineUser[];
	health: IApiOnlineSims;
}

export default async function Page() {
	noStore();

	const port = process.env.PORT ?? 3000;

	const initial: IAppInitialData = { users: [], online: [], health: {} };

	try {
		const res = await fetch(`http://127.0.0.1:${port}/api/users`);
		initial.users = await res.json();
	} catch (error) {}

	try {
		const res = await fetch(`http://127.0.0.1:${port}/api/users/online`);
		initial.online = await res.json();
	} catch (error) {}

	try {
		const res = await fetch(`http://127.0.0.1:${port}/api/health`);
		initial.health = (await res.json()).online;
	} catch (error) {}

	return <App initial={initial} />;
}
