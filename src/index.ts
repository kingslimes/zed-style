import postcss from "postcss"
import { createElement } from "react"
import autoprefixer from "autoprefixer"
import type { Properties } from "csstype"
import type { DetailedReactHTMLElement } from "react"

/**
 * Style object supported by next-style
 */
export type NextStyleProperties = {
    [ K in keyof Properties< string | number > ]?: Properties< string | number >[ K ]
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
const processor = postcss( [
    autoprefixer( {
        overrideBrowserslist: [
            ">0.2%",
            "not dead",
            "not op_mini all"
        ]
    } )
] )

const postcssCache = new Map< string, string >()

/**
 * Transform raw CSS using PostCSS with caching
 */
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

/**
 * Merge nested media queries
 */
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
        const rule = `${ ctx.selector }{ ${ declarations.join( "; " ) } }`
        css += ctx.media ? `@media ${ ctx.media }{ ${ rule } }` : rule
    }
    for ( const pseudo of [ "_hover", "_focus", "_active" ] as const ) {
        const value = style[ pseudo ]
        if ( !value ) continue
        css += serializeNested( value, { selector: `${ ctx.selector }:${ pseudo.slice( 1 ) }`, media: ctx.media } )
    }
    for ( const key in MEDIA_MAP ) {
        const mediaKey = key as MediaKey
        const value = style[ mediaKey ]
        if ( !value ) continue
        css += serializeNested( value, { selector: ctx.selector, media: mergeMedia( ctx.media, MEDIA_MAP[ mediaKey ] ) } )
    }
    return css
}

type PseudoState = "hover" | "focus" | "active"
type Combinator = "+" | ">" | "~" | " "

class RelationBuilder {
    constructor( private ns: NextStyle, private source: string, private pseudo?: PseudoState ) {}
    hover() { return new RelationBuilder( this.ns, this.source, "hover" ) }
    focus() { return new RelationBuilder( this.ns, this.source, "focus" ) }
    active() { return new RelationBuilder( this.ns, this.source, "active" ) }
    adjacent( target: string, style: NextStyleProperties ) { this.emit( "+", target, style ) }
    child( target: string, style: NextStyleProperties ) { this.emit( ">", target, style ) }
    sibling( target: string, style: NextStyleProperties ) { this.emit( "~", target, style ) }
    descendant( target: string, style: NextStyleProperties ) { this.emit( " ", target, style ) }
    private emit( combinator: Combinator, target: string, style: NextStyleProperties ) {
        const pseudo = this.pseudo ? `:${ this.pseudo }` : ""
        const selector = `.${ this.source }${ pseudo }${ combinator }.${ target }`
        this.ns.global( selector, style )
    }
}

/**
 * NextStyle runtime CSS-in-JS engine
 */
export class NextStyle {
    private rules = new Map< string, string >()
    constructor( private prefix = "next" ) {}
    css( style: NextStyleProperties ): string {
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
    global( selector: string, style: NextStyleProperties ): void {
        const key = `global:${ selector }`
        if ( !this.rules.has( key ) ) {
            const raw = serializeNested( style, { selector } )
            const cssText = postcssTransform( raw )
            this.rules.set( key, cssText )
        }
    }
    /**
     * Apply default global CSS reset
     */
    globalReset(): void {
        this.global( "html,body", {
            maxWidth: "100vw",
            overflowX: "hidden"
        })
        this.global( "body", {
            color: "black",
            background: "white",
            fontFamily: "Arial, Helvetica, sans-serif",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale"
        })
        this.global( "*", {
            boxSizing: "border-box",
            padding: 0,
            margin: 0
        })
        this.global( "a", {
            color: "inherit",
            textDecoration: "none"
        })
    }
    when( source: string ) { return new RelationBuilder( this, source ) }
    keyframes( frames: KeyframesObject ): string {
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
                body += `${ step }{ ${ declarations.join( "; " ) } }`
            }
            const cssText = postcssTransform( `@keyframes ${ name }{ ${ body } }` )
            this.rules.set( key, cssText )
        }
        return name
    }
    fontFace( font: FontFaceObject ): void {
        const seed = stableStringify( font )
        const hash = createHashName( seed )
        const key = `@font-face:${ hash }`
        if ( !this.rules.has( key ) ) {
            const declarations: string[] = []
            for ( const prop in font ) {
                declarations.push( `${ toKebabCase( prop ) }:${ ( font as any )[ prop ] }` )
            }
            const cssText = postcssTransform( `@font-face{ ${ declarations.join( "; " ) } }` )
            this.rules.set( key, cssText )
        }
    }
    toTextCss(): string | null {
        if ( this.rules.size === 0 ) return null
        let cssText = ""
        for ( const rule of this.rules.values() ) cssText += rule + "\n"
        return cssText
    }
    StyleProvider(): DetailedReactHTMLElement< { children: string }, HTMLStyleElement > | null {
        if ( this.rules.size === 0 ) return null
        let cssText = ""
        for ( const rule of this.rules.values() ) cssText += rule + "\n"
        return createElement( "style", { children: cssText } )
    }
}
