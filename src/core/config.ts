import type { Placement } from '@popperjs/core'
import type { ColorFormat, GradientInput } from '../lib/Color'
import type { StaticPlacement } from '../lib/placement'

export interface PickerConfig {
  /**
   * When enabled, run the picker in headless mode:
   * - leaves the target element untouched, and does not render a toggle
   * - requires manually calling the prompt() method to show the dialog
   * - still positions the dialog relative to the target element
   * Default: false
   */
  headless: boolean

  /**
   * Should the toggle be rendered as an input element or a button?
   * Default: 'button'
   */
  toggleStyle: 'button' | 'input'

  /**
   * The HTML element the picker dialog will be appended to.
   * By default, this is the body.
   */
  container: HTMLElement | null

  /**
   * The initial color.
   * Default: null
   */
  color: string | null

  /**
   * A list of predefined color swatches available for selection.
   * Pass null, false or an empty array to disable them altogether.
   * Default: null
   */
  swatches: string[] | null | false

  /**
   * Hide hsv, hue and alpha sliders as well as format selector and input field.
   * Keep swatches only.
   * Default: false
   */
  swatchesOnly: boolean

  /**
   * Whether to enable the alpha (transparency) slider.
   * Default: true
   */
  enableAlpha: boolean

  /**
   * Whether to enable the built-in eyedropper tool for selecting colors from the screen.
   * As of January 2025, this is only supported on Chromium based browsers: https://caniuse.com/mdn-api_eyedropper
   * Default: true
   */
  enableEyedropper: boolean

  /**
   * The set of color formats the user can choose from.
   * Pass null or false to disable format selection.
   * Default: ['hex', 'rgb', 'hsv', 'hsl']
   */
  formats: ColorFormat[] | null | false

  /**
   * The default color format to use when multiple formats are enabled.
   * Default: 'hex'
   */
  defaultFormat: ColorFormat

  /**
   * Determines how the chosen color is applied:
   * - 'instant': applies immediately as the user picks a color
   * - 'confirm': requires user confirmation (via a submit button)
   * Default: 'confirm'
   */
  submitMode: 'instant' | 'confirm'

  /**
   * Whether to show the clear button for resetting the color.
   * Default: true
   */
  showClearButton: boolean

  /**
   * Whether the color picker should close when clicking outside of it.
   * Default: true
   */
  dismissOnOutsideClick: boolean

  /**
   * Whether the color picker should close when escape is pressed.
   * Default: true
   */
  dismissOnEscape: boolean

  /**
   * How to place the dialog relative to its target.
   * Default: 'top'
   */
  dialogPlacement: Placement

  /**
   * How big the gap between the toggle and dialog should be, in pixels.
   * Default: 8
   */
  dialogOffset: number

  /**
   * How to place the dialog when no anchor element is defined.
   * Default: 'top'
   */
  staticPlacement: StaticPlacement

  /**
   * How big the gap between the dialog and the edge of the page should be, in pixels.
   * Default: 8
   */
  staticOffset: number

  /**
   * Whether to enable gradient selection mode alongside solid color selection.
   * When enabled, users can choose between solid colors and linear gradients.
   * Default: false
   */
  allowGradientSelection: boolean

  /**
   * Initial gradient state to load into the picker.
   * When provided, the picker will start in gradient mode with these settings.
   * Default: null
   */
  gradient: GradientInput | null
}

export const defaultConfig: PickerConfig = {
  headless: false,
  toggleStyle: 'button',
  container: null,
  color: null,
  swatches: null,
  swatchesOnly: false,
  enableAlpha: true,
  enableEyedropper: true,
  formats: ['hex', 'rgb', 'hsv', 'hsl'],
  defaultFormat: 'hex',
  submitMode: 'confirm',
  showClearButton: false,
  dismissOnOutsideClick: true,
  dismissOnEscape: true,
  dialogPlacement: 'top',
  dialogOffset: 8,
  staticPlacement: 'center',
  staticOffset: 8,
  allowGradientSelection: false,
  gradient: null,
}
