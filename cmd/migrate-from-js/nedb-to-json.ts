import Datastore from "npm:@seald-io/nedb";

if (Deno.args.length < 2) {
	console.log("usage: <input path> <json>");
	Deno.exit(1);
}

const inputPath = Deno.args[0];
const outputPath = Deno.args[1];

try {
	await Deno.stat(inputPath);
} catch {
	console.log("input file missing");
	Deno.exit(1);
}

const db = new Datastore({ filename: inputPath });
await db.loadDatabaseAsync();

const docs = await db.findAsync({});
const json = JSON.stringify(docs);

await Deno.writeTextFile(outputPath, json);
console.log("written " + docs.length + " docs to " + outputPath);
