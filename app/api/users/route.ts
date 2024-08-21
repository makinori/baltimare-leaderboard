"use server";

import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import { getLatestData } from "../../functions/get-latest-data";
const cacheDir = path.resolve(process.env.APP_ROOT ?? "", "cache");

export async function GET(req: NextRequest) {
	const data = await getLatestData();

	if (data == null) {
		return new NextResponse(
			JSON.stringify({ error: "Failed to get users" }),
			{ status: 500 },
		);
	}

	return new NextResponse(JSON.stringify(data), {
		status: 200,
	});
}
