<script setup>
import { computed, ref } from 'vue'
import SlotText from './components/SlotText.vue'
import { useReducedMotion } from './composables/useReducedMotion.js'
import { useSlotMachine } from './composables/useSlotMachine.js'
import { useAudioSfx } from './composables/useAudioSfx.js'
import { useConfetti } from './composables/useConfetti.js'
import { questionBank, schoolData } from './data/quiz.js'

const reducedMotion = useReducedMotion()
const { isSfxEnabled, playTapSFX, playTickSFX, playSuccessSFX, toggleSFX, unlockAudio } = useAudioSfx()
const { startOfflineConfetti } = useConfetti()

const confettiCanvasRef = ref(null)
const ctaBtnRef = ref(null)

// 隨機字來源：各自取自同類型資料，轉動時看起來更有「這一格的味道」
const pools = {
  district: schoolData.map((s) => s.district).join(''),
  school: schoolData.map((s) => s.name).join(''),
  question: questionBank.join('').replace(/[（）？，]/g, ''),
}

const districtReel = ref(null)
const schoolReel = ref(null)
const questionReel = ref(null)

const { mode, paused, result, status, draw, togglePause, resumeAttract } = useSlotMachine(
  { district: districtReel, school: schoolReel, question: questionReel },
  reducedMotion,
  {
    onDrawComplete() {
      playSuccessSFX()
      if (!reducedMotion.value) {
        const rect = ctaBtnRef.value?.getBoundingClientRect()
        const origin = rect
          ? { x: rect.left + rect.width / 2, y: rect.top }
          : undefined
        startOfflineConfetti(confettiCanvasRef.value, origin)
      }
    },
  },
)

function onAnyTouch() {
  unlockAudio()
}

function handleDraw() {
  playTapSFX()
  draw()
}

function handleTogglePause() {
  playTapSFX()
  togglePause()
}

function handleResumeAttract() {
  playTapSFX()
  resumeAttract()
}

function onSchoolCellSettle(idx) {
  if (mode.value === 'spinning') {
    playTickSFX(idx)
  }
}

const buttonLabel = computed(() =>
  mode.value === 'spinning' ? '出題運轉中…' : mode.value === 'done' ? '再抽一題' : '開始出題',
)

const statusBadgeText = computed(() => {
  if (mode.value === 'spinning') return '題目抽選中…'
  if (mode.value === 'done') return '抽題完成！請前往大數據平台查詢答案'
  return paused.value ? '展示已暫停' : '自動展示中（每 4 秒換題）'
})
</script>

