import { defineConfig } from 'vitepress'
import container from 'markdown-it-container'
import type { RenderRule } from 'markdown-it/lib/renderer'

export default defineConfig({
  base: '/afk/',
  title: 'afk',
  description: 'A simple coding flow for Claude Code with a persistent brain memory vault.',
  lang: 'en-US',
  lastUpdated: true,

  // Scratch/working files (e.g. tmp/) live under the docs root but are not pages.
  srcExclude: ['tmp/**'],

  markdown: {
    // Register Starlight-style custom asides: ::: principle / ::: gotcha
    config(md) {
      for (const type of ['principle', 'gotcha'] as const) {
        const label = type === 'principle' ? 'Principle' : 'Gotcha'
        const render: RenderRule = (tokens, idx) => {
          const token = tokens[idx]
          const title = token.info.trim().slice(type.length).trim() || label
          return token.nesting === 1
            ? `<div class="custom-block ${type}"><p class="custom-block-title">${title}</p>\n`
            : `</div>\n`
        }
        md.use(container, type, { render })
      }
    }
  },

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Reference', link: '/reference/help' }
    ],

    sidebar: [
      {
        text: 'Get Started',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Quickstart', link: '/guide/quickstart' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'The AFK Flow', link: '/concepts/the-afk-flow' },
          { text: 'The Brain Vault', link: '/concepts/the-brain-vault' },
          { text: 'Eval-first', link: '/concepts/eval-first' }
        ]
      },
      {
        text: 'Reference',
        items: [
          {
            text: 'Flow Skills',
            collapsed: false,
            items: [
              { text: 'help', link: '/reference/help' },
              { text: 'ship', link: '/reference/ship' },
              { text: 'grill', link: '/reference/grill' },
              { text: 'research', link: '/reference/research' },
              { text: 'prototype', link: '/reference/prototype' },
              { text: 'implement', link: '/reference/implement' },
              { text: 'batch', link: '/reference/batch' },
              { text: 'simplify', link: '/reference/simplify' },
              { text: 'qa', link: '/reference/qa' },
              { text: 'write-good-goal', link: '/reference/write-good-goal' },
              { text: 'write-evals', link: '/reference/write-evals' }
            ]
          },
          {
            text: 'Brain Skills',
            collapsed: false,
            items: [
              { text: 'init-brain', link: '/reference/init-brain' },
              { text: 'brain', link: '/reference/brain' },
              { text: 'map-codebase', link: '/reference/map-codebase' },
              { text: 'reflect', link: '/reference/reflect' },
              { text: 'ruminate', link: '/reference/ruminate' },
              { text: 'meditate', link: '/reference/meditate' },
              { text: 'plan', link: '/reference/plan' },
              { text: 'review', link: '/reference/review' }
            ]
          }
        ]
      },
      {
        text: 'Contributing',
        items: [
          { text: 'Testing Strategy', link: '/contributing/testing' }
        ]
      }
    ],

    search: {
      provider: 'local'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/alexanderop/afk' }
    ]
  }
})
