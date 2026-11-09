import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 追蹤使用者的「減少動態效果」設定（iPadOS：設定 → 輔助使用 → 動作 → 減少動態效果）。
 */
export function useReducedMotion() {
  const reduced = ref(false)
  let mql

  const update = () => {
    reduced.value = mql.matches
  }

  onMounted(() => {
    mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    update()
    mql.addEventListener('change', update)
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', update)
  })

  return reduced
}

