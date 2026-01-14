# NextStyle

A lightweight **runtime CSS-in-JS engine** for React with deterministic class names, nested pseudo selectors, media queries, global styles, keyframes, and font-face support.

Designed for **page-scoped and component-scoped usage** without build-time tooling.

---

## Package Information

- **Name:** next-style
- **Version:** 1.2.1
- **License:** MIT
- **Author:** kingslimes  
  https://github.com/kingslimes
- **Repository:**  
  https://github.com/kingslimes/next-style
- **Issue Tracker:**  
  https://github.com/kingslimes/next-style/issues

---

## Features

- Object-based styling (TypeScript friendly)
- Deterministic class names (same style → same class)
- Pseudo selectors (`:hover`, `:focus`, `:active`)
- Responsive media queries (`sm` → `xxl`)
- Global styles
- `@keyframes` support
- `@font-face` support
- Built-in PostCSS + Autoprefixer
- Zero DOM dependency
- Tree-shakeable (`sideEffects: false`)
- Copy–paste friendly API

---

## Installation

``` bash
npm install next-style
# or
bun add next-style
```

---

## Peer Dependencies

NextStyle relies on the following peer dependencies:

``` txt
react >= 18
postcss ^8
autoprefixer ^10
```

Make sure they are installed in your project.

---

## Recommended Usage Pattern (Scoped)

The **recommended and official pattern** is to scope styles per page or per component using destructuring.

``` ts
const { css, StyleProvider } = new NextStyle("home")
```

Why this works well:
- Clear scope ownership
- No global side effects
- Easy to copy and reuse
- Matches React’s mental model

---

## Basic Example (Page Scoped)

``` tsx
import { NextStyle } from "next-style"

export default function HomePage() {
    const { css, StyleProvider } = new NextStyle("home")

    const title = css({
        fontSize: "32px",
        fontWeight: 700,
        marginBottom: "16px"
    })

    const button = css({
        padding: "10px 20px",
        borderRadius: "8px",
        backgroundColor: "#2563eb",
        color: "#fff",

        _hover: {
            backgroundColor: "#1d4ed8"
        }
    })

    return (
        <>
            <StyleProvider />
            <h1 className={title}>Home</h1>
            <button className={button}>Click me</button>
        </>
    )
}
```

---

## Styling API

### `resetStyle(): this as NextStyle`

Reset default style

``` ts
const { css, ... } = new NextStyle().resetStyle()
```
or
``` ts
const { resetStyle } = new NextStyle()
resetStyle()
```

### `root(style): void`

Create root style from a style object.

``` ts
root({
    "--color-base": "#fff"
})
```

### `css(style): string`

Creates a class name from a style object.

``` ts
const className = css({
    color: "red",
    fontSize: "16px"
})
```

- Automatically converts camelCase → kebab-case
- Deduplicates styles using hashing
- Returns a stable class name

---

## Pseudo Selectors

Supported pseudo keys:

| Key | CSS Output |
|----|-----------|
| `_hover` | `:hover` |
| `_focus` | `:focus` |
| `_active` | `:active` |

Example:

``` ts
css({
    color: "black",
    _hover: {
        color: "red"
    }
})
```

---

## Relation Selector API

`next-style` provides a **relation-based selector API** that allows you to define styles based on the state of one element affecting another element, without manually writing complex CSS selectors.

This API is designed to be:
- Declarative and readable  
- Type-safe (no string selectors)  
- Fully compatible with runtime CSS-in-JS  

---

### Basic Usage

``` ts
const { css, when } = new NextStyle()

const container = css({})
const button = css({})

when(container)
  .hover()
  .adjacent(button, {
    backgroundColor: "red"
  })
```
Equivalent CSS:

``` css
.container:hover + .button {
  background-color: red;
}
```

---

## Supported States

You can define relationships based on the following pseudo states:

- `hover()` → `:hover`
- `focus()` → `:focus`
- `active()` → `:active`

Example:

``` ts
when(input)
  .focus()
  .sibling(label, {
    color: "blue"
  })
```
Equivalent CSS:

``` css
input:focus ~ label {
  color: blue;
}
```

---

## Supported Relationships

### Adjacent Sibling (`+`)

Applies styles to the **immediately following sibling**.

``` ts
when(div)
  .hover()
  .adjacent(p, {
    color: "red"
  })
```
CSS equivalent:

``` css
div:hover + p {
  color: red;
}
```

---

### General Sibling (`~`)

Applies styles to **all following siblings**.

``` ts
when(div)
  .hover()
  .sibling(p, {
    color: "red"
  })
```
CSS equivalent:

