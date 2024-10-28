import { Parser, type ParserOptions } from "htmlparser2";

// #region constants
export const DOCUMENT_NODE = 0;
export const ELEMENT_NODE = 1;
export const TEXT_NODE = 2;
export const COMMENT_NODE = 3;
export const DOCTYPE_NODE = 4;

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
/**
 * An element which will not be rendered, and will be replaced by its children.
 */
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
export type NodeType =
	| typeof DOCUMENT_NODE
	| typeof ELEMENT_NODE
	| typeof TEXT_NODE
	| typeof COMMENT_NODE
	| typeof DOCTYPE_NODE;

export type Location = {
	start: number;
	end: number;
};

const NodeSymbol = Symbol("Node");

type BaseNode = {
	[NodeSymbol]: true;
	type: NodeType;
	loc: Location;
	parent: NodeWithChildren;
};

type LiteralNode = BaseNode & {
	value: string;
};

type ParentNode = BaseNode & {
	children: Node[];
};

/**
 * Node representing the root of a parsed document.
 */
export type DocumentNode = {
	[NodeSymbol]: true;
	type: typeof DOCUMENT_NODE;
	children: Node[];
	parent: undefined;
};

/**
 * Node representing an HTML element in the DOM.
 */
export type ElementNode = ParentNode & {
	type: typeof ELEMENT_NODE;
	name: string | typeof Fragment;
	attributes: Record<string, string>;
	[RenderFn]?: RenderFunction;
};

/**
 * Node representing plain text in the DOM.
 */
export type TextNode = LiteralNode & {
	type: typeof TEXT_NODE;
};

/**
 * Node representing an HTML comment.
 */
export type CommentNode = LiteralNode & {
	type: typeof COMMENT_NODE;
};

/**
 * Node representing an HTML doctype declaration.
 */
export type DoctypeNode = LiteralNode & {
	type: typeof DOCTYPE_NODE;
};

/**
 * Type representing any node in the DOM. To determine the type of a node,
 * compare `node.type` to one of the exported node type constants.
 *
 * For example, to determine if a node is an element, use a guard as follows:
 * ```ts
 * if (node.type === ELEMENT_NODE) {
 *   // node is `ElementNode`
 * }
 */
export type Node =
	| DocumentNode
	| ElementNode
	| TextNode
	| CommentNode
	| DoctypeNode;

function isNode(obj: unknown): obj is Node {
	return (
		typeof obj === "object" &&
		obj != null &&
		NodeSymbol in obj &&
		obj[NodeSymbol] === true
	);
}
/**
 * Type representing any node which has child nodes.
 */
export type NodeWithChildren = DocumentNode | ElementNode;
/**
 * Checks if a given node has children.
 */
export function hasChildren(node: Node): node is NodeWithChildren {
	return "children" in node && Array.isArray(node.children);
}
// #endregion nodes

// #region parsing
/**
 * Parses the provided HTML-like document into an AST.
 * @param html A string of HTML-like markup.
 * @returns The parsed document.
 */
