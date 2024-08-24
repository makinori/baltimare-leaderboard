"use server";

import type { IApiUser } from "../server/api/users";
import { App } from "./components/App";
import { unstable_noStore as noStore } from "next/cache";

export default async function Page() {
	noStore();

	let data: IApiUser[] = [];
	try {
		const port = process.env.PORT ?? 3000;
		const res = await fetch(`http://127.0.0.1:${port}/api/users`);
		data = await res.json();
	} catch (error) {}

	return <App initialData={data} />;
}
