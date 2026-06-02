import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import EditorView from '@/views/EditorView.vue'
import TemplatesView from '@/views/TemplatesView.vue'
import SettingsView from '@/views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/templates', name: 'templates', component: TemplatesView },
    { path: '/settings', name: 'settings', component: SettingsView },
    {
      path: '/post/:id',
      name: 'editor',
      component: EditorView,
      props: true,
    },
  ],
})

export default router
