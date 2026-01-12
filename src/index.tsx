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

const processor = postcss([
    autoprefixer({ overrideBrowserslist: [ ">0.2%", "not dead", "not op_mini all" ] })
])

const postcssCache = new Map< string, string >()

function postcssTransform( cssText: string ): string {
    const cached = postcssCache.get( cssText )
    if ( cached ) return cached
    const result = processor.process( cssText, { from: undefined }).css
    postcssCache.set( cssText, result )
    return result
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

type SerializeContext = { selector: string, media?: string }

function serializeNested(
    style: NextStyleProperties,
    ctx: SerializeContext
): string {
    let css = ""
    let base = ""
    for ( const key in style ) {
        const value = style[ key as keyof NextStyleProperties ]
        if ( value == null || typeof value === "object" || key.startsWith("_") ) continue
        base += `${ toKebabCase(key) }:${ value };`
    }
    if ( base ) {
        const rule = `${ ctx.selector }{${ base }}`
        css += ctx.media ? `${ ctx.media }{${ rule }}` : rule
    }
    for ( const pseudo of [ "_hover", "_focus", "_active" ] as const ) {
        const value = style[ pseudo ]
        if ( !value ) continue
        css += serializeNested( value, {
            ...ctx,
            selector: `${ ctx.selector }:${ pseudo.slice(1) }`
        })
    }
    for ( const key in MEDIA_MAP ) {
        const mediaKey = key as MediaKey
        const value = style[ mediaKey ]
        if ( !value ) continue
        css += serializeNested( value, {
            ...ctx,
            media: `@media ${ MEDIA_MAP[mediaKey] }`
        })
    }
    return css
}

export class NextStyle {
    private rules = new Map< string, string >()
    constructor( private prefix = "zed" ) {}
    css = ( style: NextStyleProperties ): string => {
        const hash = createHashName( JSON.stringify(style) )
        const className = `${ this.prefix }_${ hash }`
        if ( !this.rules.has(className) ) {
            const raw = serializeNested( style, {
                selector: `.${ className }`
            })
            const cssText = postcssTransform( raw )
            this.rules.set( className, cssText )
        }
        return className
    }
    Provider = () => {
        if ( this.rules.size === 0 ) return null
        let cssText = ""
        for ( const rule of this.rules.values() ) {
            cssText += rule + "\n"
        }
        return <style>{ cssText }</style>
    }
}
