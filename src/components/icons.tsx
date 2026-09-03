import type { IconType } from 'react-icons'
import {
  SiTypescript,
  SiReact,
  SiTailwindcss,
  SiVercel,
  SiPython,
  SiNumpy,
  SiPandas,
  SiScipy,
  SiJavascript,
  SiHtml5,
  SiCss,
  SiVite,
  SiNextdotjs,
  SiFastapi,
} from 'react-icons/si'
import { FaLinkedin, FaGithub, FaInstagram } from 'react-icons/fa'

// Only covers tags that have a real brand mark. Tags with no icon here
// (e.g. "DCF", "Equity Research") fall back to a plain text label.
export const TAG_ICONS: Record<string, IconType> = {
  TypeScript: SiTypescript,
  React: SiReact,
  'Tailwind CSS': SiTailwindcss,
  Vercel: SiVercel,
  Python: SiPython,
  NumPy: SiNumpy,
  Pandas: SiPandas,
  SciPy: SiScipy,
  JavaScript: SiJavascript,
  HTML: SiHtml5,
  CSS: SiCss,
  Vite: SiVite,
  'Next.js': SiNextdotjs,
  FastAPI: SiFastapi,
}

// Official brand hex per icon. Vercel/GitHub/Next.js ship as near-black,
// which disappears on this site's dark background, so those are swapped for
// their documented light/dark-mode variant instead of the literal brand
// black. NumPy/Pandas similarly swap their very dark navy for the lighter
// accent color already present in their own two-tone logos.
export const TAG_ICON_COLORS: Record<string, string> = {
  TypeScript: '#3178C6',
  React: '#61DAFB',
  'Tailwind CSS': '#06B6D4',
  Vercel: '#FFFFFF',
  Python: '#3776AB',
  NumPy: '#4DABCF',
  Pandas: '#E70488',
  SciPy: '#8CAAE6',
  JavaScript: '#F7DF1E',
  HTML: '#E34F26',
  CSS: '#1572B6',
  Vite: '#BD34FE',
  'Next.js': '#FFFFFF',
  FastAPI: '#009688',
}

export const SOCIAL_ICONS: Record<string, IconType> = {
  linkedin: FaLinkedin,
  github: FaGithub,
}

export const SOCIAL_ICON_COLORS: Record<string, string> = {
  linkedin: '#0A66C2',
  github: '#FFFFFF',
}

export const INSTAGRAM_COLOR = '#E4405F'

export { FaInstagram }
