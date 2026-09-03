import type { IconType } from 'react-icons'
import type { SVGProps } from 'react'
import {
  SiTypescript,
  SiReact,
  SiTailwindcss,
  SiVercel,
  SiPython,
  SiNumpy,
  SiPandas,
  SiScipy,
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
}

// Official brand hex per icon. Vercel/GitHub ship as near-black, which
// disappears on this site's dark background, so those two are swapped for
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

// No official crest mark exists in any icon set, so this is a small
// original shield glyph rather than a reproduction of UW's actual crest.
export function WaterlooIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M2 3.6 12 1l10 2.6v8.8c0 6.9-4.4 11.3-10 14.2-5.6-2.9-10-7.3-10-14.2Z" />
      <path d="M7.2 12.6 10.6 16 17 9.2" />
    </svg>
  )
}