``` css
div:hover ~ p {
  color: red;
}
```

---

### Child (`>`)

Applies styles to **direct children only**.

``` ts
when(card)
  .hover()
  .child(icon, {
    transform: "scale(1.1)"
  })
```
CSS equivalent:

``` css
card:hover > icon {
  transform: scale(1.1);
}
```

---

### Descendant (space)

Applies styles to **any nested element**.

``` ts
when(menu)
  .hover()
  .descendant(item, {
    backgroundColor: "#eee"
  })
```
CSS equivalent:

``` css
menu:hover item {
  background-color: #eee;
}
```

---

## Why Use `when()` Instead of `global()`?

While `global()` allows full control over raw selectors, `when()` provides:

- Clear intent and better readability  
- No need to manually concatenate class names  
- Safer refactoring (class tokens, not strings)  
- IDE autocomplete and JSDoc support  

Comparison:

``` ts
// global selector
global(`.${a}:hover + .${b}`, { color: "red" })

// relation API
when(a).hover().adjacent(b, { color: "red" })
```

---

## Notes

- `when()` works with class names generated by `css()`
- Relation rules are injected via the same internal pipeline as `global()`
- Media queries and nested styles are fully supported inside relation styles

---

## Example With Media Query

``` ts
when(container)
  .hover()
  .sibling(text, {
    color: "red",
    _md: {
      color: "blue"
    }
  })
```

---

This API is intentionally minimal and composable, allowing you to express complex UI relationships without leaking CSS selector syntax into your application code.

---

## Responsive Media Queries

Built-in breakpoints:

| Key | Media Query |
|----|-------------|
| `_sm` | `(min-width: 640px)` |
| `_md` | `(min-width: 768px)` |
| `_lg` | `(min-width: 1024px)` |
| `_xl` | `(min-width: 1280px)` |
| `_xxl` | `(min-width: 1536px)` |

Example:

``` ts
css({
    fontSize: "14px",
    _lg: {
        fontSize: "18px"
    }
})
```

Media queries can be nested and merged automatically.

---

## Global Styles

### `global(selector, style)`

Apply styles globally without generating a class.

``` ts
const { global, StyleProvider } = new NextStyle("global")

global("body", {
    margin: 0,
    fontFamily: "system-ui"
})

global("a", {
    color: "inherit",
    _hover: {
        textDecoration: "underline"
    }
})
```

---

## Animations

### `keyframes(frames): string`

Creates a `@keyframes` rule and returns its name.

``` ts
const fadeIn = keyframes({
    from: { opacity: 0 },
    to: { opacity: 1 }
})

css({
    animation: `${fadeIn} 300ms ease-in`
})
```

---

## Fonts

### `fontFace(font)`

Registers a `@font-face` rule.

``` ts
fontFace({
    fontFamily: "MyFont",
    src: "url(/fonts/myfont.woff2)",
    fontWeight: 400,
    fontStyle: "normal",
    fontDisplay: "swap"
})
```

---

## Rendering Styles

### `<StyleProvider />`

Injects all generated CSS into a `<style>` tag.

``` tsx
<>
    <StyleProvider />
    <App />
</>
```

- Returns `null` if no styles exist
- Should be rendered **once per scope**

---

### `toTextCss(): string | null`

Returns all generated CSS as a string.

Useful for:
- Server-side rendering (SSR)
- Manual injection
- Debugging

``` ts
const cssText = toTextCss()
```

---

## Component Scoped Example

Reusable, self-contained component.

``` tsx
import { NextStyle } from "next-style"

export function Card({ title, children }) {
    const { css, StyleProvider } = new NextStyle("card")

    const root = css({
        padding: "16px",
        borderRadius: "12px",
        backgroundColor: "#fff",
        boxShadow: "0 10px 25px rgba(0,0,0,.1)"
    })

    const heading = css({
        fontSize: "18px",
        fontWeight: 600,
        marginBottom: "8px"
    })

    return (
        <>
            <StyleProvider />
            <div className={root}>
                <div className={heading}>{title}</div>
                {children}
            </div>
        </>
    )
}
```

---

## Best Practices

- Create **one NextStyle instance per page or component**
- Do **not** share instances globally
- Render `StyleProvider` only once per scope
- Use meaningful prefixes (`home`, `card`, `profile`)

---

## Design Intentions

- No descendant selectors (`& > div`)
- No arbitrary selector nesting
- Predictable output over expressiveness
- Optimized for runtime and SSR safety

---

## License

MIT © kingslimes
