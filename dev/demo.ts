import ColorPicker from '../src/index'

const getRandomColor = () => {
  return '#' + (((1 << 24) * Math.random()) | 0).toString(16).padStart(6, '0')
}

const pickers: ColorPicker[] = []

pickers.push(
  new ColorPicker('#picker1', {
    toggleStyle: 'input',
    showClearButton: true,
    //dismissOnEscape: false,
    //dismissOnOutsideClick: false,
    submitMode: 'instant', // 'instant' | 'confirm'
    // defaultFormat: 'hex', // 'hex' | 'rgb' | 'hsv' | 'hsl'
    defaultFormat: 'rgba',
    swatches: ['#d95d5d', '#db8525', '#e8c43c', '#bed649', '#9ecbdb', '#6399a5', '#c771a1'],
  }),

  new ColorPicker('#picker2', {
    toggleStyle: 'input',
    showClearButton: true,
    //dismissOnEscape: false,
    submitMode: 'confirm', // 'instant' | 'confirm'
    color: 'red',
    defaultFormat: 'rgb', // 'hex' | 'rgb' | 'hsv' | 'hsl'
  }),

  new ColorPicker('#picker3', {
    showClearButton: true,
    //dismissOnEscape: false,
    dismissOnOutsideClick: false,
    submitMode: 'instant', // 'instant' | 'confirm'
    // color: 'red',
    color: 'transparent',
    defaultFormat: 'hex', // 'hex' | 'rgb' | 'hsv' | 'hsl'
    swatches: [
      '#d95d5d',
      '#db8525',
      '#e8c43c',
      '#bed649',
      '#9ecbdb',
      '#6399a5',
      '#c771a1',
      'orange',
      'purple',
      'black',
      'white',
      'transparent',
    ],
  }),

  new ColorPicker('#picker4', {
    showClearButton: true,
    //dismissOnEscape: false,
    submitMode: 'confirm', // 'instant' | 'confirm'
    color: 'blue',
    defaultFormat: 'rgb', // 'hex' | 'rgb' | 'hsv' | 'hsl'
  }),

  new ColorPicker('#picker5', {
    defaultFormat: 'hex', // 'hex' | 'rgb' | 'hsv' | 'hsl'
    swatches: ['#d95d5d', '#db8525', '#e8c43c', '#bed649', '#9ecbdb', '#6399a5', '#c771a1'],
    swatchesOnly: true,
  }),

  new ColorPicker('#picker6', {
    allowGradientSelection: true,
    submitMode: 'instant', // 'instant' | 'confirm'
    color: 'red',
    defaultFormat: 'hex', // 'hex' | 'rgb' | 'hsv' | 'hsl'
    swatches: ['#d95d5d', '#db8525', '#e8c43c', '#bed649', '#9ecbdb', '#6399a5', '#c771a1'],
    gradient: {
      type: 'gradient',
      startColor: '#ff6b6b',
      endColor: '#4ecdc4',
      angle: 45
    }
  })
)

// @ts-ignore
window.pickers = pickers

// Bind events
for (let picker of pickers) {
  picker.on('open', () => console.log('open'))
  picker.on('opened', () => console.log('opened'))
  picker.on('close', () => console.log('close'))
  picker.on('closed', () => console.log('closed'))
  picker.on('pick', (color) => {
    console.log(`pick`, color)
    // Handle gradient data specially
    if (color && typeof color === 'object' && 'type' in color && color.type === 'gradient') {
      console.log(`Gradient: ${color.angle}° from ${color.startColor.string('hex')} to ${color.endColor.string('hex')}`)
    }
  })
}

document.getElementById('promptBtn')!.onclick = async (e) => {
  const $target = e.target as HTMLButtonElement | HTMLInputElement
  const picker = new ColorPicker($target, {
    headless: true,
    color: '#f00',
    swatches: ['#000', '#fff'],
  })
  const color = await picker.prompt()
  console.log('Selected color via prompt', color)
  $target.style.backgroundColor = color ? color.toString() : 'none'
}

document.getElementById('lightBtn')!.onclick = () => {
  document.documentElement.setAttribute('data-bs-theme', 'light')
}
document.getElementById('darkBtn')!.onclick = () => {
  document.documentElement.setAttribute('data-bs-theme', 'dark')
}
document.getElementById('destroyBtn')!.onclick = () => {
  for (let picker of pickers) {
    picker.destroy()
  }
}

for (const btn of document.querySelectorAll<HTMLElement>('.changeBtn')) {
  const $pickerEl = document.getElementById(btn.dataset.picker!) as HTMLInputElement
  btn.onclick = () => {
    $pickerEl.value = getRandomColor()
    $pickerEl.dispatchEvent(new Event('change'))
  }
}

for (const btn of document.querySelectorAll<HTMLElement>('.setBtn')) {
  btn.onclick = () => {
    const idx = +btn.dataset.picker!
    pickers[idx - 1].setColor(getRandomColor())
  }
}

for (const btn of document.querySelectorAll<HTMLElement>('.getBtn')) {
  btn.onclick = () => {
    const idx = +btn.dataset.picker!
    const picker = pickers[idx - 1]
    console.log(picker.color?.string('rgba'))
    
    // For gradient picker, also show the last picked value
    if (idx === 6) {
      console.log('Last picked value:', picker.color)
    }
  }
}

for (const btn of document.querySelectorAll<HTMLElement>('.swatchesBtn')) {
  btn.onclick = () => {
    const idx = +btn.dataset.picker!
    pickers[idx - 1].setSwatches(['red', 'green', 'blue'])
  }
}

for (const btn of document.querySelectorAll<HTMLElement>('.setGradientBtn')) {
  btn.onclick = () => {
    const idx = +btn.dataset.picker!
    pickers[idx - 1].setGradient({
      type: 'gradient',
      startColor: 'red',
      endColor: 'green',
      angle: 90
    })
  }
}

for (const btn of document.querySelectorAll<HTMLElement>('.showBtn')) {
  btn.onclick = () => {
    const idx = +btn.dataset.picker!
    pickers[idx - 1].show()
  }
}

for (const btn of document.querySelectorAll<HTMLElement>('.hideBtn')) {
  btn.onclick = () => {
    const idx = +btn.dataset.picker!
    pickers[idx - 1].hide()
  }
}

document.querySelector('#setValueBtn')!.addEventListener('click', () => {
  const picker = document.querySelector('#picker1') as HTMLInputElement
  picker.value = 'yellow'
  picker.dispatchEvent(new Event('change'))
})
