import { build, emptyDir } from "jsr:@deno/dnt";
import { expandGlobSync } from "jsr:@std/fs@1/expand-glob";
import packageJson from "../package.json" with { type: "json" };

await emptyDir("./npm");

await build({
	test: false,
	entryPoints: [
		"./src/index.ts",
		{ name: "./selector", path: "./src/selector.ts" },
		...Array.from(expandGlobSync("./src/transformers/*.ts")).map((ent) => ({
			name: `./transformers/${ent.name.split(".")[0]}`,
			path: ent.path,
		})),
	],
	outDir: "./npm",
	shims: {
		deno: true,
	},
	package: packageJson,
	postBuild() {
		// steps to run after building and before running the tests
		Deno.copyFileSync("LICENSE", "npm/LICENSE");
		Deno.copyFileSync("README.md", "npm/README.md");
	},
});
