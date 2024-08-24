const secret = "dcumwoidaksdjlkajsd";

function hexStrToUuid(hexStr: string) {
	return [
		hexStr.substring(0, 8),
		hexStr.substring(8, 12),
		hexStr.substring(12, 16),
		hexStr.substring(16, 20),
		hexStr.substring(20, 32),
	].join("-");
}

const handler = async (req: Request): Promise<Response> => {
	if (
		req.method != "PUT" ||
		req.body == null ||
		req.headers.get("Authorization") != "Bearer " + secret
	) {
		return new Response("bad req", { status: 400 });
	}

	const combinedHex = await req.text();

	for (let i = 0; i < combinedHex.length; i += 32) {
		const uuid = hexStrToUuid(combinedHex.substring(i, i + 32));
		console.log(uuid);
	}

	return new Response("yis", { status: 200 });
};

console.log(`HTTP server running. Access it at: http://localhost:4845/`);
Deno.serve({ port: 4845 }, handler);
