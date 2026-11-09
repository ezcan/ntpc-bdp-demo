<script setup>
/**
 * SlotText — 逐字拉霸滾輪
 *
 * 每個字各自放在一個滾輪窗格裡（上下有內陰影）。呼叫 spin(text) 時：
 *   1. 所有滾輪同時快速往上捲動一長串隨機字
 *   2. 由左到右依序減速，停在結果字上，最後略帶回彈
 * spin() 回傳 Promise，最後一格停妥後 resolve。
 */
import { nextTick, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  /** 隨機字的來源字元（例如所有校名串起來） */
  pool: { type: String, required: true },
  /** 尚未轉動前顯示的字 */
  placeholder: { type: String, default: '？' },
  /** 窗格數（用於初始 placeholder） */
  placeholderLength: { type: Number, default: 3 },
  /** 色調：green | blue（與 ntpc-app-demo 品牌藍、成功綠對齊） */
  tone: { type: String, default: 'green' },
  /** 是否要用較緊湊的窗格尺寸（長句子用） */
  compact: { type: Boolean, default: false },
  /** 減少動態效果：直接顯示結果，不播動畫 */
  reducedMotion: { type: Boolean, default: false },
  /** 每一格停輪時的選用回呼（例如播放短音效） */
  onCellSettle: { type: Function, default: null },
})

// ---- 時間參數（一輪約 4 秒：轉動 ≤ 2.55s + 停留約 1.45s，由父層控制重轉間隔）----
const FIRST_STOP_MS = 1100 // 第一格停下的時間
const LAST_STOP_MAX_MS = 2550 // 最後一格最晚停下的時間
const MAX_STAGGER_MS = 160 // 相鄰兩格的最大停輪間隔
const MS_PER_CHAR = 68 // 平均每個隨機字的捲動時間（越小越快）
const BOUNCE_OVERSHOOT = 0.24 // 回彈超出量（以一格高度為單位）

const chars = Array.from(props.pool.replace(/\s/g, ''))
const randomChar = () => chars[Math.floor(Math.random() * chars.length)] ?? props.placeholder

/** cells: [{ strip: string[], target: number, settled: boolean }] */
const cells = ref(
  Array.from({ length: props.placeholderLength }, () => ({
    strip: [props.placeholder],
    target: 0,
    settled: false,
  })),
)
const strips = []
let animations = []
let settleTimers = []
let runId = 0

function cancelAnimations() {
  animations.forEach((a) => a.cancel())
  animations = []
  settleTimers.forEach((t) => clearTimeout(t))
  settleTimers = []
}

/** 依結果字建立每格的滾輪內容：[起始字, 隨機字…, 結果字, 額外字(回彈時露出)] */
function buildCells(text, timings) {
  return Array.from(text).map((finalChar, i) => {
    if (props.reducedMotion) return { strip: [finalChar], target: 0, settled: true }
    const spinCount = Math.max(9, Math.round(timings[i] / MS_PER_CHAR))
    const prevCell = cells.value[i]
    const startChar = prevCell ? prevCell.strip[prevCell.target] ?? randomChar() : randomChar()
    const strip = [startChar]
    for (let k = 0; k < spinCount; k++) strip.push(randomChar())
    strip.push(finalChar, randomChar())
    return { strip, target: strip.length - 2, settled: false }
  })
}

function computeTimings(n) {
  const stagger = n > 1 ? Math.min(MAX_STAGGER_MS, (LAST_STOP_MAX_MS - FIRST_STOP_MS) / (n - 1)) : 0
  return Array.from({ length: n }, (_, i) => Math.round(FIRST_STOP_MS + i * stagger))
}

