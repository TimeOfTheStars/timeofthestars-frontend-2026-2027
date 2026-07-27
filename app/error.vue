<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error.statusCode === 404)

const title = computed(() => (is404.value ? 'Страница не найдена' : 'Что-то пошло не так'))

const explain = computed(() => {
  if (is404.value) {
    return 'Возможно, соревнование, команда или игрок были удалены, либо в ссылке опечатка.'
  }
  // 5xx у этого API чаще всего значит, что бэкенд не поднят или перезапускается
  return 'Не удалось получить данные от сервера лиги. Обычно это временно — попробуйте обновить страницу.'
})

useHead({ title: title.value })
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader />

    <main class="container-page flex flex-1 items-center py-16">
      <div class="mx-auto max-w-md text-center">
        <p class="text-6xl font-extrabold text-rule-strong">
          {{ error.statusCode }}
        </p>

        <h1 class="mt-4 text-2xl font-extrabold">
          {{ title }}
        </h1>

        <p class="mt-3 text-muted">
          {{ explain }}
        </p>

        <p
          v-if="error.statusMessage && !is404"
          class="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted"
        >
          {{ error.statusMessage }}
        </p>

        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-fg"
            @click="clearError({ redirect: '/' })"
          >
            <AppIcon name="home" />
            На главную
          </button>

          <button
            v-if="!is404"
            type="button"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rule px-5 font-semibold"
            @click="reloadNuxtApp()"
          >
            <AppIcon name="refresh" />
            Обновить
          </button>
        </div>
      </div>
    </main>

    <AppFooter />
  </div>
</template>
