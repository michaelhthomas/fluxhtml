import {
	DOCUMENT_NODE,
	DOCTYPE_NODE,
	ELEMENT_NODE,
	TEXT_NODE,
	COMMENT_NODE,
	type Location,
	type NodeType,
} from "./nodes.ts";
import { Parser } from "htmlparser2";

export * from "./nodes.ts";

// #region constants
const VOID_TAGS = new Set<string>([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"keygen",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);
const ESCAPE_CHARS: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
};
// #endregion constants

// #region symbols
export const Fragment = Symbol("Fragment");

const HTMLString = Symbol("HTML String");
const AttrString = Symbol("AttrString");
type MarkedString = { value: string; [key: symbol]: true };
/**
 * Marks a given string with the provided symbols.
 * @param str String to mark
 * @param tags Symbols to tag the string with
 * @returns
 */
function mark(str: string): UnsafeHTML;
function mark(str: string, tags: symbol[]): MarkedString;
function mark(str: string, tags?: symbol[]): MarkedString {
	const v = { value: str };
	const tagsVal = tags ?? [HTMLString];
	for (const tag of tagsVal) {
		Object.defineProperty(v, tag, {
			value: true,
			enumerable: false,
			writable: false,
		});
	}
	return v;
}

export type UnsafeHTML = { value: string; [HTMLString]: true };
function isUnsafe(val?: unknown): val is UnsafeHTML {
	return (
		val != null &&
		typeof val === "object" &&
		HTMLString in val &&
		val[HTMLString] === true &&
		"value" in val
	);
}

export const RenderFn = Symbol("Render function");
export type RenderFunction = (
	attributes: Record<string, string>,
	children: Node[],
) => string | UnsafeHTML | Promise<string | UnsafeHTML>;
// #endregion symbols

// #region nodes
type BaseNode = {
	type: NodeType;
	loc: Location;
	parent: Node;
};

type LiteralNode = BaseNode & {
	value: string;
};

type ParentNode = BaseNode & {
	children: Node[];
};

export type DocumentNode = {
	type: typeof DOCUMENT_NODE;
	children: Node[];
};

export type ElementNode = ParentNode & {
	type: typeof ELEMENT_NODE;
	name: string | typeof Fragment;
	attributes: Record<string, string>;
	[RenderFn]?: RenderFunction;
};

export type TextNode = LiteralNode & {
	type: typeof TEXT_NODE;
};

export type CommentNode = LiteralNode & {
	type: typeof COMMENT_NODE;
};

export type DoctypeNode = LiteralNode & {
	type: typeof DOCTYPE_NODE;
};

export type Node =
	| DocumentNode
	| ElementNode
	| TextNode
	| CommentNode
	| DoctypeNode;
// #endregion nodes

// #region parsing
/**
 * Parses the provided HTML-like document into an AST.
 * @param html A string of HTML-like markup.
 * @returns The parsed document.
 */
export function parse(html: string): DocumentNode {
	const doc: DocumentNode = {
		type: DOCUMENT_NODE,
		children: [],
	};
	let currentNode: DocumentNode | ElementNode = doc;
	const stack: (DocumentNode | ElementNode)[] = [];

	const parser = new Parser(
		{
			onprocessinginstruction(name, data) {
				if (name === "!doctype") {
					const element: DoctypeNode = {
						type: DOCTYPE_NODE,
						value: data,
						parent: currentNode,
						loc: { start: parser.startIndex, end: parser.endIndex },
					};

					// Add the element as a child of the current node
					currentNode.children.push(element);
				}
			},
			onopentag(name, attributes) {
				const element: ElementNode = {
					type: ELEMENT_NODE,
					name,
					attributes,
					parent: currentNode,
					loc: { start: parser.startIndex, end: parser.endIndex },
					children: [],
				};

				// Add the element as a child of the current node
				currentNode.children.push(element);

				// Push the current node to the stack and make this element the new current node
				stack.push(currentNode);
				currentNode = element;
			},
			ontext(text) {
				const textNode: TextNode = {
					type: TEXT_NODE,
					loc: { start: parser.startIndex, end: parser.endIndex },
					parent: currentNode,
					value: text,
				};
				// Add the text node to the current node's children
				currentNode.children.push(textNode);
			},
			oncomment(comment) {
				const commentNode: CommentNode = {
					type: COMMENT_NODE,
					loc: { start: parser.startIndex, end: parser.endIndex },
					parent: currentNode,
					value: comment,
				};
				// Add the text node to the current node's children
				currentNode.children.push(commentNode);
			},
			onclosetag() {
				// Once the tag is closed, pop the stack to return to the previous node
				currentNode = stack.pop() ?? doc;
			},
		},
		{ decodeEntities: true },
	);

	parser.write(html);
	parser.end();

	return doc;
}
// #endregion parsing

