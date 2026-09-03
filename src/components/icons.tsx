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

export const SOCIAL_ICONS: Record<string, IconType> = {
  linkedin: FaLinkedin,
  github: FaGithub,
}

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
