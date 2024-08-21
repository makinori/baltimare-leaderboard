import * as path from "path";
import { fileURLToPath } from "url";

export const isProduction = process.env.NODE_ENV == "production";

export function getDirname(importMeta: ImportMeta) {
	return path.dirname(fileURLToPath(importMeta.url));
}
