# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start dev server with hot reload (opens to /dev/)
- `npm run tsc` - Run TypeScript compiler with pretty output
- `npm run build` - Build library using Vite
- `npm run preview` - Preview built library
- `npm run format` - Format source code with Prettier

### Build & Distribution
- `sh build.sh` - Full build pipeline with minification (generates types, builds, minifies)
  - Auto-detects package manager (bun or npm)
  - Generates TypeScript definitions
  - Builds both IIFE and ES module formats
  - Minifies all JS/CSS files to .min versions

## Architecture

This is a JavaScript Color Picker library built with TypeScript and Vite. The project creates a zero-dependency color picker component that can be used in web applications.

### Core Structure

- **Main Class**: `ColorPicker` in `src/core/ColorPicker.ts` - Main component extending EventEmitter
- **Color Engine**: `Color` class in `src/lib/Color.ts` - Handles color conversions and manipulations
- **Slider Component**: `Slider` class in `src/core/Slider.ts` - Handles draggable slider interactions
- **Configuration**: `src/core/config.ts` - Default configuration and type definitions

### Key Features

- Multiple color formats (hex, rgb, hsv, hsl)
- Alpha transparency support
- Color swatches
- EyeDropper API integration (Chrome/Edge)
- Popper.js positioning
- Dark/light theme support
- Multiple toggle styles (button/input)
- Event-driven architecture (open, close, pick events)

### Build Output

- Library formats: IIFE and ES modules
- CSS included as separate file
- TypeScript definitions generated
- Minified versions created by build script

### Configuration System

The picker uses a comprehensive configuration system defined in `PickerConfig` interface:
- Toggle behavior (button/input/headless modes)
- Color format selection
- Submit modes (instant/confirm)
- Dialog positioning
- Feature toggles (alpha, eyedropper, swatches)

### Dependencies

- **@popperjs/core**: Dialog positioning
- **events**: EventEmitter polyfill
- **TypeScript**: Type checking and compilation
- **Vite**: Build system and dev server
- **esbuild**: Minification (via build script)