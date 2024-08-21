"use server";

import { App } from "./components/App";
import { getLatestData } from "./functions/get-latest-data";

export default async function Page() {
	const data = await getLatestData();

	return <App data={data} />;
}
