import {
	type ElementNode,
	ELEMENT_NODE,
	parse,
	renderSync,
} from "../src/index.ts";
import { describe, it, test } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

test("sanity", () => {
	expect(typeof renderSync).toBe("function");
});

describe("input === output", () => {
	it("works for elements", () => {
		const input = "<h1>Hello world!</h1>";
		const output = renderSync(parse(input));
		expect(output).toEqual(input);
	});
	it("works for custom elements", () => {
		const input = "<custom-element>Hello world!</custom-element>";
		const output = renderSync(parse(input));
		expect(output).toEqual(input);
	});
	it("works for comments", () => {
		const input = "<!--foobar-->";
		const output = renderSync(parse(input));
		expect(output).toEqual(input);
	});
	it("works for text", () => {
		const input = "Hmm...";
		const output = renderSync(parse(input));
		expect(output).toEqual(input);
	});
	it("works for doctype", () => {
		const input = "<!DOCTYPE html>";
		const output = renderSync(parse(input));
		expect(output).toEqual(input);
	});
	it("works for html:5", () => {
		const input = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Document</title></head><body></body></html>`;
		const output = renderSync(parse(input));

		expect(output).toEqual(input);
	});
});

describe("attributes", () => {
	it("simple", () => {
		const {
			children: [el],
		} = parse(`<div a="b" c="1"></div>`);

		expect(el.type).toBe(ELEMENT_NODE);
		expect((el as ElementNode).attributes).toMatchObject({ a: "b", c: "1" });
	});
	it("empty", () => {
		const {
			children: [el],
		} = parse("<div test></div>");

		expect(el.type).toBe(ELEMENT_NODE);
		expect((el as ElementNode).attributes).toMatchObject({ test: "" });
	});
	it("@", () => {
		const {
			children: [el],
		} = parse(`<div @on.click="doThing"></div>`);

		expect(el.type).toBe(ELEMENT_NODE);
		expect((el as ElementNode).attributes).toMatchObject({
			"@on.click": "doThing",
		});
	});
	it("namespace", () => {
		const {
			children: [el],
		} = parse(`<div on:click="alert()"></div>`);

		expect(el.type).toBe(ELEMENT_NODE);
		expect((el as ElementNode).attributes).toMatchObject({
			"on:click": "alert()",
		});
	});
	it("simple and empty", () => {
		const {
			children: [el],
		} = parse(`<div test a="b" c="1"></div>`);

		expect(el.type).toBe(ELEMENT_NODE);
		expect((el as ElementNode).attributes).toMatchObject({
			test: "",
			a: "b",
			c: "1",
		});
	});
	it("with linebreaks", () => {
		const {
			children: [el],
		} = parse(`<div a="1
2
3"></div>`);

		expect(el.type).toBe(ELEMENT_NODE);
		expect((el as ElementNode).attributes).toMatchObject({ a: "1\n2\n3" });
	});
	it("with single quote", () => {
		const {
			children: [el],
		} = parse(`<div a="nate'
s"></div>`);

		expect(el.type).toBe(ELEMENT_NODE);
		expect((el as ElementNode).attributes).toMatchObject({ a: "nate'\ns" });
	});
});
