/**
 * TradePlus SVG Icon Library
 * Consistent 24x24 icons (Lucide-style) to replace all emojis
 */

// Generate SVG markup from path data
function icon(paths, opts = {}) {
  const { viewBox = '0 0 24 24', stroke = 'currentColor', strokeWidth = 2, fill = 'none', size = 24 } = opts
  const pathEls = Array.isArray(paths) ? paths.map(d => `<path d="${d}"/>`).join('') : `<path d="${paths}"/>`
  return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${pathEls}</svg>`
}

// Brand / Logo
export const iconDiamond = (size = 24) => icon('M2.5 10.5 12 3l9.5 7.5L12 21 2.5 10.5z', { size })

// Navigation & UI
export const iconMenu = (size = 24) => icon('M3 5h18M3 12h18M3 19h18', { size })
export const iconSearch = (size = 24) => icon(['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M21 21l-4.35-4.35'], { size })
export const iconX = (size = 24) => icon(['M18 6 6 18', 'M6 6l12 12'], { size })
export const iconArrowRight = (size = 24) => icon('M5 12h14M12 5l7 7-7 7', { size })
export const iconArrowLeft = (size = 24) => icon('M19 12H5M12 19l-7-7 7-7', { size })
export const iconChevronRight = (size = 24) => icon('M9 18l6-6-6-6', { size })
export const iconChevronLeft = (size = 24) => icon('M15 18l-6-6 6-6', { size })
export const iconExternalLink = (size = 24) => icon(['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'M15 3h6v6', 'M10 14 21 3'], { size })

// Social & Contact
export const iconMail = (size = 24) => icon(['M22 7.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.5', 'M22 7.5 14.3 13a2 2 0 0 1-2.3.2L2 7.5'], { size })
export const iconPhone = (size = 24) => icon('M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z', { size })
export const iconMapPin = (size = 24) => icon(['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z', 'M12 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'], { size })

// Features & Benefits
export const iconCheck = (size = 24) => icon('M20 6 9 17l-5-5', { size })
export const iconStar = (size = 24) => icon('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', { size, fill: 'none' })
export const iconZap = (size = 24) => icon('M13 2 3 14h9l-1 8 10-12h-9l1-8z', { size })
export const iconShield = (size = 24) => icon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', { size })
export const iconGlobe = (size = 24) => icon(['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'], { size })
export const iconLifeBuoy = (size = 24) => icon(['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M4.93 4.93l4.24 4.24', 'M14.83 14.83l4.24 4.24', 'M14.83 9.17l4.24-4.24', 'M14.83 9.17l-5.66 5.66', 'M4.93 19.07l4.24-4.24'], { size })
export const iconPackage = (size = 24) => icon(['M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z', 'M2.32 6.16 12 11l9.68-4.84', 'M12 22.76V11', 'M7 3.5L17 8.5'], { size })
export const iconTruck = (size = 24) => icon(['M1 3h15v13H1z', 'M16 8h4l3 3v5h-7V8z', 'M5.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'], { size })
export const iconClock = (size = 24) => icon(['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'], { size })
export const iconLock = (size = 24) => icon(['M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'], { size })
export const iconEye = (size = 24) => icon(['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'], { size })
export const iconHeadphones = (size = 24) => icon('M3 18v-6a9 9 0 0 1 18 0v6', { size })

// Content
export const iconNewspaper = (size = 24) => icon(['M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0V8', 'M4 8h12v14', 'M8 4v4'], { size })

// Play (for video/youtube social)
export const iconPlay = (size = 24) => icon('M5 3l14 9-14 9V3z', { size, fill: 'currentColor', stroke: 'none' })
