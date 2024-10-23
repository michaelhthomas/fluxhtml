import { parse, render, renderSync } from "../src/index.ts";
import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

describe("svg", () => {
	it("render as self-closing", async () => {
		const input = `<svg><path d="0 0 0" /></svg>`;
		const output = await render(parse(input));
		expect(output).toEqual(input);
	});
	it("renderSync as self-closing", () => {
		const input = `<svg><path d="0 0 0" /></svg>`;
		const output = renderSync(parse(input));
		expect(output).toEqual(input);
	});
});
