export type SocialLink = {
  label: string
  url: string
}

export const profile = {
  name: 'Daniel Lei',
  tagline: 'Math, Computer Science & Finance @ University of Waterloo',
  bio: [
    'I\'m an incoming Computing and Financial Management (Math, CS & Finance) student at the University of Waterloo. I like building at the intersection of software and markets — equity research models, portfolio optimization, and production web apps.',
    'Peg Campbell Award recipient (top GPA, 98/100) and AP Scholar with Distinction. Outside of coursework I chair vsHacks, co-founded the Conceptus Foundation, and build finance & tech infrastructure for UW Excel.',
  ],
  email: 'danielmdlei@gmail.com',
  social: [
    { label: 'linkedin', url: 'https://www.linkedin.com/in/dmdlei/' },
    { label: 'github', url: 'https://github.com/McMuf' },
  ] satisfies SocialLink[],
}
