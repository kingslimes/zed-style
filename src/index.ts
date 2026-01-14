import postcss from "postcss"
import { createElement } from "react"
import autoprefixer from "autoprefixer"
import type { Properties } from "csstype"
import type { DetailedReactHTMLElement } from "react"

/**
 * Style object used by NextStyle.
 *
 * Supports:
 * - Standard CSS properties (camelCase)
 * - Pseudo states via `_hover`, `_focus`, `_active`
 * - Responsive media queries via `_sm` ~ `_xxl`
 *
 * Example:
 * ```ts
 * const button = css({
 *   padding: "8px 16px",
 *   backgroundColor: "black",
 *   color: "white",
 *   _hover: { opacity: 0.8 },
 *   _md: { padding: "12px 20px" }
 * })
 * ```
 */
export type NextStyleProperties = {
    [ K in keyof Properties< string | number > ]?: Properties< string | number >[K]
} & {
    [ customProperty: `--${string}` ]?: string | number
} & {
    _hover?: NextStyleObject
    _focus?: NextStyleObject
    _active?: NextStyleObject
    _sm?: NextStyleObject
    _md?: NextStyleObject
    _lg?: NextStyleObject
    _xl?: NextStyleObject
    _xxl?: NextStyleObject
}

type NextStyleObject = Omit<
    NextStyleProperties,
    "_sm" | "_md" | "_lg" | "_xl" | "_xxl"
>

type KeyframesObject = {
    [ step: string ]: Properties< string | number >
}

type FontFaceObject = {
    fontFamily: string
    src: string
    fontWeight?: string | number
    fontStyle?: string
    fontDisplay?: string
    unicodeRange?: string
}

/**
 * PostCSS processor with autoprefixer
 */
const processor = postcss([
    autoprefixer({
        overrideBrowserslist: [
            ">0.2%",
            "not dead",
            "not op_mini all"
        ]
    })
])

const postcssCache = new Map< string, string >()

function postcssTransform( cssText: string ): string {
    const cached = postcssCache.get( cssText )
    if ( cached ) return cached
    const result = processor.process( cssText, { from: undefined } ).css
    postcssCache.set( cssText, result )
    return result
}

/**
 * Stable stringify for deterministic hashing
 */
function stableStringify( value: any ): string {
    if ( value == null || typeof value !== "object" ) return JSON.stringify( value )
    if ( Array.isArray( value ) ) return `[${ value.map( stableStringify ).join( "," ) }]`
    const keys = Object.keys( value ).sort()
    return `{${ keys.map( k => `"${ k }":${ stableStringify( value[ k ] ) }` ).join( "," ) }}`
}

/**
 * Create deterministic short hash
 */
function createHashName( seed: string ): string {
    let hash = BigInt( "0xcbf29ce484222325" )
    const prime = BigInt( "0x100000001b3" )
    for ( let i = 0; i < seed.length; i++ ) {
        hash ^= BigInt( seed.charCodeAt( i ) )
        hash *= prime
        hash &= BigInt( "0xffffffffffffffff" )
    }
    return hash.toString( 36 ).slice( 0, 9 )
}

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase( prop: string ): string {
    return prop.replace( /[A-Z]/g, m => `-${ m.toLowerCase() }` )
}

const MEDIA_MAP = {
    _sm: "(min-width:640px)",
    _md: "(min-width:768px)",
    _lg: "(min-width:1024px)",
    _xl: "(min-width:1280px)",
    _xxl: "(min-width:1536px)"
} as const

type MediaKey = keyof typeof MEDIA_MAP

type SerializeContext = {
    selector: string
    media?: string
}

function mergeMedia( parent?: string, current?: string ): string | undefined {
    if ( !parent ) return current
    if ( !current ) return parent
    return `${ parent } and ${ current }`
}

/**
 * Serialize style object into CSS text
 */
function serializeNested( style: NextStyleProperties, ctx: SerializeContext ): string {
    let css = ""
    const declarations: string[] = []
    for ( const key in style ) {
        const value = style[ key as keyof NextStyleProperties ]
        if ( value == null || typeof value === "object" || key.startsWith( "_" ) ) continue
        declarations.push( `${ toKebabCase( key ) }:${ value }` )
    }
    if ( declarations.length ) {
        const rule = `${ ctx.selector }{${ declarations.join( ";" ) }}`
        css += ctx.media ? `@media ${ ctx.media }{${ rule }}` : rule
    }
    for ( const pseudo of [ "_hover", "_focus", "_active" ] as const ) {
        const value = style[ pseudo ]
        if ( !value ) continue
        css += serializeNested( value, {
            selector: `${ ctx.selector }:${ pseudo.slice( 1 ) }`,
            media: ctx.media
        })
    }
    for ( const key in MEDIA_MAP ) {
        const mediaKey = key as MediaKey
        const value = style[ mediaKey ]
        if ( !value ) continue
        css += serializeNested( value, {
            selector: ctx.selector,
            media: mergeMedia( ctx.media, MEDIA_MAP[ mediaKey ] )
        })
    }
    return css
}

