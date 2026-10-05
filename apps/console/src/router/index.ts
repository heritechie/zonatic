import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import OverviewView from '../views/OverviewView.vue';
import ApiKeysView from '../views/ApiKeysView.vue';
import ComingSoonView from '../views/ComingSoonView.vue';

/**
 * Console routes.
 *
 * Canonical Console URL is https://console.zonatic.id/
 *
 * Structure (top-level routes under the console subdomain):
 *   /              → Overview
 *   /login         → Login
 *   /data          → Data (placeholder)
 *   /zona          → Zona (placeholder)
 *   /rules         → Rules (placeholder)
 *   /api           → API Keys
 *   /settings      → Settings (placeholder)
 *
 * Legacy compatibility: /console redirects to /.
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewView },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/data',
      name: 'data',
      component: ComingSoonView,
      props: {
        title: 'Data',
        summary: 'Analyze and enrich your location datasets.',
      },
    },
    {
      path: '/zona',
      name: 'zona',
      component: ComingSoonView,
      props: {
        title: 'Zona',
        summary: 'Define geographic zones for your business context.',
      },
    },
    {
      path: '/rules',
      name: 'rules',
      component: ComingSoonView,
      props: {
        title: 'Rules',
        summary: 'Turn location context into reusable business rules.',
      },
    },
    {
      path: '/api',
      name: 'api',
      component: ApiKeysView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: ComingSoonView,
      props: {
        title: 'Settings',
        summary: 'Workspace and account settings will be available soon.',
      },
    },
    { path: '/console', redirect: '/' },
    { path: '/console/api-keys', redirect: '/api' },
    { path: '/console/data', redirect: '/data' },
    { path: '/console/zona', redirect: '/zona' },
    { path: '/console/rules', redirect: '/rules' },
    { path: '/console/settings', redirect: '/settings' },
    { path: '/api-keys', redirect: '/api' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.initialising) {
    await auth.initialise();
  }
  if (to.meta.public) {
    return auth.isAuthenticated ? { name: 'overview' } : true;
  }
  return auth.isAuthenticated ? true : { name: 'login' };
});

export default router;
