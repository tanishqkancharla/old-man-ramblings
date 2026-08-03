export type Post = {
  id: string
  title: string
  excerpt: string
  date: string
}

export const posts: Post[] = [
  {
    id: '1',
    title: 'Notes on agentic coding',
    excerpt:
      'What happens when you stop treating the model as a chatbot and start treating it as a collaborator that can touch the filesystem, run commands, and iterate.',
    date: '2026-07-12',
  },
  {
    id: '2',
    title: 'The old man and the terminal',
    excerpt:
      'A short ramble about why CLI tools still win for thinking, and why GUIs keep losing the argument despite looking nicer.',
    date: '2026-06-28',
  },
  {
    id: '3',
    title: 'Context windows are not memory',
    excerpt:
      'People keep calling long context "memory." It is not. It is a whiteboard you keep rewriting, and the eraser is always lurking.',
    date: '2026-06-03',
  },
  {
    id: '4',
    title: 'On shipping ugly first',
    excerpt:
      'Finish the loop. Polish is a luxury of systems that already work. Most "craft" talk is procrastination in nicer clothes.',
    date: '2026-05-19',
  },
  {
    id: '5',
    title: 'Local models, remote habits',
    excerpt:
      'Running models on your own machine changes the economics, but not the discipline. You still need taste, tests, and a willingness to delete.',
    date: '2026-04-30',
  },
  {
    id: '6',
    title: 'Reading code like a detective',
    excerpt:
      'Start from the symptom. Follow the data. Ignore the architecture diagrams until the facts force you to care about them.',
    date: '2026-04-08',
  },
  {
    id: '7',
    title: 'Small tools, sharp edges',
    excerpt:
      'Prefer programs that do one thing well enough to hurt when misused. Soft, forgiving tools teach soft, forgiving thinking.',
    date: '2026-03-22',
  },
  {
    id: '8',
    title: 'Why I still write by hand',
    excerpt:
      'Not because paper is romantic. Because friction slows the wrong kind of speed — the kind that fills pages without saying anything.',
    date: '2026-02-14',
  },
]
