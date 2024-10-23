# `fluxhtml`

Easily parse, transform, and serialize HTML-like markup languages.

## Features

- Parses HTML using `htmlparser2`, a "fast and loose" parser that supports parsing many HTML-like markup languages, including HTML, Astro, Vue, and Svelte.
- High-level API for interacting with and transforming the document.
- Built-in AST walk utility
- Built-in transform utility for easy output manipulation
- Handy `html` template utility: trivially create render functions from HTML syntax
- `querySelector` and `querySelectorAll` support using `fluxhtml/selector`

## Installation

```sh
(npm|yarn|pnpm) i fluxhtml
```

## Usage

### `walk`

The `walk` function provides full control over the AST. It can be used to scan for text, elements, components, or any other validation you might want to do.

> **Note** > `walk` is `async` and **must** be `await`ed. Use `walkSync` if the provided callback is synchronous.

```js
import { parse, walk, ELEMENT_NODE } from "fluxhtml";

const ast = parse(`<h1>Hello world!</h1>`);
await walk(ast, async (node) => {
  if (node.type === ELEMENT_NODE && node.name === "script") {
    throw new Error("Found a script!");
  }
});
```

### `walkSync`

The `walkSync` function is identical to the `walk` function, but is synchronous.

```js
import { parse, walkSync, ELEMENT_NODE } from "fluxhtml";

const ast = parse(`<h1>Hello world!</h1>`);
walkSync(ast, (node) => {
  if (node.type === ELEMENT_NODE && node.name === "script") {
    throw new Error("Found a script!");
  }
});
```

### `render`

The `render` function allows you to serialize an AST back into a string.

> **Note**
> By default, `render` will sanitize your markup, removing any `script` tags. Pass `{ sanitize: false }` to disable this behavior.

```js
import { parse, render } from "fluxhtml";

const ast = parse(`<h1>Hello world!</h1>`);
const output = await render(ast);
```

### `transform`

The `transform` function provides a straight-forward way to modify any markup. Sanitize content, swap in-place elements/Components, and more using a set of built-in transformers, or write your own custom transformer.

```js
import { transform, html } from "fluxhtml";
import swap from "fluxhtml/transformers/swap";
import sanitize from "fluxhtml/transformers/sanitize";

const output = await transform(`<h1>Hello world!</h1>`, [
  swap({
    h1: "h2",
    h3: (props, children) => html`<h2 class="ultra">${children}</h2>`,
  }),
  sanitize({ allowElements: ["h1", "h2", "h3"] }),
]);

console.log(output); // <h2>Hello world!</h2>
```

### Sanitization

`fluxhtml/transformers/sanitize` implements an extension of the [HTML Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/Sanitizer/Sanitizer).

| Option              | Type                       | Default      | Description                                                                                                                                                                                                                               |
| ------------------- | -------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| allowElements       | `string[]`                 | `undefined`  | An array of strings indicating elements that the sanitizer should not remove. All elements not in the array will be dropped.                                                                                                              |
| blockElements       | `string[]`                 | `undefined`  | An array of strings indicating elements that the sanitizer should remove, but keep their child elements.                                                                                                                                  |
| dropElements        | `string[]`                 | `["script"]` | An array of strings indicating elements (including nested elements) that the sanitizer should remove.                                                                                                                                     |
| allowAttributes     | `Record<string, string[]>` | `undefined`  | An object where each key is the attribute name and the value is an Array of allowed tag names. Matching attributes will not be removed. All attributes that are not in the array will be dropped.                                         |
| dropAttributes      | `Record<string, string[]>` | `undefined`  | An object where each key is the attribute name and the value is an Array of dropped tag names. Matching attributes will be removed.                                                                                                       |
| allowComponents     | `boolean`                  | `false`      | A boolean value set to false (default) to remove components and their children. If set to true, components will be subject to built-in and custom configuration checks (and will be retained or dropped based on those checks).           |
| allowCustomElements | `boolean`                  | `false`      | A boolean value set to false (default) to remove custom elements and their children. If set to true, custom elements will be subject to built-in and custom configuration checks (and will be retained or dropped based on those checks). |
| allowComments       | `boolean`                  | `false`      | A boolean value set to false (default) to remove HTML comments. Set to true in order to keep comments.                                                                                                                                    |

## Acknowledgements

This library is based on and heavily inspired by [Nate Moore](https://github.com/natemoo-re)'s excellent [`ultrahtml`](https://github.com/natemoo-re/ultrahtml) library. While `fluxhtml` uses a different parser and has some additional functionality, the API is largely identical to that of `ultrahtml`.