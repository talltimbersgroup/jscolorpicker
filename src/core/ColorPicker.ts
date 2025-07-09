import { EventEmitter } from 'events'
import { createPopper } from '@popperjs/core'
import { Color } from '../lib/Color'

import { Slider } from './Slider'
import { defaultConfig } from './config'
import { parseColor } from '../lib/colorParse'
import { getElement } from '../lib/domUtil'
import { alignElement } from '../lib/placement'

import dialogContent from '../html/dialog.html?raw'
import caretContent from '../html/caret.html?raw'

import type { PickerConfig } from './config'
import type { ColorFormat, GradientData, GradientInput } from '../lib/Color'
import type { Instance as PopperInstance } from '@popperjs/core'

let currentlyOpen: ColorPicker | undefined

export class ColorPicker extends EventEmitter<{
  open: []
  opened: []
  close: []
  closed: []
  pick: [Color | null]
}> {
  static Color = Color

  /**
   * Get whether the dialog is currently open.
   */
  get isOpen() {
    return this._open
  }
  /**
   * Get the picked color.
   */
  get color() {
    return this._unset ? null : this._color
  }
  /**
   * Get the array of swatches.
   */
  get swatches() {
    return this._swatches
  }
  /**
   * Get the color currently selected in the dialog.
   */
  get selectedColor() {
    return this._newColor
  }
  /**
   * Get the color output format.
   */
  get format() {
    return this._format
  }
  /**
   * Get the target element.
   */
  get element() {
    return this.$toggle
  }

  private _open = false
  private _unset = true
  private _firingChange = false
  private _format: ColorFormat

  private _color: Color
  private _newColor: Color
  private _swatches: string[]

  private _gradientMode = false
  private _hasGradient = false  // Track if this picker has a gradient set
  private _gradientStartColor: Color
  private _gradientEndColor: Color
  private _gradientAngle = 0
  private _activeGradientColor: 'start' | 'end' = 'start'

  private config: PickerConfig
  private popper?: PopperInstance

  private isInput: boolean

  private $toggle: HTMLElement
  private $dialog?: HTMLElement
  private $button?: HTMLElement
  private $input?: HTMLInputElement

  private changeHandler?: () => void
  private clickHandler?: () => void

  private hsvSlider?: Slider
  private hueSlider?: Slider
  private alphaSlider?: Slider
  private angleSlider?: Slider
  
  private gradientHsvSlider?: Slider
  private gradientHueSlider?: Slider
  private gradientAlphaSlider?: Slider

  private $formats?: HTMLElement[]
  private $colorInput?: HTMLInputElement
  private $tabs?: HTMLElement[]
  private $panels?: HTMLElement[]
  private $gradientColorButtons?: HTMLElement[]
  private $angleInput?: HTMLInputElement
  private $gradientPreview?: HTMLElement

  private createToggle($from: HTMLInputElement | HTMLButtonElement) {
    const isInput = $from instanceof HTMLInputElement

    this.isInput = isInput
    this.$toggle = isInput ? document.createElement('button') : $from
    this.$input = isInput ? $from : document.createElement('input')
    if (this.isInput && 'color' == $from.type) {
      // input type="color" cannot be styled, change to 'text'
      $from.type = 'text'
    }

    $from.replaceWith(this.$toggle)

    this.$input.tabIndex = -1
    this.$input.readOnly = true
    this.$input.classList.add('cp_input')

    if (this.config.toggleStyle === 'input') {
      this.$toggle.classList.add('cp_wide')
    }

    this.$button = document.createElement('div')
    this.$button.classList.add('cp_button')
    this.$button.innerHTML = caretContent

    this.$toggle.classList.add('color-picker')
    this.$toggle.setAttribute('type', 'button')
    this.$toggle.append(this.$input, this.$button)

    // Bind events
    this.changeHandler = () => {
      if (!this._firingChange) {
        this.setColor(this.$input!.value, false)
      }
    }
    this.clickHandler = () => this.toggle()

    this.$input.addEventListener('change', this.changeHandler)
    this.$toggle.addEventListener('click', this.clickHandler)
  }

  /**
   * Append the picker to a given element.
   * @param target The element to attach the picker to.
   */
  appendTo(target: HTMLElement) {
    target.append(this.element)
  }

  /**
   * Create a new ColorPicker instance.
   * @param $from The element or query to bind to. (leave null to create one)
   * @param config The picker configuration.
   */
  constructor(
    $from?: HTMLInputElement | HTMLButtonElement | string | null,
    config: Partial<PickerConfig> = {}
  ) {
    super()
    this.config = { ...defaultConfig, ...config }

    // Determine element to bind to, or create one (a <button> element)
    $from = getElement($from) ?? document.createElement('button')

    // Create toggle
    this.$toggle = $from

    const color =
      this.config.color || ($from as HTMLInputElement).value || $from.dataset.color || undefined

    if (!this.config.headless) this.createToggle($from)

    this._setCurrentColor(new Color(color), false)
    if (!color) this.clear(false)

    // Initialize gradient state from config or defaults
    if (this.config.gradient) {
      this._gradientStartColor = new Color(this.config.gradient.startColor)
      this._gradientEndColor = new Color(this.config.gradient.endColor)
      this._gradientAngle = this.config.gradient.angle
      this._hasGradient = true
      
      // Set gradient background immediately if not headless
      if (!this.config.headless) {
        const gradientCSS = `linear-gradient(${this._gradientAngle}deg, ${this._gradientStartColor.string('hex')}, ${this._gradientEndColor.string('hex')})`
        const gradientString = `gradient(${this._gradientAngle}deg, ${this._gradientStartColor.string(this.config.defaultFormat)}, ${this._gradientEndColor.string(this.config.defaultFormat)})`
        
        if (this.$input) {
          this.$input.value = gradientString
          this.$input.dataset.color = gradientCSS
        }
        if (this.$toggle) this.$toggle.dataset.color = gradientCSS
        if (this.$button) {
          this.$button.classList.remove('cp_unset')
          this.$button.style.background = `${gradientCSS}, var(--cp-bg-checker)`
        }
      }
    } else {
      this._gradientStartColor = new Color(color || '#ff0000')
      this._gradientEndColor = new Color('#0000ff')
    }

    this.setSwatches(this.config.swatches)

    // Dismissal events
    if (this.config.dismissOnOutsideClick) {
      window.addEventListener('pointerdown', (event) => {
        if (!this._open) return
        const $toggle = event.target as HTMLElement
        if (!$toggle.closest('.cp_dialog') && !$toggle.closest('.color-picker')) this.close()
      })
    }

    // Dismiss on Escape
    if (this.config.dismissOnEscape) {
      window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          const $focus = document.querySelector(':focus')
          if (!$focus || $focus.closest('.cp_dialog')) this.close()
          return
        }
      })
    }

    this.close()
  }

  setSwatches(swatches: string[] | null | false) {
    this._swatches = swatches || []
    this.updateSwatches()
  }

  /**
   * Toggle whether the picker dialog is opened.
   * @param value Force open or closed?
   * @param emit Emit event?
   */
  toggle(value = !this._open, emit = true) {
    if (value) {
      this.open(emit)
    } else {
      this.close(emit)
    }
  }

  /**
   * Open the picker dialog.
   * @param emit Emit event?
   */
  open(emit = true) {
    if (this._open) return
    this._open = true

    currentlyOpen?.close()
    currentlyOpen = this

    // Create dialog
    const container = getElement(this.config.container) ?? document.body
    container.insertAdjacentHTML('beforeend', dialogContent)
    this.$dialog = container.lastElementChild as HTMLElement
    this.$colorInput = this.$dialog.querySelector('.cp_value')!

    this.populateDialog()
    this.updateSwatches()
    this.bindDialog()

    this.setFormat(this.config.defaultFormat, false)
    this.updateColor()

    // Create popper
    const toggleExists = document.documentElement.contains(this.$toggle)

    if (toggleExists) {
      this.popper = createPopper(this.$toggle, this.$dialog!, {
        placement: this.config.dialogPlacement,
        strategy: 'absolute',
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, this.config.dialogOffset],
            },
          },
        ],
      })
    } else {
      this.popper = undefined
      alignElement(this.$dialog, this.config.staticPlacement, this.config.staticOffset)
    }

    this.$colorInput.focus({ preventScroll: true })

    this.$button?.classList.add('cp_open')
    setTimeout(() => this.$dialog!.classList.add('cp_open'))
    if (emit) {
      this.emit('open')
      setTimeout(() => this.emit('opened'), this.getAnimationDuration())
    }
  }

  /**
   * Open the picker, returning a promise with the chosen color, optionally destroying it after.
   */
  prompt(destroy = false): Promise<Color | null> {
    return new Promise((resolve) => {
      this.once('close', () => resolve(this.color))

      if (destroy) {
        this.once('closed', () => this.destroy())
      }

      this.open()
    })
  }

  private populateDialog() {
    // Handle tabs for gradient mode
    if (this.config.allowGradientSelection) {
      this.$tabs = Array.from(this.$dialog!.querySelectorAll('.cp_tab'))
      this.$panels = Array.from(this.$dialog!.querySelectorAll('.cp_panel'))
      
      this.$tabs.forEach(($tab) => {
        $tab.addEventListener('click', () => this.switchTab($tab.dataset.tab as 'solid' | 'gradient'))
      })
      
      // Switch to gradient mode if this picker has a gradient, otherwise solid
      this.switchTab(this._hasGradient ? 'gradient' : 'solid')
    } else {
      this.$dialog!.querySelector('.cp_tabs')?.remove()
      this.$dialog!.querySelector('.cp_panel-gradient')?.remove()
      // Make sure solid panel is visible when gradient is disabled
      const solidPanel = this.$dialog!.querySelector('.cp_panel-solid') as HTMLElement
      if (solidPanel) {
        solidPanel.classList.add('active')
      }
    }

    // Create formats based on config and assign event listener
    if (this.config.formats) {
      this.$formats = this.config.formats.map((format) => {
        const $format = document.createElement('button')
        $format.className = 'cp_format'
        $format.dataset.format = format
        $format.textContent = format.toUpperCase()

        $format.addEventListener('click', () => this.setFormat(format))
        return $format
      })
      this.$dialog!.querySelectorAll('.cp_formats').forEach(($formatsContainer) => {
        $formatsContainer.append(...this.$formats!.map($f => $f.cloneNode(true)))
      })
    }
  }

  private bindDialog() {
    // Bind solid panel sliders
    const $solidPanel = this.$dialog!.querySelector('.cp_panel-solid')
    if ($solidPanel) {
      const $hsvTrack = $solidPanel.querySelector('.cp_area-hsv')
      if ($hsvTrack) {
        this.hsvSlider = new Slider($hsvTrack as HTMLElement)
        this.hsvSlider.on('drag', (x, y) => {
          this._setNewColor(this._newColor.saturation(x).value(1 - y))
        })
      }

      const $hueTrack = $solidPanel.querySelector('.cp_slider-hue')
      if ($hueTrack) {
        this.hueSlider = new Slider($hueTrack as HTMLElement)
        this.hueSlider.on('drag', (x) => {
          this._setNewColor(this._newColor.hue(x * 360))
        })
      }

      const $alphaTrack = $solidPanel.querySelector('.cp_slider-alpha')
      if ($alphaTrack) {
        if (this.config.enableAlpha) {
          this.alphaSlider = new Slider($alphaTrack as HTMLElement)
          this.alphaSlider.on('drag', (x) => {
            this._setNewColor(this._newColor.alpha(x), true)
          })
        } else {
          ($alphaTrack as HTMLElement).remove()
        }
      }
    }

    // Bind gradient controls
    if (this.config.allowGradientSelection) {
      this.bindGradientControls()
    }

    // When clicking the eyedropper, the EyeDropper WebAPI will be invoked
    const $eyedrops = this.$dialog!.querySelectorAll('.cp_eyedrop')
    if (this.config.enableEyedropper && 'EyeDropper' in window) {
      $eyedrops.forEach(($eyedrop) => {
        $eyedrop.addEventListener('click', () => {
          new EyeDropper()
            .open()
            .then((result) => {
              const color = new Color(result.sRGBHex)
              this._setNewColor(color)
            })
            .catch(() => {})
        })
      })
    } else {
      $eyedrops.forEach(($eyedrop) => $eyedrop.remove())
    }

    // When clicking submit, dismiss dialog
    const $submits = this.$dialog!.querySelectorAll('.cp_submit')
    if ('confirm' === this.config.submitMode) {
      $submits.forEach(($submit) => {
        $submit.addEventListener('click', () => this.submit())
      })
    } else {
      $submits.forEach(($submit) => $submit.remove())
    }

    // When clicking clear, set color to null
    const $clears = this.$dialog!.querySelectorAll('.cp_clear')
    if (this.config.showClearButton) {
      $clears.forEach(($clear) => {
        $clear.addEventListener('click', () => {
          this.clear()
          this.close()
        })
      })
    } else {
      $clears.forEach(($clear) => $clear.remove())
    }

    // When changing the input value, update color
    this.$colorInput!.addEventListener('input', () => {
      try {
        const { color, format } = parseColor(this.$colorInput!.value)
        this.setFormat(format, false)
        this._setNewColor(new Color(color), false)
      } catch (error) {
        // do nothing
      }
    })

    // When pressing enter in the input, submit
    this.$colorInput!.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.submit()
    })

    // Dblclick input to copy color to clipboard
    this.$colorInput!.addEventListener('dblclick', () => {
      navigator.clipboard && navigator.clipboard.writeText(this.$colorInput!.value)
    })

    if (this.config.swatchesOnly) {
      const $iptGroup = this.$dialog!.querySelector('.cp_input-group')
      $iptGroup && $iptGroup.remove()

      const $formats = this.$dialog!.querySelector('.cp_formats')
      $formats && $formats.remove()

      // Remove elements in swatches-only mode
      this.$dialog!.querySelectorAll('.cp_slider-hue').forEach(el => el.remove())
      this.$dialog!.querySelectorAll('.cp_area-hsv').forEach(el => el.remove())
      this.$dialog!.querySelectorAll('.cp_slider-alpha').forEach(el => el.remove())
    }
  }

  private switchTab(tab: 'solid' | 'gradient') {
    this._gradientMode = tab === 'gradient'
    
    this.$tabs?.forEach(($tab) => {
      $tab.classList.toggle('active', $tab.dataset.tab === tab)
    })
    
    this.$panels?.forEach(($panel) => {
      $panel.classList.toggle('active', $panel.dataset.panel === tab)
    })

    if (this._gradientMode) {
      this._setNewColor(this._activeGradientColor === 'start' ? this._gradientStartColor : this._gradientEndColor)
    } else {
      this._setNewColor(this._color)
    }
  }

  private bindGradientControls() {
    this.$gradientColorButtons = Array.from(this.$dialog!.querySelectorAll('.cp_gradient-color-preview'))
    this.$angleInput = this.$dialog!.querySelector('.cp_angle-input') as HTMLInputElement
    this.$gradientPreview = this.$dialog!.querySelector('.cp_gradient-preview') as HTMLElement

    // Bind gradient panel sliders
    const $gradientPanel = this.$dialog!.querySelector('.cp_panel-gradient')
    if ($gradientPanel) {
      const $hsvTrack = $gradientPanel.querySelector('.cp_area-hsv')
      if ($hsvTrack) {
        this.gradientHsvSlider = new Slider($hsvTrack as HTMLElement)
        this.gradientHsvSlider.on('drag', (x, y) => {
          this._setNewColor(this._newColor.saturation(x).value(1 - y))
        })
      }

      const $hueTrack = $gradientPanel.querySelector('.cp_slider-hue')
      if ($hueTrack) {
        this.gradientHueSlider = new Slider($hueTrack as HTMLElement)
        this.gradientHueSlider.on('drag', (x) => {
          this._setNewColor(this._newColor.hue(x * 360))
        })
      }

      const $alphaTrack = $gradientPanel.querySelector('.cp_slider-alpha')
      if ($alphaTrack) {
        if (this.config.enableAlpha) {
          this.gradientAlphaSlider = new Slider($alphaTrack as HTMLElement)
          this.gradientAlphaSlider.on('drag', (x) => {
            this._setNewColor(this._newColor.alpha(x), true)
          })
        } else {
          ($alphaTrack as HTMLElement).remove()
        }
      }

      const $angleTrack = $gradientPanel.querySelector('.cp_slider-angle')
      if ($angleTrack) {
        this.angleSlider = new Slider($angleTrack as HTMLElement)
        this.angleSlider.on('drag', (x) => {
          this._gradientAngle = x * 360
          this.updateGradientAngle()
        })
      }
    }

    this.$gradientColorButtons.forEach(($button) => {
      $button.addEventListener('click', () => {
        this._activeGradientColor = $button.dataset.color as 'start' | 'end'
        this.updateGradientColorSelection()
        this._setNewColor(this._activeGradientColor === 'start' ? this._gradientStartColor : this._gradientEndColor)
      })
    })

    this.$angleInput?.addEventListener('input', () => {
      const value = parseInt(this.$angleInput!.value)
      if (!isNaN(value) && value >= 0 && value <= 360) {
        this._gradientAngle = value
        this.angleSlider?.move(value / 360)
        this.updateGradientPreview()
      }
    })

    this.updateGradientColorSelection()
    this.updateGradientAngle()
    this.updateGradientPreview()
  }

  private updateGradientColorSelection() {
    this.$gradientColorButtons?.forEach(($button) => {
      $button.classList.toggle('active', $button.dataset.color === this._activeGradientColor)
    })
  }

  private updateGradientAngle() {
    if (this.$angleInput) {
      this.$angleInput.value = this._gradientAngle.toString()
    }
    if (this.angleSlider) {
      this.angleSlider.move(this._gradientAngle / 360)
    }
    this.updateGradientPreview()
    
    // Emit gradient event in instant mode
    if (this.config.submitMode === 'instant' && this._gradientMode) {
      this._emitGradientEvent()
    }
  }

  private _emitGradientEvent() {
    this._hasGradient = true
    const gradientData: GradientData = {
      type: 'gradient',
      startColor: this._gradientStartColor,
      endColor: this._gradientEndColor,
      angle: this._gradientAngle
    }
    this.emit('pick', gradientData as any)
    if (this.$input) {
      this._firingChange = true
      const gradientString = `gradient(${this._gradientAngle}deg, ${this._gradientStartColor.string(this.config.defaultFormat)}, ${this._gradientEndColor.string(this.config.defaultFormat)})`
      this.$input.value = gradientString
      this.$input.dispatchEvent(new Event('change'))
      this._firingChange = false
    }
  }

  private updateGradientPreview() {
    if (this.$gradientPreview) {
      const startColor = this._gradientStartColor.string('hex')
      const endColor = this._gradientEndColor.string('hex')
      this.$gradientPreview.style.background = `linear-gradient(${this._gradientAngle}deg, ${startColor}, ${endColor})`
    }
    
    // Update the color preview divs
    this.$gradientColorButtons?.forEach(($button) => {
      const colorType = $button.dataset.color as 'start' | 'end'
      const color = colorType === 'start' ? this._gradientStartColor : this._gradientEndColor
      $button.style.background = `linear-gradient(${color.string('hex')}, ${color.string('hex')}), var(--cp-bg-checker)`
    })
  }

  private getAnimationDuration() {
    const computed = window.getComputedStyle(this.$toggle)
    const raw = computed.getPropertyValue('--cp-delay')
    return parseFloat(raw) * (raw.endsWith('ms') ? 1 : 1000)
  }

  /**
   * Close the picker dialog.
   * @param emit Emit event?
   */
  close(emit = true) {
    if (!this._open) return
    this._open = false

    currentlyOpen = undefined
    this.$button?.classList.remove('cp_open')

    const $dialog = this.$dialog
    const popper = this.popper

    this.$dialog = undefined
    this.popper = undefined

    $dialog?.classList.remove('cp_open')

    setTimeout(() => {
      $dialog?.remove()
      popper?.destroy()

      if (emit) this.emit('closed')
    }, this.getAnimationDuration())

    if (emit) this.emit('close')
  }

  /**
   * Submit the current color and close.
   * @param color The picked color value.
   * @param emit Emit event?
   */
  submit(color = this._newColor, emit = true) {
    if (this._gradientMode) {
      const gradientData: GradientData = {
        type: 'gradient',
        startColor: this._gradientStartColor,
        endColor: this._gradientEndColor,
        angle: this._gradientAngle
      }
      this._unset = false
      this._hasGradient = true  // Mark that this picker now has a gradient
      
      // Set gradient background immediately and persistently
      const gradientCSS = `linear-gradient(${this._gradientAngle}deg, ${this._gradientStartColor.string('hex')}, ${this._gradientEndColor.string('hex')})`
      const gradientString = `gradient(${this._gradientAngle}deg, ${this._gradientStartColor.string(this.config.defaultFormat)}, ${this._gradientEndColor.string(this.config.defaultFormat)})`

      if (this.$input) {
        this.$input.value = gradientString
        this.$input.dataset.color = gradientCSS
      }
      if (this.$toggle) this.$toggle.dataset.color = gradientCSS
      if (this.$button) {
        this.$button.classList.remove('cp_unset')
        // Force the gradient background to persist
        this.$button.style.background = `${gradientCSS}, var(--cp-bg-checker)`
      }
      
      if (emit) {
        this.emit('pick', gradientData as any)
        if (this.$input) {
          this._firingChange = true
          this.$input.dispatchEvent(new Event('change'))
          this._firingChange = false
        }
      }
    } else {
      this._hasGradient = false  // Submitting solid color clears gradient state
      this._setCurrentColor(color, emit, true)
    }
    this.close(emit)
  }

  /**
   * Destroy the picker and revert all HTML to what it was.
   */
  destroy() {
    this.close()
    this.$dialog?.remove()

    if (this.isInput) {
      if (!this.$input) return

      this.$toggle.removeChild(this.$input)
      this.$toggle.replaceWith(this.$input)

      // TODO: store the original state for these properties, and restore to it
      this.$input.classList.remove('cp_input')
      this.$input.removeAttribute('tabindex')
      this.$input.removeAttribute('readonly')

      if (this.changeHandler) this.$input.removeEventListener('change', this.changeHandler)
    } else {
      if (!this.$toggle) return

      // TODO: store the original state for these properties, and restore to it
      this.$toggle.classList.remove('color-picker', 'cp_open')
      this.$toggle.removeAttribute('data-color')
      this.$toggle.removeAttribute('type')
      this.$toggle.textContent = ''

      if (this.clickHandler) this.$toggle.removeEventListener('click', this.clickHandler)
    }
  }

  /**
   * Clear the picker color value.
   * @param emit Emit event?
   */
  clear(emit = true) {
    this._unset = true
    this._hasGradient = false  // Clear gradient state when clearing color
    this.updateAppliedColor(emit)
  }

  /**
   * Set the picker color value.
   * @param color The new color value.
   * @param emit Emit event?
   */
  setColor(color: Color | number[] | string | null, emit = true) {
    if (!color) return this.clear(emit)
    this._hasGradient = false  // Setting a solid color clears gradient state
    this._setCurrentColor(new Color(color), emit)
  }

  /**
   * Set the picker gradient value.
   * @param gradient The gradient data to set.
   * @param emit Emit event?
   */
  setGradient(gradient: GradientInput, emit = true) {
    // Convert string colors to Color objects internally
    this._gradientStartColor = new Color(gradient.startColor)
    this._gradientEndColor = new Color(gradient.endColor)
    this._gradientAngle = gradient.angle
    this._hasGradient = true
    this._unset = false

    // Set gradient background immediately
    const gradientCSS = `linear-gradient(${gradient.angle}deg, ${this._gradientStartColor.string('hex')}, ${this._gradientEndColor.string('hex')})`
    const gradientString = `gradient(${gradient.angle}deg, ${this._gradientStartColor.string(this.config.defaultFormat)}, ${this._gradientEndColor.string(this.config.defaultFormat)})`

    if (this.$input) {
      this.$input.value = gradientString
      this.$input.dataset.color = gradientCSS
    }
    if (this.$toggle) this.$toggle.dataset.color = gradientCSS
    if (this.$button) {
      this.$button.classList.remove('cp_unset')
      this.$button.style.background = `${gradientCSS}, var(--cp-bg-checker)`
    }

    if (emit) {
      // Emit the full GradientData with Color objects
      const gradientData: GradientData = {
        type: 'gradient',
        startColor: this._gradientStartColor,
        endColor: this._gradientEndColor,
        angle: gradient.angle
      }
      this.emit('pick', gradientData as any)
      if (this.$input) {
        this._firingChange = true
        this.$input.dispatchEvent(new Event('change'))
        this._firingChange = false
      }
    }
  }

  /**
   * Set the picker color format.
   * @param format The color format.
   * @param update Update colors?
   */
  setFormat(format: ColorFormat, update = true) {
    this._format = format
    this.updateFormat()
    if (update) {
      this.updateColor()
      this.updateAppliedColor(false)
    }
  }

  private _setNewColor(color: Color, updateInput = true) {
    this._newColor = color

    if (this._gradientMode) {
      if (this._activeGradientColor === 'start') {
        this._gradientStartColor = color
      } else {
        this._gradientEndColor = color
      }
      this.updateGradientPreview()
    }

    if (this.config.submitMode === 'instant' || this.config.swatchesOnly) {
      this._unset = false
      if (this._gradientMode) {
        // Emit gradient data in instant mode
        this._emitGradientEvent()
      } else {
        this._color = color
        this.updateAppliedColor(true)
      }
    }

    this.updateColor(updateInput)
  }

  private _setCurrentColor(color: Color, emit = true, updateInput = true) {
    this._unset = false
    this._newColor = this._color = color

    this.updateColor(updateInput)
    this.updateAppliedColor(emit)
  }

  private updateColor(updateInput = true) {
    const currentColor = this.color?.toString() ?? 'transparent'
    const newColorHex = this._newColor.string('hex')

    this.$dialog?.style.setProperty('--cp-base-color', newColorHex.substring(0, 7))
    
    this.$button?.style.setProperty('--cp-current-color', currentColor)
    
    this.$dialog?.style.setProperty('--cp-current-color', currentColor)
    this.$dialog?.style.setProperty('--cp-color', newColorHex)
    this.$dialog?.style.setProperty('--cp-hue', this._newColor.hue().toString())
    this.$dialog?.style.setProperty('--cp-alpha', this._newColor.alpha().toString())

    this.hsvSlider?.move(this._newColor.saturation(), 1 - this._newColor.value())
    this.hueSlider?.move(this._newColor.hue() / 360)
    this.alphaSlider?.move(this._newColor.alpha())

    // Also update gradient panel sliders when in gradient mode
    if (this._gradientMode) {
      this.gradientHsvSlider?.move(this._newColor.saturation(), 1 - this._newColor.value())
      this.gradientHueSlider?.move(this._newColor.hue() / 360)
      this.gradientAlphaSlider?.move(this._newColor.alpha())
    }

    if (updateInput && this.$colorInput) {
      this.$colorInput.value = this._newColor.string(this._format)
    }
  }

  private updateAppliedColor(emit = true) {
    const color = this._unset ? '' : this._color.string(this.config.defaultFormat)

    if (this.$input) {
      this.$input.value = color
      this.$input.dataset.color = color
    }
    if (this.$toggle) this.$toggle.dataset.color = color
    if (this.$button) this.$button.classList.toggle('cp_unset', this._unset)

    if (emit) {
      this.emit('pick', this.color)
      if (this.$input) {
        this._firingChange = true
        this.$input.dispatchEvent(new Event('change'))
        this._firingChange = false
      }
    }
  }

  private updateFormat() {
    if (!this.$formats) return
    this.$formats.forEach(($fmt) => $fmt.removeAttribute('aria-checked'))

    const $checked = this.$formats.find(($fmt) => $fmt.dataset.format === this._format)
    if ($checked) {
      $checked.ariaChecked = 'true'
    }
  }

  private updateSwatches() {
    if (!this.$dialog) return

    const $swatches = this.$dialog.querySelector('.cp_swatches')!
    $swatches.textContent = ''

    this._swatches.forEach((swatch) => {
      const $swatch = document.createElement('button')
      $swatch.className = 'cp_swatch'
      $swatch.style.setProperty('--cp-color', swatch)
      $swatch.dataset.color = swatch

      const color = new Color($swatch.dataset.color!)
      $swatch.addEventListener('click', () => {
        this._setNewColor(color)
        if (this.config.swatchesOnly) {
          this.close()
        }
      })

      $swatches.append($swatch)
    })
  }
}
