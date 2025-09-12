import { assertEquals } from "@std/assert";
import { parse, textContent } from "../src/index.ts";

Deno.test("textContent", async (t) => {
	await t.step("extracts text from simple element", () => {
		const doc = parse("<p>Hello world</p>");
		assertEquals(textContent(doc), "Hello world");
	});

	await t.step("extracts text from nested elements", () => {
		const doc = parse(
			"<div><h1>Title</h1><p>Paragraph with <span>nested</span> text</p></div>",
		);
		assertEquals(textContent(doc), "TitleParagraph with nested text");
	});

	await t.step("handles br elements as newlines", () => {
		const doc = parse("<div>Before<br>After</div>");
		assertEquals(textContent(doc), "Before\nAfter");
	});

	await t.step("handles multiple br elements", () => {
		const doc = parse("<div>Line 1<br><br>Line 3</div>");
		assertEquals(textContent(doc), "Line 1\n\nLine 3");
	});

	await t.step("returns empty string for elements with no text", () => {
		const doc = parse(`<div><img src="test.jpg"><input type="text"></div>`);
		assertEquals(textContent(doc), "");
	});

	await t.step("handles mixed content", () => {
		const doc = parse(
			"<div>Text<span>More text</span><br>After break<!-- comment --></div>",
		);
		assertEquals(textContent(doc), "TextMore text\nAfter break");
	});

	await t.step("works with plain text nodes", () => {
		const doc = parse("Just plain text");
		assertEquals(textContent(doc), "Just plain text");
	});

	await t.step("handles empty document", () => {
		const doc = parse("");
		assertEquals(textContent(doc), "");
	});

	await t.step("ignores comments", () => {
		const doc = parse("<p>Before<!-- this is a comment -->After</p>");
		assertEquals(textContent(doc), "BeforeAfter");
	});

	await t.step("works with deeply nested structure", () => {
		const doc = parse(`
			<article>
				<header>
					<h1>Article Title</h1>
					<time>2023-01-01</time>
				</header>
				<section>
					<p>First paragraph with <em>emphasis</em> and <strong>strong</strong> text.</p>
					<p>Second paragraph<br>with line break.</p>
				</section>
			</article>
		`);
		const result = textContent(doc);
		assertEquals(
			result,
			"\n\t\t\t\n\t\t\t\t\n\t\t\t\t\tArticle Title\n\t\t\t\t\t2023-01-01\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t\tFirst paragraph with emphasis and strong text.\n\t\t\t\t\tSecond paragraph\nwith line break.\n\t\t\t\t\n\t\t\t\n\t\t",
		);
	});
});
