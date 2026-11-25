export type SocialLink = {
  label: string
  url: string
}

export const profile = {
  name: 'Daniel Lei',
  email: 'danielmdlei@gmail.com',
  instagram: { handle: '@dandoesdev_', url: 'https://www.instagram.com/dandoesdev_/' },
  social: [
    { label: 'github', url: 'https://github.com/McMuf' },
    { label: 'linkedin', url: 'https://www.linkedin.com/in/dmdlei/' },
    { label: 'instagram', url: 'https://www.instagram.com/dandoesdev_/' },
  ] satisfies SocialLink[],
}