// #region unsafe
/**
 * Marks the given string as "unsafe," preventing it from being escaped/sanitized
 * when the document is rendered.
 * @param str A string of text.
 * @returns A marked token indicating that the given text should not be escaped.
 */
export function __unsafeHTML(str: string): UnsafeHTML {
	return mark(str);
}

/**
 * Assigns a custom render function to the given node.
 * @param node Node to assign a custom render function.
 * @param fn Render function.
 */
export function __unsafeRenderFn(node: ElementNode, fn: RenderFunction): ElementNode {
	Object.defineProperty(node, RenderFn, {
		value: fn,
		enumerable: false,
	});
	return node;
}
// #endregion unsafe

// #region rendering
function escapeHTML(str: string): string {
	return str.replace(/[&<>]/g, (c) => ESCAPE_CHARS[c] || c);
}
function attrs(attributes: Record<string, string>) {
	let attrStr = "";
	for (const [key, value] of Object.entries(attributes)) {
		attrStr += ` ${key}="${value}"`;
	}
	return mark(attrStr, [HTMLString, AttrString]);
}

function canSelfClose(node: ElementNode): boolean {
	if (node.children.length === 0) {
		let n: Node | undefined = node;
		while (n?.type === ELEMENT_NODE) {
			if (n.name === "svg") return true;
			n = n.parent;
		}
	}
	return false;
}

function renderElementSync(node: ElementNode): string {
	const { name, attributes = {}, children } = node;
	if (RenderFn in node && node[RenderFn] != null) {
		const value = node[RenderFn](attributes, children);
		if (value instanceof Promise)
			throw new Error(
				"Called renderElementSync on a tree containing async elements.",
			);
		if (isUnsafe(value)) return value.value;
		return escapeHTML(String(value));
	}
	const childContent = renderSync(children);
	if (name === Fragment) return childContent;
	const isSelfClosing = canSelfClose(node);
	if (isSelfClosing || VOID_TAGS.has(name)) {
		return `<${name}${attrs(attributes).value}${isSelfClosing ? " /" : ""}>`;
	}
	return `<${name}${attrs(attributes).value}>${childContent}</${name}>`;
}

async function renderElement(node: ElementNode): Promise<string> {
	const { name, attributes = {}, children } = node;
	if (RenderFn in node && node[RenderFn] != null) {
		const value = await node[RenderFn](attributes, children);
		if (isUnsafe(value)) return value.value;
		return escapeHTML(String(value));
	}
	const childContent = await render(children);
	if (name === Fragment) return childContent;
	const isSelfClosing = canSelfClose(node);
	if (isSelfClosing || VOID_TAGS.has(name)) {
		return `<${name}${attrs(attributes).value}${isSelfClosing ? " /" : ""}>`;
	}
	return `<${name}${attrs(attributes).value}>${childContent}</${name}>`;
}

function renderLeaf(node: TextNode | CommentNode | DoctypeNode) {
	switch (node.type) {
		case TEXT_NODE:
			return `${node.value}`;
		case COMMENT_NODE:
			return `<!--${node.value}-->`;
		case DOCTYPE_NODE:
			return `<${node.value}>`;
	}
}

/**
 * Serializes the given node to a string.
 * @param node
 * @returns
 */
export async function render(node: Node | Node[]): Promise<string> {
	if (Array.isArray(node))
		return Promise.all(node.map((child) => render(child))).then((res) =>
			res.join(""),
		);
	switch (node.type) {
		case DOCUMENT_NODE:
			return await render(node.children);
		case ELEMENT_NODE:
			return await renderElement(node);
		default:
			return renderLeaf(node);
	}
}

export function renderSync(node: Node | Node[]): string {
	if (Array.isArray(node))
		return node.map((child) => renderSync(child)).join("");
	switch (node.type) {
		case DOCUMENT_NODE:
			return renderSync(node.children);
		case ELEMENT_NODE:
			return renderElementSync(node);
		default:
			return renderLeaf(node);
	}
}
// #endregion rendering
