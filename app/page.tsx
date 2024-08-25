"use server";

import { unstable_noStore as noStore } from "next/cache";
import { App } from "../components/App";
import type { IApiOnlineUsersSeperated } from "../server/api/lsl";
import type { IApiUser } from "../server/api/users";

export default async function Page() {
	noStore();

	const port = process.env.PORT ?? 3000;

	let users: IApiUser[] = [];
	try {
		const res = await fetch(`http://127.0.0.1:${port}/api/users`);
		users = await res.json();
	} catch (error) {}

	let positions: IApiOnlineUsersSeperated;
	try {
		const res = await fetch(`http://127.0.0.1:${port}/api/users/positions`);
		positions = await res.json();
	} catch (error) {}

	return <App initial={{ users, positions }} />;
}
