# next-style

**next-style** is a lightweight runtime CSS-in-JS engine designed for React, Next.js, and Bun.

It is intentionally designed to be **page-scoped and component-scoped**, ensuring predictable
style isolation with zero global leakage between pages or routes.

The library is framework-agnostic at its core and does not depend on React internally.

---

## Core Design Principles

- Styles are scoped to a **single page or component**
- No global singleton style registry
- No cross-page or cross-route CSS leakage
- Each page owns its own styles
- Explicit style injection via a `<style>` tag
- No implicit DOM side effects

Because of this design:
- `new NextStyle()` must be created inside the page or component scope
- Styles must be injected manually using `ns.StyleText`

---

## Features

- Object-based styling with strong TypeScript support
- Deterministic hashing (same styles always produce the same class name)
- Nested pseudo selectors (`_hover`, `_focus`, `_active`)
- Built-in responsive media queries
- Page-scoped global styles
- `@keyframes` support
- `@font-face` support
- PostCSS + Autoprefixer integration
- Automatic rule deduplication (per instance)
- Single `<style>` injection per page or component
- No side effects (`sideEffects: false`)

---

## Installation

### npm

```sh
npm install next-style
```

### Bun

```sh
bun add next-style
```

---

## Peer Dependencies

For most **Next.js applications**, you **do not need to install these manually**.

- **React** is already included with Next.js
- **PostCSS** and **Autoprefixer** are bundled and used internally by Next.js

This section mainly applies if you are using **next-style outside of Next.js**, such as:
- Custom React setups
- Bun + React
- Vite or other non-Next runtimes

If required, install them manually:

```sh
npm install react postcss autoprefixer
```

---

## Basic Usage (Page Scoped)

Create a `NextStyle` instance **inside the page or component**.  
You may optionally provide a **custom prefix** to control generated class names.

```ts
import { NextStyle } from "next-style"

export default function Page() {
    const ns = new NextStyle("home")
    const btn = ns.css({
        padding: "8px 16px",
        backgroundColor: "black",
        color: "white",
        borderRadius: "6px"
    })
    return (
        <>
            <style>{ ns.StyleText }</style>
            <button className={ btn }>Click me</button>
        </>
    )
}
```

Generated class names will look like:

```txt
home_ab12cd3
```

Notes:
- The prefix is optional
- If omitted, a default prefix is used
- Prefixes help identify styles per page or component
- Each page or component should create its own `NextStyle` instance

---

## Pseudo Selectors

Pseudo selectors are defined using keys prefixed with `_`.

```ts
const card = ns.css({
    backgroundColor: "#fff",
    transition: "0.2s ease",
    _hover: {
        backgroundColor: "#f5f5f5"
    },
    _active: {
        transform: "scale(0.98)"
    }
})
```

Supported pseudo selectors:
- `_hover`
- `_focus`
- `_active`

---

## Responsive Styles (Media Queries)

Built-in breakpoints:

- `_sm` → min-width: 640px
- `_md` → min-width: 768px
- `_lg` → min-width: 1024px
- `_xl` → min-width: 1280px
- `_xxl` → min-width: 1536px

```ts
const box = ns.css({
    width: 100,
    _md: {
        width: 200
    },
    _lg: {
        width: 300
    }
})
```

Media queries can be nested and are automatically merged.

---

## Global Styles (Page Scoped)

Global styles are scoped to the current page or component instance.

```ts
ns.global("body", {
    margin: 0,
    fontFamily: "Inter, sans-serif"
})
```

These styles exist only for the lifetime of the page or component.

---

## Keyframes

Create animations using `keyframes()`:

```ts
const fadeIn = ns.keyframes({
    from: { opacity: 0 },
    to: { opacity: 1 }
})
```

Use the animation in styles:

```ts
const modal = ns.css({
    animation: `${ fadeIn } 0.3s ease-out`
})
```

Keyframes are scoped to the current `NextStyle` instance.

---

## Font Face

Declare fonts using `fontFace()`:

```ts
ns.fontFace({
    fontFamily: "Inter",
    src: "url(/fonts/inter.woff2) format('woff2')",
    fontWeight: 400,
    fontStyle: "normal",
    fontDisplay: "swap"
})
```

Font-face rules are injected only for the current page or component.

---

## Deterministic Hashing

- Styles are hashed using a stable algorithm
- Object keys are sorted before hashing
- Semantically identical styles always produce the same class name
- Prevents unnecessary class regeneration

---

## Server-Side Rendering (SSR)

`next-style` is SSR-safe.

Because the core API only generates strings:
- No JSX is exported from the library
- No React runtime is required
- No side effects occur during render

You can safely inject styles during SSR:

```tsx
<style>{ ns.StyleText }</style>
```

The same output will be produced on both the server and the client.

---

## Performance Characteristics

- CSS rules are generated and deduplicated per instance
- PostCSS and Autoprefixer results are cached
- Only one `<style>` tag is required per page or component
- No global runtime mutations

Ideal for:
- Next.js App Router
- Page-level isolation
- Component-driven design systems

---

## Common Gotchas

- Do not create a shared `NextStyle` instance across pages
- Do not treat `next-style` as a global style manager
- Always inject `ns.StyleText` before elements that use generated class names
- Avoid calling `ns.css()` conditionally with different order between renders

---

## Package Information

- Name: `next-style`
- Version: `1.1.2`
- License: MIT
- Module type: ESM
- Side effects: false

Repository:  
https://github.com/kingslimes/next-style

Issues:  
https://github.com/kingslimes/next-style/issues

---

## Roadmap

- `&` selector nesting
- `_dark` / `_light` helpers
- `@layer` support
- Optional React helpers
- Dev-time warnings for incorrect usage

---

## License

MIT © kingslimes
