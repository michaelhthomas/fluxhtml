/**
 * @module
 * Provides functionality for executing CSS selectors on markup nodes.
 *
 * @example
 * ```ts
 * const doc = parse("<div><h1>Hello world</h1></div>");
 * const el = querySelector(doc, "h1");
 * console.log(await render(el));
 * // <h1>Hello world</h1>
 * ```
 */

import { type Options, is, selectAll, selectOne } from "css-select";
import {
	DOCUMENT_NODE,
	ELEMENT_NODE,
	type ElementNode,
	Fragment,
	type Node,
	TEXT_NODE,
	hasChildren,
} from "./index.ts";

type Adapter<Node, ElementNode extends Node> = Options<
	Node,
	ElementNode
>["adapter"];
const astAdapter: Adapter<Node, ElementNode> = {
	isTag(node) {
		return node.type === ELEMENT_NODE;
	},
	existsOne(test, nodes) {
		return nodes.some(
			(checked) =>
				this.isTag(checked) &&
				(test(checked) || this.existsOne(test, checked.children)),
		);
	},
	getAttributeValue(node, name) {
		return node.attributes[name];
	},
	getChildren: (node) => (hasChildren(node) ? node.children : []),
	getName: (node) => (node.name === Fragment ? "" : node.name),
	getParent: (node) => node.parent,
	getSiblings: (node) =>
		node.type === DOCUMENT_NODE ? [node] : node.parent.children,
	getText(node) {
		if (node.type === ELEMENT_NODE && node.name === "br") return "\n";
		if (hasChildren(node)) return node.children.map(this.getText).join("");
		if (node.type === TEXT_NODE) return node.value;
		return "";
	},
	hasAttrib: (node, name) => Object.hasOwn(node.attributes, name),
	removeSubsets(nodes) {
		let idx = nodes.length;

		while (--idx >= 0) {
			const node = nodes[idx];

			if (idx > 0 && nodes.lastIndexOf(node, idx - 1) >= 0) {
				nodes.splice(idx, 1);
				continue;
			}

			for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
				if (nodes.includes(ancestor)) {
					nodes.splice(idx, 1);
					break;
				}
			}
		}

		return nodes;
	},
	findAll(test, nodes) {
		return nodes
			.filter(hasChildren)
			.flatMap((n) =>
				(this.isTag(n) && test(n) ? [n] : []).concat(
					this.findAll(test, n.children),
				),
			);
	},
	findOne(test, nodes) {
		let elem = null;

		for (let i = 0; i < nodes.length && !elem; i++) {
			const node = nodes[i];
			if (this.isTag(node) && test(node)) {
				elem = node;
			} else if (hasChildren(node) && node.children.length > 0) {
				elem = this.findOne(test, node.children);
			}
		}

		return elem;
	},
};

const options: Options<Node, ElementNode> = {
	adapter: astAdapter,
	xmlMode: true,
};

/**
 * Checks if the given selector matches the given node.
 * @param node The node to test against
 * @param selector The selector to test on the node
 * @returns `true` if the selector matches the provided node, `false` otherwise
 */
export function matches(node: ElementNode, selector: string): boolean {
	return is(node, selector, options);
}

/**
 * Equivalent to the DOM `document.querySelector` method. Executes the given
 * selector on the provided node and its children.
 * @param node The node to query
 * @param selector The selector to test nodes against
 * @returns The first node which matches the given selector, or `null` if no
 *          nodes match
 */
export function querySelector(
	node: Node,
	selector: string,
): ElementNode | null {
	return selectOne(selector, node, options);
}

/**
 * Equivalent to the DOM `document.querySelectorAll` method. Executes the
 * given selector on the provided node and its children.
 * @param node The node to query
 * @param selector The selector to test nodes against
 * @returns A list of nodes that match the given selector
 */
export function querySelectorAll(node: Node, selector: string): ElementNode[] {
	return selectAll(selector, node, options);
}
