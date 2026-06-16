import DefaultTheme from 'vitepress/theme'
import FlowDiagram from './FlowDiagram.vue'
import BrainDiagram from './BrainDiagram.vue'
import RoughDiagram from './RoughDiagram.vue'
import type { Theme } from 'vitepress'
import '@fontsource/kalam/400.css'
import '@fontsource/kalam/700.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('FlowDiagram', FlowDiagram)
    app.component('BrainDiagram', BrainDiagram)
    app.component('RoughDiagram', RoughDiagram)
  }
} satisfies Theme
