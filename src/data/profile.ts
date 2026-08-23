export type SocialLink = {
  label: string
  url: string
}

export const profile = {
  name: 'Daniel Lei',
  tagline: 'Math, Computer Science & Finance @ University of Waterloo',
  bio: [
    'An avid thinker interested in the markets and cs. Surprisingly adept at lifting heavy circles!'

  ],
  email: 'danielmdlei@gmail.com',
  social: [
    { label: 'linkedin', url: 'https://www.linkedin.com/in/dmdlei/' },
    { label: 'github', url: 'https://github.com/McMuf' },
  ] satisfies SocialLink[],
}