type PseudoState = "hover" | "focus" | "active"
type Combinator = "+" | ">" | "~" | " "

/**
 * Builder for defining relations starting from a generated class name.
 *
 * This builder should only be created via `NextStyle.when(...)`.
 */
class RelationBuilder {
    /**
     * @internal
     * @param ns NextStyle instance
     * @param source Source class name generated by `css()`
     * @param pseudo Optional pseudo state applied to the source
     */
    constructor(
        private ns: NextStyle,
        private source: string,
        private pseudo?: PseudoState
    ) {}
    /**
     * Apply `:hover` pseudo state to the source selector.
     *
     * All subsequent relations will be scoped under `:hover`.
     *
     * @returns RelationBuilder
     *
     * Example:
     * ```ts
     * when(card)
     *   .hover()
     *   .child(icon, { opacity: 1 })
     * ```
     */
    hover() {
        return new RelationBuilder( this.ns, this.source, "hover" )
    }
    /**
     * Apply `:focus` pseudo state to the source selector.
     *
     * @returns RelationBuilder
     */
    focus() {
        return new RelationBuilder( this.ns, this.source, "focus" )
    }
    /**
     * Apply `:active` pseudo state to the source selector.
     *
     * @returns RelationBuilder
     */
    active() {
        return new RelationBuilder( this.ns, this.source, "active" )
    }
    /**
     * Define styles for an adjacent sibling selector.
     *
     * CSS equivalent:
     * `.source + .target`
     *
     * @param target Target class name generated by `css()`
     * @param style Style applied to the target element
     *
     * Example:
     * ```ts
     * when(input)
     *   .focus()
     *   .adjacent(label, { color: "red" })
     * ```
     */
    adjacent( target: string, style: NextStyleProperties ) {
        this.emit( "+", target, style )
    }
    /**
     * Define styles for a direct child selector.
     *
     * CSS equivalent:
     * `.source > .target`
     *
     * @param target Target class name generated by `css()`
     * @param style Style applied to the target element
     */
    child( target: string, style: NextStyleProperties ) {
        this.emit( ">", target, style )
    }
    /**
     * Define styles for a general sibling selector.
     *
     * CSS equivalent:
     * `.source ~ .target`
     *
     * @param target Target class name generated by `css()`
     * @param style Style applied to the target element
     */
    sibling( target: string, style: NextStyleProperties ) {
        this.emit( "~", target, style )
    }
    /**
     * Define styles for a descendant selector.
     *
     * CSS equivalent:
     * `.source .target`
     *
     * @param target Target class name generated by `css()`
     * @param style Style applied to the target element
     */
    descendant( target: string, style: NextStyleProperties ) {
        this.emit( " ", target, style )
    }
    /**
     * @internal
     * Emit a global relational rule.
     */
    private emit( combinator: Combinator, target: string, style: NextStyleProperties ) {
        const pseudo = this.pseudo ? `:${ this.pseudo }` : ""
        const selector = `.${ this.source }${ pseudo }${ combinator }.${ target }`
        this.ns.global( selector, style )
    }
}

/**
 * NextStyle
 *
 * Lightweight runtime CSS-in-JS engine with deterministic class names.
 *
 * Features:
 * - Scoped class generation
 * - Nested pseudo selectors
 * - Responsive media queries
 * - Global styles
 * - Keyframes and font-face support
 *
 * Example:
 * ```ts
 * const ns = new NextStyle("app")
 * ```
 */
export class NextStyle {

    private rules = new Map< string, string >()
    private globalStore = new Map< string, NextStyleProperties >()

    constructor( private prefix = "next" ) {}

    /**
     * Generate a scoped class name from a style object.
     *
     * The returned value is a branded class name and is intended
     * to be used with `when(...)` and relational APIs.
     *
     * @param style Style definition object
     * @returns Scoped class name
     *
     * Example:
     * ```ts
     * const button = css({ padding: 8 })
     * ```
     */
    css = ( style: NextStyleProperties ): string => {
        const seed = stableStringify( style )
        const hash = createHashName( seed )
        const className = `${ this.prefix }_${ hash }`
        const key = `class:${ className }`
        if ( !this.rules.has( key ) ) {
            const raw = serializeNested( style, { selector: `.${ className }` } )
            const cssText = postcssTransform( raw )
            this.rules.set( key, cssText )
        }
        return className
    }

    /**
     * Define a global CSS selector.
     *
     * Styles are merged at property level instead of overwritten.
     *
     * @param selector CSS selector
     * @param style Style definition
     *
     * Example:
     * ```ts
     * global("body", {
     *   fontFamily: "Kanit, sans-serif"
     * })
     * ```
     */
    global = ( selector: string, style: NextStyleProperties ): void => {
        const key = `global:${ selector }`
        const prev = this.globalStore.get( key ) ?? {}
        const merged: NextStyleProperties = {
            ...prev,
            ...style
        }
        this.globalStore.set( key, merged )
        const raw = serializeNested( merged, { selector } )
        const cssText = postcssTransform( raw )
        if ( this.rules.has( key ) ) this.rules.delete( key )
        this.rules.set( key, cssText )
    }

