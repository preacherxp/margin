import type { Post, PostMeta } from '@/types/post'

const SAMPLE_IDS = {
  story: '01HXY1STORY0000000000000000',
  listicle: '01HXY1LSTIC0000000000000000',
  blogHowto: '01HXY1BLOGH0000000000000000',
  hotTake: '01HXY1HOTAK0000000000000000',
}

function meta(partial: Partial<PostMeta> & { id: string; title: string }): PostMeta {
  const now = new Date().toISOString()
  return {
    id: partial.id,
    title: partial.title,
    status: partial.status ?? 'draft',
    type: partial.type ?? 'linkedin',
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    scheduledFor: partial.scheduledFor ?? null,
    publishedAt: partial.publishedAt ?? null,
    tags: partial.tags ?? [],
    template: partial.template ?? null,
    path: partial.path ?? `/mock/${partial.id}.md`,
  }
}

export const SAMPLE_POSTS: Post[] = [
  {
    ...meta({
      id: SAMPLE_IDS.story,
      title: 'The day I shipped my first side project',
      status: 'draft',
      tags: ['career', 'shipping'],
      template: 'linkedin-story',
    }),
    linkedin: {
      hook: 'Three years ago I almost quit building side projects.',
      cta: 'What is the side project you keep coming back to?',
      hashtags: ['#buildinpublic', '#career'],
      audience: 'indie hackers and developers',
    },
    assets: [],
    versions: 2,
    body: `Three years ago I almost quit building side projects.\n\nI had three "almost launches" sitting in a private repo, each one killed by a fresh round of self-doubt.\n\nThe unlock wasn't motivation. It was a smaller loop:\n\n- Pick the smallest shippable thing\n- Cut scope until it embarrasses you\n- Show it to one person who is not your friend\n\nThat last step is the cheat code. Feedback from a stranger will save you months.\n\nIf you have a project collecting dust, this is your sign to shrink it and ship it this week.`,
  },
  {
    ...meta({
      id: SAMPLE_IDS.listicle,
      title: '5 things I wish I knew about prompt engineering',
      status: 'published',
      tags: ['ai', 'prompts'],
      template: 'linkedin-listicle',
      publishedAt: '2026-05-22T14:00:00.000Z',
    }),
    linkedin: {
      hook: 'Prompt engineering is mostly editing, not writing.',
      cta: 'Save this for your next prompt review.',
      hashtags: ['#ai', '#prompts', '#llm'],
      audience: 'engineers using LLMs in production',
    },
    assets: [],
    versions: 5,
    body: `5 things I wish I knew about prompt engineering:\n\n1. Examples beat instructions. Show, do not tell.\n2. Negative examples beat positive ones.\n3. Structure the output. Ask for JSON, sections, or step numbers.\n4. Test against adversarial inputs on day one.\n5. Version the prompt like code. Diff it. Review it.\n\nThe medium is text, but the discipline is engineering.`,
  },
  {
    ...meta({
      id: SAMPLE_IDS.hotTake,
      title: 'Hot take: the best LinkedIn hook is short',
      status: 'scheduled',
      type: 'linkedin',
      tags: ['linkedin', 'hooks'],
      scheduledFor: '2026-06-10T13:00:00.000Z',
    }),
    linkedin: {
      hook: 'Hot take: the best LinkedIn hook is short.',
      cta: 'Disagree? Tell me why in the comments.',
      hashtags: ['#linkedin', '#writing'],
      audience: 'people who write on LinkedIn',
    },
    assets: [],
    versions: 1,
    body: `Hot take: the best LinkedIn hook is short.\n\nNot clever. Not provocative. Short.\n\nThe scroll is faster than your first draft. If the first line does not land in 3 seconds, the rest of the post is invisible.\n\nTry rewriting your last 5 hooks in under 8 words. Watch what happens.`,
  },
  {
    ...meta({
      id: SAMPLE_IDS.blogHowto,
      title: 'How to draft a blog post in 90 minutes',
      status: 'draft',
      type: 'blog',
      tags: ['writing', 'process'],
      template: 'blog-how-to',
    }),
    linkedin: emptyLinkedin(),
    assets: [],
    versions: 0,
    body: `# How to draft a blog post in 90 minutes\n\nA boring, repeatable process beats inspiration.\n\n## 0-15 min: outline\n\nWrite 5 bullet points. That is the whole post.\n\n## 15-60 min: draft\n\nFill in each bullet. Do not edit. Do not research. Drafting is not editing.\n\n## 60-80 min: cut\n\nCut every sentence that does not earn its place. Cut the adverbs.\n\n## 80-90 min: title + hook\n\nWrite the title last. The hook is the post.`,
  },
]

function emptyLinkedin() {
  return { hook: '', cta: '', hashtags: [], audience: '' }
}
