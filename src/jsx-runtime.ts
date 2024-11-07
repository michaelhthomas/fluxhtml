import { Fragment, createVNode } from "./index.ts";

// deno-lint-ignore no-namespace
export namespace JSX {
	export interface IntrinsicElements {
		[elemName: string]: unknown;
	}
	export interface ElementClass {
		render: unknown;
	}
	export interface ElementChildrenAttribute {
		children: unknown;
	}
}

export {
	createVNode as jsx,
	createVNode as jsxs,
	createVNode as jsxDEV,
	Fragment,
};
