import { type ElementNode, RenderFn, type RenderFunction } from "../index.ts";
import { type Node, __unsafeRenderFn } from "../index.ts";
import { querySelectorAll } from "../selector.ts";

export type SwapComponents = Record<string, string | RenderFunction>;

/**
 * Using the provided dictionary of components, swaps elements matching each
 * selector (in order) with the provided replacement.
 *
 * If a string is provided as the replacement value, then the tag name will
 * simply be swapped, and all attributes preserved. For example, applying
 * `swap({ 'h1': 'h2' })` on the following document:
 * ```html
 * <h1 class="test">Hello world!</h1>
 * ```
 * would produce the following result:
 * ```html
 * <h2 class="test">Hello world!</h2>
 * ```
 *
 * Alternatively, a render function can be supplied as the replacement value,
 * providing considerably more flexibility. For a simple example, applying
 * ```ts
 * swap({ 'Title': (_, children) => html`<span class="bold">${children}</span>` })
 * ```
 * on the following document:
 * ```html
 * <Title>Hello world!</Title>
 * ```
 * would produce the following result:
 * ```html
 * <span class="bold">Hello world!</span>
 * ```
 *
 * @param components A dictionary whose keys are CSS selectors and whose values
 *                   are either string tag names or render functions.
 * @returns An AST transformer
 */
export default function swap(components: SwapComponents = {}) {
	return (doc: Node): Node => {
		for (const [selector, component] of Object.entries(components)) {
			for (const node of querySelectorAll(doc, selector)) {
				if (typeof component === "string") {
					node.name = component;
					if (RenderFn in node) {
						delete node[RenderFn];
					}
				} else if (typeof component === "function") {
					__unsafeRenderFn(node as ElementNode, component);
				}
			}
		}
		return doc;
	};
}
