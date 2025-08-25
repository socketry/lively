// Make Tailwind PostCSS plugin optional to prevent devDep-related crashes in CI/E2E
const plugins = []

try {
  const mod = (await import('@tailwindcss/postcss')).default
  plugins.push(mod())
} catch {
  try {
    const fallback = (await import('tailwindcss')).default
    plugins.push(fallback())
  } catch {
    // no tailwind plugin available; continue without it
  }
}

try {
  const autoprefixer = (await import('autoprefixer')).default
  plugins.push(autoprefixer())
} catch {
  // skip autoprefixer if missing
}

export default {
  plugins,
}
