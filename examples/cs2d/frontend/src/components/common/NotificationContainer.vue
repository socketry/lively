<template>
  <div class="notification-container">
    <TransitionGroup name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification"
        :class="notification.type"
        @click="removeNotification(notification.id)"
      >
        <div class="notification-content">
          <h4 v-if="notification.title" class="notification-title">
            {{ notification.title }}
          </h4>
          <p class="notification-message">{{ notification.message }}</p>
        </div>
        <button class="notification-close" @click.stop="removeNotification(notification.id)">
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const notifications = computed(() => appStore.notifications)

function removeNotification(id: string) {
  appStore.removeNotification(id)
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  pointer-events: none;
}

.notification {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  min-width: 300px;
  max-width: 400px;
  margin-bottom: 0.5rem;
  padding: 1rem;
  border-radius: 6px;
  background: #2a2a2a;
  border-left: 4px solid #666;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.3s ease;
}

.notification:hover {
  transform: translateX(-4px);
}

.notification.info {
  border-left-color: var(--cs-secondary);
}

.notification.success {
  border-left-color: var(--cs-success);
}

.notification.warning {
  border-left-color: var(--cs-warning);
}

.notification.error {
  border-left-color: var(--cs-danger);
}

.notification-content {
  flex: 1;
}

.notification-title {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--cs-light);
}

.notification-message {
  margin: 0;
  font-size: 0.85rem;
  color: var(--cs-gray);
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  color: var(--cs-gray);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.notification-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--cs-light);
}

/* Transition animations */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

@media (max-width: 768px) {
  .notification-container {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
  }
  
  .notification {
    min-width: auto;
    max-width: none;
  }
}
</style>