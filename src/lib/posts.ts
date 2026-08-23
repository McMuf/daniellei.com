import { parseFrontmatter } from './frontmatter'

export type Post = {
  slug: string
  title: string
  date: string
  sector?: string
  summary?: string
  tags?: string[]
  content: string
}

// Eagerly load every post as raw text at build time. Files starting with
// "_" (e.g. _template.md) are treated as authoring templates, not posts.
const modules = import.meta.glob('/src/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function slugFromPath(path: string) {
  return path.split('/').pop()!.replace(/\.md$/, '')
}

export const posts: Post[] = Object.entries(modules)
  .filter(([path]) => !path.split('/').pop()!.startsWith('_'))
  .map(([path, raw]) => {
    const { data, content } = parseFrontmatter(raw)
    return {
      slug: (data.slug as string) || slugFromPath(path),
      title: (data.title as string) || 'untitled',
      date: (data.date as string) || '',
      sector: data.sector as string | undefined,
      summary: data.summary as string | undefined,
      tags: data.tags as string[] | undefined,
      content,
    }
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1))

export function getPost(slug: string) {
  return posts.find(p => p.slug === slug)
}
