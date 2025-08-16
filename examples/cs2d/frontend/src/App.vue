<template>
  <div id="app">
    <Transition
      name="fade"
      mode="out-in"
    >
      <RouterView />
    </Transition>
    
    <!-- Global components -->
    <NotificationContainer />
    <LoadingOverlay v-if="isLoading" />
    <ConnectionStatus />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useWebSocketStore } from '@/stores/websocket'
import NotificationContainer from '@/components/common/NotificationContainer.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'
import ConnectionStatus from '@/components/common/ConnectionStatus.vue'

const appStore = useAppStore()
const wsStore = useWebSocketStore()
const { isLoading } = storeToRefs(appStore)

onMounted(() => {
  // Initialize app
  appStore.initialize()
  
  // Handle visibility change
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // Handle beforeunload
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

function handleVisibilityChange() {
  // Simple visibility handling
  console.log('Visibility changed:', document.hidden)
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  // Simple beforeunload handling
  console.log('Page unloading')
}
</script>

<style lang="scss">
@import '@/styles/variables';
@import '@/styles/transitions';

#app {
  min-height: 100vh;
  font-family: $font-family-base;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: $color-background;
  color: $color-text;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>