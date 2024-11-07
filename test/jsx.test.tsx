/** @jsxImportSource $self */

import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";
import { render } from "../src/index.ts";

describe("jsx", () => {
	it("works", async () => {
		const value = await render(<h1>Hello world!</h1>);
		expect(value).toEqual("<h1>Hello world!</h1>");
	});
	it("escapes", async () => {
		const value = await render(<h1>{"<div></div>"}</h1>);
		expect(value).toEqual("<h1>&lt;div&gt;&lt;/div&gt;</h1>");
	});
	it("nested", async () => {
		const value = await render(<h1>{<div />}</h1>);
		expect(value).toEqual("<h1><div></div></h1>");
	});
	it("attrs", async () => {
		// biome-ignore lint/a11y/useHeadingContent: test
		const value = await render(<h1 hey="ya" />);
		expect(value).toEqual(`<h1 hey="ya"></h1>`);
	});
	it("spread", async () => {
		const value = await render(<h1 {...{ hey: "ya" }} />);
		expect(value).toEqual(`<h1 hey="ya"></h1>`);
	});
});
