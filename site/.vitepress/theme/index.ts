import DefaultTheme from 'vitepress/theme'
import Flow from './Flow.vue'
import type { Theme } from 'vitepress'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Flow', Flow)
  }
} satisfies Theme