export function parse(
	html: string,
	options: ParserOptions = {
		decodeEntities: false,
		lowerCaseTags: false,
	},
): DocumentNode {
	const doc: DocumentNode = {
		[NodeSymbol]: true,
		type: DOCUMENT_NODE,
		children: [],
		parent: undefined,
	};
	let currentNode: DocumentNode | ElementNode = doc;
	const stack: (DocumentNode | ElementNode)[] = [];

	const parser = new Parser(
		{
			onprocessinginstruction(name, data) {
				if (name.toLowerCase() === "!doctype") {
					const element: DoctypeNode = {
						[NodeSymbol]: true,
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
					[NodeSymbol]: true,
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
					[NodeSymbol]: true,
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
					[NodeSymbol]: true,
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
		options,
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
export function __unsafeRenderFn(
	node: ElementNode,
	fn: RenderFunction,
): ElementNode {
	Object.defineProperty(node, RenderFn, {
		value: fn,
		enumerable: false,
	});
	return node;
}
// #endregion unsafe

// #region walk
export type Visitor = (
	node: Node,
	parent?: NodeWithChildren,
	index?: number,
) => void | Promise<void>;

export type VisitorSync = (
	node: Node,
	parent?: NodeWithChildren,
	index?: number,
) => void;

/**
 * Traverse the AST of the provided node, running an asynchronous callback for
 * each visited node. Nodes are traversed in depth-first order.
 * @param node AST to walk
 * @param callback Function to be applied on each encountered node
 */
export function walk(node: Node, callback: Visitor): Promise<void> {
	async function visit(node: Node, parent?: NodeWithChildren, index?: number) {
		await callback(node, parent, index);
		if (hasChildren(node)) {
			await Promise.all(node.children.map((child, i) => visit(child, node, i)));
		}
	}
	return visit(node);
}

/**
 * Traverse the AST of the provided node, running a synchronous callback for
 * each visited node. Nodes are traversed in depth-first order.
 * @param node AST to walk
 * @param callback Function to be applied on each encountered node
 */
export function walkSync(node: Node, callback: VisitorSync): void {
	function visit(node: Node, parent?: NodeWithChildren, index?: number) {
		callback(node, parent, index);
		if (hasChildren(node)) {
			node.children.map((child, i) => visit(child, node, i));
		}
	}
	visit(node);
}
// #endregion walk

// #region rendering
function escapeHTML(str: string): string {
	return str.replace(/[&<>]/g, (c) => ESCAPE_CHARS[c] || c);
}
/**
 * Converts a given set of attributes into an HTML string.
 */
export function attrs(attributes: Record<string, string>): MarkedString {
	let attrStr = "";
	for (const [key, value] of Object.entries(attributes)) {
		attrStr += ` ${key}="${value}"`;
	}
	return mark(attrStr, [HTMLString, AttrString]);
}

/**
 * Template function which enables authoring render functions using HTML-like strings.
 *
 * This is best demonstrated using the `swap` transformer. Consider the
 * following example:
 * ```ts
 * const output = await transform(`<h1>Hello world!</h1>`, [
 *   swap({
 *     h1: (props, children) => html`<h2 class="ultra">${children}</h2>`,
 *   }),
 * ]);
 * console.log(output);
 * // <h2 class="ultra">Hello world!</h2>
 * ```
 */
export function html(
	tmpl: TemplateStringsArray,
	...vals: (string | MarkedString | Record<string, string> | Node | Node[])[]
): UnsafeHTML {
	let buf = "";
	for (let i = 0; i < tmpl.length; i++) {
		buf += tmpl[i];
		const expr = vals[i];
		// node or list of nodes
		if (Array.isArray(expr) || isNode(expr)) {
			buf += renderSync(expr);
		}
		// attributes spread
		else if (buf.endsWith("...") && expr && typeof expr === "object") {
			buf = buf.slice(0, -3).trimEnd();
			buf += attrs(expr).value;
		}
		// attributes
		else if (
			typeof expr === "object" &&
			AttrString in expr &&
			expr[AttrString]
		) {
			buf = buf.trimEnd();
			buf += expr.value;
		}
		// unsafe HTML
		else if (isUnsafe(expr)) {
			buf += expr.value;
		}
		// string
		else if (typeof expr === "string") {
			buf += escapeHTML(expr);
		} else if (expr || expr === 0) {
			buf += String(expr);
		}
	}
	return mark(buf);
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
		if (value instanceof Promise) {
			throw new Error(
				"Called renderElementSync on a tree containing async elements.",
			);
		}
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
 * @param node The node or list of nodes to serialize
 * @returns A string of HTML
 */
export async function render(node: Node | Node[]): Promise<string> {
	if (Array.isArray(node)) {
		return Promise.all(node.map((child) => render(child))).then((res) =>
			res.join(""),
		);
	}
	switch (node.type) {
		case DOCUMENT_NODE:
			return await render(node.children);
		case ELEMENT_NODE:
			return await renderElement(node);
		default:
			return renderLeaf(node);
	}
}

/**
 * Serializes the given node to a string synchronously.
 * @param node The node or list of nodes to serialize
 * @returns A string of HTML
 * @throws If an asynchronous render function is encountered
 */
export function renderSync(node: Node | Node[]): string {
	if (Array.isArray(node)) {
		return node.map((child) => renderSync(child)).join("");
	}
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

// #region transform
export type Transformer = (node: Node) => Node | Promise<Node>;
export type TransformerSync = (node: Node) => Node;

/**
 * Transforms the given markup using the supplied transformers, then renders
 * the resulting document.
 *
 * @param markup The markup to be transformed. Either a string, or an already-parsed AST
 * @param transformers The set of transformers to apply to the document
 * @returns String containing the transformed markup
 */
export async function transform(
	markup: string | Node,
	transformers: Transformer[] = [],
): Promise<string> {
	if (!Array.isArray(transformers)) {
		throw new Error(
			`Invalid second argument for \`transform\`! Expected \`Transformer[]\` but got \`${typeof transformers}\``,
		);
	}
	const doc = typeof markup === "string" ? parse(markup) : markup;
	let newDoc = doc;
	for (const t of transformers) {
		newDoc = await t(newDoc);
	}
	return render(newDoc);
}

/**
 * Transforms the given markup using the supplied synchronous transformers,
 * then renders the resulting document.
 *
 * @param markup The markup to be transformed. Either a string, or an already-parsed AST.
 * @param transformers The set of transformers to apply to the document
 * @returns String containing the transformed markup
 * @throws If the transformed document contains asynchronous elements
 */
export function transformSync(
	markup: string | Node,
	transformers: TransformerSync[] = [],
): string {
	if (!Array.isArray(transformers)) {
		throw new Error(
			`Invalid second argument for \`transform\`! Expected \`Transformer[]\` but got \`${typeof transformers}\``,
		);
	}
	const doc = typeof markup === "string" ? parse(markup) : markup;
	let newDoc = doc;
	for (const t of transformers) {
		newDoc = t(newDoc);
	}
	return renderSync(newDoc);
}
// #endregion
