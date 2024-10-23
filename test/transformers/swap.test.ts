import { html, transform, type RenderFunction } from "../../src/index.ts";
import swap, { type SwapComponents } from "../../src/transformers/swap.ts";
import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

describe("swap HTML api", () => {
	it("function for element", async () => {
		const components: SwapComponents = {
			h1: (_, children) => html`<span>${children}</span>`,
		};
		const input = "<h1>Hello world!</h1>";
		const output = await transform(input, [swap(components)]);
		expect(output).toEqual("<span>Hello world!</span>");
	});
	it("function for component", async () => {
		const components: SwapComponents = {
			Title: (_, children) => html`<h1>${children}</h1>`,
		};
		const input = "<Title>Hello world!</Title>";
		const output = await transform(input, [swap(components)]);
		expect(output).toEqual("<h1>Hello world!</h1>");
	});
	it("string for element to Component", async () => {
		const components: SwapComponents = {
			h1: "Title",
			Title: (_, children) => html`<span>${children}</span>`,
		};
		const input = "<h1>Hello world!</h1>";
		const output = await transform(input, [swap(components)]);
		expect(output).toEqual("<span>Hello world!</span>");
	});
	it("string for element to Component", async () => {
		const components: SwapComponents = {
			h1: "Title",
			Title: (_, children) => html`<span>${children}</span>`,
		};
		const input = "<h1>Hello world!</h1>";
		const output = await transform(input, [swap(components)]);
		expect(output).toEqual("<span>Hello world!</span>");
	});
	it("async Component", async () => {
		const components: SwapComponents = {
			// deno-lint-ignore require-await
			Title: async (_, children) => html`<span>${children}</span>`,
		};
		const input = "<Title>Hello world!</Title>";
		const output = await transform(input, [swap(components)]);
		expect(output).toEqual("<span>Hello world!</span>");
	});

	it("readme example", async () => {
		const Title: RenderFunction = (props, children) =>
			html`<h1 class="ultra" ...${props}>${children}</h1>`;
		const output = await transform("<h1>Hello world!</h1>", [
			swap({ h1: Title }),
		]);
		expect(output).toEqual(`<h1 class="ultra">Hello world!</h1>`);
	});
	it("transforms custom components", async () => {
		const CustomElement: RenderFunction = (props, children) =>
			html`<custom-element class="ultra" ...${props}>${children}</custom-element>`;
		const output = await transform(
			"<custom-element>Hello world!</custom-element>",
			[swap({ "custom-element": CustomElement })],
		);
		expect(output).toEqual(
			`<custom-element class="ultra">Hello world!</custom-element>`,
		);
	});
});