    /**
     * Define styles on `:root`.
     *
     * Intended for:
     * - CSS variables
     * - Global theme tokens
     *
     * Styles are merged at property level.
     *
     * Example:
     * ```ts
     * root({
     *   "--color-primary": "#4f46e5",
     *   "--radius": "12px"
     * })
     * ```
     */
    root = ( style: NextStyleProperties ): void => {
        this.global( ":root", style )
    }

    /**
     * Apply default browser reset styles
     * ```css
     * html, body {
     *     max-width: 100vw;
     *     overflow-x: hidden;
     * }
     * body {
     *     color: "black";
     *     background: "white";
     *     -moz-osx-font-smoothing: grayscale;
     *     -webkit-font-smoothing: antialiased;
     *     font-family: "Arial, Helvetica, sans-serif"
     * }
     * *,
     * *::before,
     * *::after {
     *     margin: 0;
     *     padding: 0;
     *     box-sizing: border-box;
     * }
     * a {
     *     color: inherit;
     *     text-decoration: none
     * }
     * ```
     */
    resetStyle = () => {
        this.global( "html,body", {
            maxWidth: "100vw",
            overflowX: "hidden"
        })
        this.global( "body", {
            color: "black",
            background: "white",
            MozOsxFontSmoothing: "grayscale",
            WebkitFontSmoothing: "antialiased",
            fontFamily: "Arial, Helvetica, sans-serif"
        })
        this.global( "*,*::before,*::after", {
            margin: 0,
            padding: 0,
            boxSizing: "border-box"
        })
        this.global( "a", {
            color: "inherit",
            textDecoration: "none"
        })
        return this
    }

    /**
     * Create relational selectors based on a class generated by `css(...)`.
     *
     * ⚠️ This method only accepts class names returned from `css`.
     *
     * @param source Class name generated by `css`
     *
     * Example:
     * ```ts
     * const card = css({ ... })
     *
     * when(card)
     *   .hover()
     *   .child("icon", { opacity: 1 })
     * ```
     */
    when = ( source: string ) => new RelationBuilder( this, source )

    /**
     * Register keyframes animation.
     *
     * @param frames Keyframes definition
     * @returns Generated animation name
     *
     * Example:
     * ```ts
     * const fadeIn = keyframes({
     *   from: { opacity: 0 },
     *   to: { opacity: 1 }
     * })
     * ```
     */
    keyframes = ( frames: KeyframesObject ): string => {
        const seed = stableStringify( frames )
        const hash = createHashName( seed )
        const name = `${ this.prefix }_${ hash }`
        const key = `@keyframes:${ name }`
        if ( !this.rules.has( key ) ) {
            let body = ""
            for ( const step in frames ) {
                const declarations: string[] = []
                const frame = frames[ step ]
                for ( const prop in frame ) {
                    declarations.push( `${ toKebabCase( prop ) }:${ frame[ prop as keyof typeof frame ] }` )
                }
                body += `${ step }{ ${ declarations.join( ";" ) } }`
            }
            const cssText = postcssTransform( `@keyframes ${ name }{ ${ body } }` )
            this.rules.set( key, cssText )
        }
        return name
    }

    /**
     * Register a `@font-face` rule.
     *
     * Each unique definition is injected only once.
     *
     * @param font Font-face definition
     *
     * Example:
     * ```ts
     * fontFace({
     *   fontFamily: "Kanit",
     *   src: "url(/kanit.woff2) format('woff2')",
     *   fontWeight: 400
     * })
     * ```
     */
    fontFace = ( font: FontFaceObject ): void => {
        const seed = stableStringify( font )
        const hash = createHashName( seed )
        const key = `@font-face:${ hash }`
        if ( !this.rules.has( key ) ) {
            const declarations: string[] = []
            for ( const prop in font ) {
                declarations.push( `${ toKebabCase( prop ) }:${ ( font as any )[ prop ] }` )
            }
            const cssText = postcssTransform(
                `@font-face{ ${ declarations.join( ";" ) } }`
            )
            this.rules.set( key, cssText )
        }
    }

    /**
     * Serialize all generated CSS into a single string.
     *
     * Intended for:
     * - Manual `<style>` injection
     * - SSR environments
     *
     * @returns CSS text or `null` if no styles exist
     */
    toTextCss = (): string | null => {
        if ( this.rules.size === 0 ) return null
        let cssText = ""
        for ( const rule of this.rules.values() ) cssText += rule + "\n"
        return cssText
    }

    /**
     * React component that injects generated CSS into a `<style>` tag.
     *
     * Returns `null` if no styles are registered.
     *
     * Example:
     * ```tsx
     * <StyleProvider />
     * ```
     */
    StyleProvider = (): DetailedReactHTMLElement<
        { children: string }, HTMLStyleElement
    > | null => {
        if ( this.rules.size === 0 ) return null
        let cssText = ""
        for ( const rule of this.rules.values() ) cssText += rule + "\n"
        return createElement( "style", { children: cssText } )
    }
}
