import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import SettingsView from '@/views/SettingsView.vue'

const EditorView = () => import('@/views/EditorView.vue')
const TemplatesView = () => import('@/views/TemplatesView.vue')

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
