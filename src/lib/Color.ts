import { parseColor } from './colorParse'
import { convertColor } from './colorConvert'

export type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsv' | 'hsl'

export interface GradientData {
  type: 'gradient'
  startColor: Color
  endColor: Color
  angle: number
}

export interface GradientInput {
  type: 'gradient'
  startColor: string | Color
  endColor: string | Color
  angle: number
}

export interface SolidData {
  type: 'solid'
  color: Color
}

export type ColorData = SolidData | GradientData

export class Color {
  private readonly color: number[]

  private getSet(index: number, value?: number) {
    if (value === undefined) return this.color[index]
    const clone = [...this.color]
    clone[index] = value
    return new Color(clone)
  }

  hue(value?: number) {
    return this.getSet(0, value)
  }
  saturation(value?: number) {
    return this.getSet(1, value)
  }
  value(value?: number) {
    return this.getSet(2, value)
  }
  alpha(value?: number) {
    return this.getSet(3, value)
  }

  constructor(from?: Color | number[] | string) {
    if (!from) {
      this.color = [0, 0, 0, 1]
    } else if (from instanceof Color) {
      this.color = [...from.color]
    } else if (Array.isArray(from)) {
      const [h = 0, s = 0, v = 0, a = 1] = from
      this.color = [h, s, v, a]
    } else {
      this.color = parseColor(from).color
    }
  }

  string(format: ColorFormat) {
    return convertColor(this.color, format)
  }
  toString() {
    return this.string('hex')
  }

  clone() {
    return new Color(this)
  }
}

export interface Color {
  hue(): number
  hue(value: number): Color
  saturation(): number
  saturation(value: number): Color
  value(): number
  value(value: number): Color
  alpha(): number
  alpha(value: number): Color
}
