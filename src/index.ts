import postcss from "postcss"
import autoprefixer from "autoprefixer"
import type { Properties } from "csstype"

export type NextStyleProperties = {
    [ K in keyof Properties< string | number > ]?: Properties< string | number >[K]
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
    const result = processor.process( cssText, { from: undefined }).css
    postcssCache.set( cssText, result )
    return result
}

function stableStringify( value: any ): string {
    if ( value == null || typeof value !== "object" ) return JSON.stringify( value )
    if ( Array.isArray( value ) ) return `[${ value.map( stableStringify ).join(",") }]`
    const keys = Object.keys( value ).sort()
    return `{${ keys.map(
        k => `"${ k }":${ stableStringify( value[k] ) }`
    ).join(",") }}`
}

function createHashName( seed: string ) {
    let hash = BigInt("0xcbf29ce484222325")
    const prime = BigInt("0x100000001b3")
    for ( let i = 0; i < seed.length; i++ ) {
        hash ^= BigInt( seed.charCodeAt(i) )
        hash *= prime
        hash &= BigInt("0xffffffffffffffff")
    }
    return hash.toString(36).slice( 0, 9 )
}

function toKebabCase( prop: string ) {
    return prop.replace( /[A-Z]/g, m => `-${ m.toLowerCase() }` )
}

const MEDIA_MAP = {
    _sm: "( min-width: 640px )",
    _md: "( min-width: 768px )",
    _lg: "( min-width: 1024px )",
    _xl: "( min-width: 1280px )",
    _xxl: "( min-width: 1536px )"
} as const

type MediaKey = keyof typeof MEDIA_MAP

type SerializeContext = {
    selector: string
    media?: string
}

function mergeMedia( parent?: string, current?: string ) {
    if ( !parent ) return current
    if ( !current ) return parent
    return `${ parent } and ${ current }`
}

function serializeNested(
    style: NextStyleProperties,
    ctx: SerializeContext
): string {
    let css = ""
    let base = ""
    for ( const key in style ) {
        const value = style[ key as keyof NextStyleProperties ]
        if ( value == null || typeof value === "object" || key.startsWith("_") ) continue
        base += `${ toKebabCase( key ) }:${ value };`
    }
    if ( base ) {
        const rule = `${ ctx.selector }{${ base }}`
        css += ctx.media ? `@media ${ ctx.media }{${ rule }}` : rule
    }
    for ( const pseudo of [ "_hover", "_focus", "_active" ] as const ) {
        const value = style[ pseudo ]
        if ( !value ) continue
        css += serializeNested( value, {
            selector: `${ ctx.selector }:${ pseudo.slice(1) }`,
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

export class NextStyle {

    private rules = new Map< string, string >()

    constructor(
        private prefix = "next"
    ) {}

    css = ( style: NextStyleProperties ): string => {
        const seed = stableStringify( style )
        const hash = createHashName( seed )
        const className = `${ this.prefix }_${ hash }`
        const key = `class:${ className }`
        if ( !this.rules.has( key ) ) {
            const raw = serializeNested( style, {
                selector: `.${ className }`
            })
            const cssText = postcssTransform( raw )
            this.rules.set( key, cssText )
        }
        return className
    }

    global = ( selector: string, style: NextStyleProperties ) => {
        const key = `global:${ selector }`
        if ( !this.rules.has( key ) ) {
            const raw = serializeNested( style, {
                selector
            })
            const cssText = postcssTransform( raw )
            this.rules.set( key, cssText )
        }
    }

    keyframes = ( frames: KeyframesObject ): string => {
        const seed = stableStringify( frames )
        const hash = createHashName( seed )
        const name = `${ this.prefix }_${ hash }`
        const key = `@keyframes:${ name }`
        if ( !this.rules.has( key ) ) {
            let body = ""
            for ( const step in frames ) {
                let props = ""
                const frame = frames[ step ]
                for ( const prop in frame ) {
                    props += `${ toKebabCase( prop ) }:${ frame[ prop as keyof typeof frame ] };`
                }
                body += `${ step }{${ props }}`
            }
            const cssText = postcssTransform(
                `@keyframes ${ name }{${ body }}`
            )
            this.rules.set( key, cssText )
        }
        return name
    }

    fontFace = ( font: FontFaceObject ) => {
        const seed = stableStringify( font )
        const hash = createHashName( seed )
        const key = `@font-face:${ hash }`
        if ( !this.rules.has( key ) ) {
            let body = ""
            for ( const prop in font ) {
                body += `${ toKebabCase( prop ) }:${ (font as any)[ prop ] };`
            }
            const cssText = postcssTransform(
                `@font-face{${ body }}`
            )
            this.rules.set( key, cssText )
        }
    }

    get StyleText() {
        if ( this.rules.size === 0 ) return null
        let cssText = ""
        for ( const rule of this.rules.values() ) {
            cssText += rule + "\n"
        }
        return cssText
    }
}
