import { Express } from "express";
import * as fs from "fs/promises";
import * as path from "path";
import sirv from "sirv";
import type { ViteDevServer } from "vite";
import { getDirname, isProduction } from "./utils";

const __dirname = getDirname(import.meta);

export async function initFrontend(app: Express) {
	const distPath = path.resolve(__dirname, "../dist");

	const distClientPath = path.resolve(distPath, "client");
	const distTemplatePath = path.resolve(distClientPath, "index.html");
	const distSsrManifest = path.resolve(
		distClientPath,
		".vite/ssr-manifest.json",
	);

	const distServerImport = path.resolve(distPath, "server/entry-server.js");

	const templateHtml = isProduction
		? await fs.readFile(distTemplatePath, "utf-8")
		: "";

	const ssrManifest = isProduction
		? await fs.readFile(distSsrManifest, "utf-8")
		: undefined;

	let vite: ViteDevServer;

	if (isProduction) {
		app.use("/", sirv(distClientPath, { extensions: [] }));
	} else {
		const createViteServer = (await import("vite")).createServer;
		vite = await createViteServer({
			server: { middlewareMode: true },
			appType: "custom",
		});
		app.use(vite.middlewares);
	}

	app.use("*", async (req, res, next) => {
		const url = req.originalUrl;

		try {
			let template = "";
			let render: (
				url: string,
				ssr: string | undefined,
			) => Promise<{ head: string; html: string }>;

			if (isProduction) {
				template = templateHtml;
				render = (await import(distServerImport)).render;
			} else {
				template = await fs.readFile(
					path.resolve(__dirname, "../index.html"),
					"utf-8",
				);
				template = await vite.transformIndexHtml(url, template);
				render = (
					await vite.ssrLoadModule("/frontend/entry-server.tsx")
				).render;
			}

			const rendered = await render(url, ssrManifest);

			const html = template
				.replace(`<!--app-head-->`, rendered.head ?? "")
				.replace(`<!--app-html-->`, rendered.html ?? "");

			res.status(200).set({ "Content-Type": "text/html" }).end(html);
		} catch (e) {
			vite?.ssrFixStacktrace(e);
			console.log(e.stack);
			res.status(500).end(e.stack);
		}
	});
}
