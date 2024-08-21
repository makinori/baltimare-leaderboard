import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import * as path from "path";

export default defineConfig({
	publicDir: path.resolve(__dirname, "./frontend/static"),
	build: {
		emptyOutDir: true,
		rollupOptions: {
			input: {
				index: path.resolve(__dirname, "index.html"),
			},
		},
	},
	plugins: [
		react({
			jsxImportSource: "@emotion/react",
			babel: {
				plugins: ["@emotion/babel-plugin"],
			},
		}),
	],
});
