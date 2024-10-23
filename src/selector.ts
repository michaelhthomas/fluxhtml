import { is, selectOne, selectAll, type Options } from "css-select";
import {
	DOCUMENT_NODE,
	ELEMENT_NODE,
	Fragment,
	hasChildren,
	TEXT_NODE,
	type ElementNode,
	type Node,
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

export function matches(node: ElementNode, selector: string): boolean {
	return is(node, selector, options);
}

export function querySelector(
	node: Node,
	selector: string,
): ElementNode | null {
	return selectOne(selector, node, options);
}

export function querySelectorAll(node: Node, selector: string): ElementNode[] {
	return selectAll(selector, node, options);
}
