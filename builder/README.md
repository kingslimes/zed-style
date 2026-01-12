# NextStyle

A lightweight runtime CSS-in-JS engine designed for React and Next.js.  
It supports nested pseudo selectors, responsive media queries, and automatic vendor prefixing via PostCSS — all at runtime with zero build-time CSS extraction.

NextStyle focuses on **runtime flexibility**, **type safety**, and **minimal abstraction**, making it suitable for design systems, theming, and dynamic UI styling.

---

## Features

- Runtime CSS generation
- Strongly typed style objects (powered by `csstype`)
- Nested pseudo selectors (`_hover`, `_focus`, `_active`)
- Responsive media queries (`_sm`, `_md`, `_lg`, `_xl`, `_xxl`)
- Automatic vendor prefixing (PostCSS + Autoprefixer)
- Deterministic hashed class names
- React `<style>` provider component
- No bundler or build-step CSS required

---

## Installation

Install the package along with its peer dependencies:

```bash
npm install next-style postcss autoprefixer react
```

or with Bun:

```bash
bun add next-style postcss autoprefixer react
```

---

## Basic Usage

```tsx
import { NextStyle } from "next-style"

const style = new NextStyle('home') // output className = home_{hash} default "next_{hash}"

const className = style.css({
    display: "flex",
    alignItems: "center",
    padding: "12px",
    backgroundColor: "#111",
    color: "white",
    _hover: {
        backgroundColor: "#222"
    },
    _md: {
        padding: "16px"
    }
})
```

Apply the generated class name to your component:

```tsx
export default function App() {
    return (
        <>
            <div className={className}>
                Hello NextStyle
            </div>
            <style.Provider />
        </>
    )
}
```

---

## Style Object API

### Base Properties

All standard CSS properties are supported and fully typed:

```ts
{
    margin: "8px",
    fontSize: "14px",
    backgroundColor: "#000"
}
```

Types are derived from `csstype`, ensuring correctness and editor autocomplete.

---

### Pseudo Selectors

Use underscored keys for pseudo selectors:

```ts
{
    _hover: {
        opacity: 0.8
    },
    _focus: {
        outline: "2px solid blue"
    },
    _active: {
        transform: "scale(0.98)"
    }
}
```

Supported pseudos:
- `_hover`
- `_focus`
- `_active`

---

### Responsive Media Queries

NextStyle provides built-in responsive keys:

| Key   | Media Query |
|------|-------------|
| `_sm` | `(min-width: 640px)` |
| `_md` | `(min-width: 768px)` |
| `_lg` | `(min-width: 1024px)` |
| `_xl` | `(min-width: 1280px)` |
| `_xxl` | `(min-width: 1536px)` |

Example:

```ts
{
    fontSize: "14px",
    _lg: {
        fontSize: "18px"
    }
}
```

---

## `<style.Provider />`

The `Provider` component injects all generated CSS rules into a `<style>` tag.

Important notes:

- It must be rendered **once per style instance**
- It should be rendered **after** calling `css(...)`
- It performs no side effects if no styles were generated

```tsx
<style.Provider />
```

---

## Hashing Strategy

Class names are generated using a deterministic hash based on the style object:

```text
next_x9k3a2m1
```

This ensures:
- Stable class names
- No duplicates
- Automatic caching of generated rules

---

## Runtime Behavior

- CSS is generated lazily on first usage
- Rules are cached in memory
- PostCSS transformation runs only once per unique rule
- No DOM mutation outside React rendering

---

## Type Safety

NextStyle provides full TypeScript support:

- All CSS properties are typed
- Invalid properties are caught at compile time
- Media and pseudo keys are strictly controlled

Types are generated via `.d.ts` and require no runtime dependency on `csstype`.

---

## Requirements

### Peer Dependencies

- React >= 18
- PostCSS >= 8
- Autoprefixer >= 10

### Runtime Environment

- Node.js >= 18
- Bun >= 1.0.0

---

## License

MIT © kingslimes

---

## Philosophy

NextStyle is intentionally minimal.

- No build-time CSS extraction
- No global runtime side effects
- No magic conventions

Just predictable runtime styling with strong types and explicit behavior.