async function spin(text) {
  const id = ++runId
  cancelAnimations()

  const charList = Array.from(text)
  const timings = computeTimings(charList.length)
  strips.length = charList.length
  cells.value = buildCells(text, timings)
  await nextTick()
  if (id !== runId || props.reducedMotion) return id === runId

  animations = cells.value
    .map((cell, i) => {
      const el = strips[i]
      if (!el) return null
      const step = 100 / cell.strip.length // 一格佔滾輪高度的百分比
      const end = -cell.target * step
      const over = -(cell.target + BOUNCE_OVERSHOOT) * step

      // 在該格即將停妥時標記 settled 並觸發回呼
      const timer = setTimeout(() => {
        if (id !== runId) return
        if (cells.value[i]) cells.value[i].settled = true
        if (props.onCellSettle) props.onCellSettle(i, charList.length)
      }, Math.max(0, timings[i] - 60))
      settleTimers.push(timer)

      return el.animate(
        [
          // 一開始即高速往上捲，隨後平滑減速
          { transform: 'translate3d(0,0,0)', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          // 稍微往上衝過頭……
          { transform: `translate3d(0,${over}%,0)`, offset: 0.87, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
          // ……再回彈停在結果字上
          { transform: `translate3d(0,${end}%,0)` },
        ],
        { duration: timings[i], fill: 'forwards' },
      )
    })
    .filter(Boolean)

  await Promise.all(animations.map((a) => a.finished.catch(() => null)))
  return id === runId
}

/** 不播動畫，直接顯示文字（例如減少動態效果時） */
function show(text) {
  runId++
  cancelAnimations()
  cells.value = Array.from(text).map((c) => ({ strip: [c], target: 0, settled: true }))
}

onBeforeUnmount(() => {
  runId++
  cancelAnimations()
})

defineExpose({ spin, show })
</script>

<template>
  <div class="slot-text" :class="[`tone-${tone}`, { compact }]" aria-hidden="true">
    <span
      v-for="(cell, i) in cells"
      :key="i"
      class="slot-cell"
      :class="{ settled: cell.settled }"
    >
      <span :ref="(el) => (strips[i] = el)" class="slot-strip">
        <span v-for="(ch, k) in cell.strip" :key="k" class="slot-char">{{ ch }}</span>
      </span>
    </span>
  </div>
</template>

<style scoped>
.slot-text {
  --cell-w: 1.32em;
  --cell-h: 1.58em;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  gap: 0.24em 0.18em;
  font-size: var(--slot-font-size);
  font-weight: 900;
  line-height: 1;
}

.slot-text.compact {
  --cell-w: 1.24em;
  --cell-h: 1.5em;
  gap: 0.22em 0.14em;
  font-size: var(--slot-font-size-compact);
}

/* 滾輪窗格：立體內凹窗格 + 上下明顯內陰影 */
.slot-cell {
  position: relative;
  width: var(--cell-w);
  height: var(--cell-h);
  overflow: hidden;
  border-radius: 0.28em;
  background: linear-gradient(
    180deg,
    #dceefb 0%,
    #ffffff 24%,
    #ffffff 76%,
    #dceefb 100%
  );
  border: 2px solid var(--c-line);
  box-shadow:
    inset 0 0.28em 0.36em -0.1em rgba(12, 58, 107, 0.42),
    inset 0 -0.28em 0.36em -0.1em rgba(12, 58, 107, 0.42),
    0 2px 6px rgba(15, 23, 42, 0.06);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

/* 停妥時窗格邊框微亮 */
.tone-blue .slot-cell.settled {
  border-color: #7dd3fc;
}
.tone-green .slot-cell.settled {
  border-color: #6ee7b7;
}

/* 上下漸層遮罩 + 中線高光：強化滾輪圓柱感與窗格上下內陰影 */
.slot-cell::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(12, 58, 107, 0.24) 0%,
    rgba(12, 58, 107, 0.05) 22%,
    transparent 36%,
    transparent 64%,
    rgba(12, 58, 107, 0.05) 78%,
    rgba(12, 58, 107, 0.24) 100%
  );
}

.slot-strip {
  display: flex;
  flex-direction: column;
  will-change: transform;
  backface-visibility: hidden;
}

.slot-char {
  display: grid;
  place-items: center;
  height: var(--cell-h);
  flex: none;
  letter-spacing: 0;
}

.tone-green {
  color: var(--c-success-700);
}

.tone-blue {
  color: var(--c-brand-700);
}
</style>