<template>
  <div class="kiosk-shell" @pointerdown.capture="onAnyTouch" @contextmenu.prevent>
    <div class="kiosk-stage">
      <!-- 頂部品牌列：精簡純淨版（僅保留新北 AI 教育局標誌、主標題、展示與音效控制） -->
      <header class="kiosk-header">
        <img src="./assets/aiedu.png" alt="新北市政府教育局" class="org-logo" />
        <span class="divider" aria-hidden="true"></span>

        <div class="brand-text">
          <div class="brand-line">
            <h1 class="app-name">新北市教育資料出題機</h1>
            <span class="tagline">教育大數據互動挑戰</span>
          </div>
          <p class="sub-title">轉動拉霸抽出指定學校與問題，探索新北市教育數據寶庫</p>
        </div>

        <div class="header-right">
          <button
            v-if="!reducedMotion"
            type="button"
            class="header-pill-btn"
            :class="{ active: mode === 'attract' && paused }"
            :disabled="mode === 'spinning'"
            :aria-pressed="mode === 'attract' ? paused : undefined"
            :aria-label="
              mode === 'done'
                ? '返回 4 秒自動輪播展示模式'
                : paused
                  ? '播放自動展示'
                  : '暫停自動展示'
            "
            @click="mode === 'done' ? handleResumeAttract() : handleTogglePause()"
          >
            <!-- 返回自動展示（done 狀態） -->
            <svg v-if="mode === 'done'" viewBox="0 0 256 256" aria-hidden="true">
              <path
                fill="currentColor"
                d="M224 128a96 96 0 0 1-94.71 96H128a95.38 95.38 0 0 1-65.9-26.28 8 8 0 0 1 11-11.64A80 80 0 1 0 71.43 71.39l26.91 26.92A8 8 0 0 1 92.69 112H40a8 8 0 0 1-8-8V51.31a8 8 0 0 1 13.66-5.65L60.15 60.1A96 96 0 0 1 224 128Z"
              />
            </svg>
            <!-- 播放圖示（已暫停） -->
            <svg v-else-if="paused" viewBox="0 0 256 256" aria-hidden="true">
              <path
                fill="currentColor"
                d="M240 128a15.74 15.74 0 0 1-7.6 13.51L88.32 229.65a16 16 0 0 1-16.2.3A15.86 15.86 0 0 1 64 216.13V39.87a15.86 15.86 0 0 1 8.12-13.82 16 16 0 0 1 16.2.3l144.08 88.14A15.74 15.74 0 0 1 240 128Z"
              />
            </svg>
            <!-- 暫停圖示（自動展示中 / 出題運轉中） -->
            <svg v-else viewBox="0 0 256 256" aria-hidden="true">
              <path
                fill="currentColor"
                d="M216 48v160a16 16 0 0 1-16 16h-40a16 16 0 0 1-16-16V48a16 16 0 0 1 16-16h40a16 16 0 0 1 16 16ZM96 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Z"
              />
            </svg>
            <span>{{
              mode === 'done' ? '自動展示' : paused ? '播放展示' : '暫停展示'
            }}</span>
          </button>

          <button
            type="button"
            class="sfx-toggle"
            :class="{ muted: !isSfxEnabled }"
            :aria-pressed="isSfxEnabled"
            :aria-label="isSfxEnabled ? '關閉音效' : '開啟音效'"
            @click="toggleSFX"
          >
            <!-- Speaker High (Phosphor SVG) -->
            <svg v-if="isSfxEnabled" viewBox="0 0 256 256" aria-hidden="true">
              <path
                fill="currentColor"
                d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19ZM192 96a8 8 0 0 0-8 8v48a8 8 0 0 0 16 0v-48a8 8 0 0 0-8-8Zm32-24a8 8 0 0 0-8 8v96a8 8 0 0 0 16 0V80a8 8 0 0 0-8-8Z"
              />
            </svg>
            <!-- Speaker Slash (Phosphor SVG) -->
            <svg v-else viewBox="0 0 256 256" aria-hidden="true">
              <path
                fill="currentColor"
                d="M53.92 34.62a8 8 0 1 0-11.84 10.76L73.55 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224v-46.09l42.08 46.29a8 8 0 1 0 11.84-10.76Zm106.08 71.15V32a8 8 0 0 0-12.91-6.31l-39.85 31 52.76 58.08Z"
              />
            </svg>
          </button>
        </div>
      </header>

      <!-- 中央拉霸主舞台面板（針對 iPad 直式與橫式最佳化的 Bento 卡片佈局） -->
      <main class="slot-panel" :class="mode">
        <div class="panel-top-bar">
          <div class="panel-badges">
            <span class="q-badge">
              <svg viewBox="0 0 256 256" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M176 232a8 8 0 0 1-8 8H88a8 8 0 0 1 0-16h80a8 8 0 0 1 8 8Zm40-128a87.55 87.55 0 0 1-33.64 69.21A16.24 16.24 0 0 0 176 186v6a16 16 0 0 1-16 16H96a16 16 0 0 1-16-16v-6a16 16 0 0 0-6.23-12.66A87.59 87.59 0 0 1 40 104.49C39.74 56.83 78.26 17.14 125.88 16A88 88 0 0 1 216 104Z"
                />
              </svg>
              <span>抽題結果</span>
            </span>

            <span class="q-status-pill" :class="mode">
              <span class="status-dot" aria-hidden="true"></span>
              <span>{{ statusBadgeText }}</span>
            </span>
          </div>

          <p class="panel-hint-text">
            點選下方「<strong>{{ buttonLabel }}</strong>」鎖定題目，再去找出正確數據！
          </p>
        </div>

        <!-- 三組拉霸卡片區 -->
        <section class="slots-grid" :class="{ done: mode === 'done' }" aria-label="抽題結果">
          <article class="slot-card">
            <div class="slot-card-head">
              <span class="step-num">1</span>
              <h2 class="slot-title">行政區</h2>
              <span class="slot-tag">新北 29 區</span>
            </div>
            <div class="slot-body">
              <SlotText
                ref="districtReel"
                :pool="pools.district"
                :placeholder-length="3"
                tone="green"
                :reduced-motion="reducedMotion"
              />
            </div>
          </article>

          <article class="slot-card">
            <div class="slot-card-head">
              <span class="step-num">2</span>
              <h2 class="slot-title">學校名稱</h2>
              <span class="slot-tag">指定學校</span>
            </div>
            <div class="slot-body">
              <SlotText
                ref="schoolReel"
                :pool="pools.school"
                :placeholder-length="4"
                tone="blue"
                :reduced-motion="reducedMotion"
                :on-cell-settle="onSchoolCellSettle"
              />
            </div>
          </article>

          <article class="slot-card wide">
            <div class="slot-card-head">
              <span class="step-num">3</span>
              <h2 class="slot-title">查詢數據題目</h2>
              <span class="slot-tag">挑戰任務</span>
            </div>
            <div class="slot-body">
              <SlotText
                ref="questionReel"
                :pool="pools.question"
                :placeholder-length="11"
                tone="green"
                compact
                :reduced-motion="reducedMotion"
              />
            </div>
          </article>
        </section>

        <!-- 下欄：橫向操作引導與出題大按鈕區 -->
        <div class="action-bar" :class="mode">
          <div class="action-info">
            <img src="./assets/ntpc.png" alt="小幫手" class="mascot-avatar" />
            <div class="action-copy">
              <template v-if="mode === 'done'">
                <div class="done-headline">
                  <span class="done-tag">
                    <svg viewBox="0 0 256 256" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="m229.66 77.66-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69 218.34 66.34a8 8 0 0 1 11.32 11.32Z"
                      />
                    </svg>
                    <span>出題完成</span>
                  </span>
                  <span class="done-target">{{ result.district }} · {{ result.school }}</span>
                </div>
                <p class="done-question">
                  任務：「<strong>{{ result.question }}</strong>」— 去找到答案吧！
                </p>
              </template>
              <template v-else-if="mode === 'spinning'">
                <p class="waiting-title">拉霸高速運轉中，即將由左至右依序停輪…</p>
                <p class="waiting-note">請鎖定上方窗格，看看會抽中哪一所學校與數據題目！</p>
              </template>
              <template v-else>
                <p class="waiting-title">準備好接受教育數據挑戰了嗎？</p>
                <p class="waiting-note">
                  目前為 4 秒自動展示模式，請點選右側「開始出題」抽出一道正式題目！
                </p>
              </template>
            </div>
          </div>

          <button
            ref="ctaBtnRef"
            type="button"
            class="cta-btn"
            :class="{ done: mode === 'done' }"
            :disabled="mode === 'spinning'"
            :aria-busy="mode === 'spinning'"
            @click="handleDraw"
          >
            <svg class="cta-icon" viewBox="0 0 256 256" aria-hidden="true">
              <path
                fill="currentColor"
                d="m229.66 218.34-50.07-50.06a88.11 88.11 0 1 0-11.31 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32ZM40 112a72 72 0 1 1 72 72 72.08 72.08 0 0 1-72-72Z"
              />
            </svg>
            <span>{{ buttonLabel }}</span>
          </button>
        </div>

        <!-- 螢幕閱讀器即時播報 -->
        <p class="sr-only" role="status" aria-atomic="true">{{ status }}</p>
      </main>

      <!-- 底部步驟列（與 ntpc-app-demo StatusStrip 完全一致） -->
      <footer class="status-strip">
        <span class="rule"><b>①</b> 點選「開始出題」</span>
        <span class="sep" aria-hidden="true">›</span>
        <span class="rule"><b>②</b> 記下「行政區、學校、查詢題目」</span>
        <span class="sep" aria-hidden="true">›</span>
        <span class="rule"><b>③</b> 前往數據平台查出正確答案</span>
      </footer>
    </div>

    <canvas ref="confettiCanvasRef" class="confetti-canvas"></canvas>
  </div>
</template>
