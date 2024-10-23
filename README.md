# `fluxhtml`

Easily parse, transform, and serialize HTML-like markup languages.

## Features

- Parses HTML using `htmlparser2`, a "fast and loose" parser that supports parsing many HTML-like markup languages, including HTML, Astro, Vue, and Svelte.
- High-level API for interacting with and transforming the document.
- Built-in AST walk utility
- Built-in transform utility for easy output manipulation
- Handy `html` template utility: trivially create render functions from HTML syntax
- `querySelector` and `querySelectorAll` support using `fluxhtml/selector`

## Acknowledgements

This library is based on and heavily inspired by [Nate Moore](https://github.com/natemoo-re)'s excellent [`ultrahtml`](https://github.com/natemoo-re/ultrahtml) library. While `fluxhtml` uses a different parser and has some additional functionality, the API is largely identical to that of `ultrahtml`.