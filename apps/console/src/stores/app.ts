import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const isLoaded = ref(false);

  function setLoaded() {
    isLoaded.value = true;
  }

  return { isLoaded, setLoaded };
});
