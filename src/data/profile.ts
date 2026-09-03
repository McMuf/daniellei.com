export type SocialLink = {
  label: string
  url: string
}

export const profile = {
  name: 'Daniel Lei',
  email: 'danielmdlei@gmail.com',
  social: [
    { label: 'linkedin', url: 'https://www.linkedin.com/in/dmdlei/' },
    { label: 'github', url: 'https://github.com/McMuf' },
  ] satisfies SocialLink[],
}
