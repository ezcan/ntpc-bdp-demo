import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { questionBank, schoolData } from '../data/quiz.js'

const CYCLE_MS = 4000 // 展示模式：一輪約 4 秒（轉動 ≈ 2.55s + 停留 ≈ 1.45s）

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)))

/**
 * 出題機狀態
 *  - attract：待機展示，三組拉霸每 4 秒自動重轉一次（可暫停）
 *  - spinning：按下「出題」後轉出正式題目
 *  - done：題目停住，不再自動重轉，直到再按一次或回到展示
 *
 * @param {{ district: Ref, school: Ref, question: Ref }} reels SlotText 元件 ref
 * @param {Ref<boolean>} reducedMotion
 * @param {{ onDrawComplete?: (result: {district: string, school: string, question: string}) => void }} [callbacks]
 */
export function useSlotMachine(reels, reducedMotion, callbacks = {}) {
  const mode = ref('attract')
  const paused = ref(false)
  const result = ref({
    district: schoolData[0].district,
    school: schoolData[0].name,
    question: questionBank[0],
  })
  const status = ref('')

  let loopToken = 0

  const list = () => [reels.district.value, reels.school.value, reels.question.value]

  function spinAll(district, school, question) {
    const [d, s, q] = list()
    return Promise.all([d?.spin(district), s?.spin(school), q?.spin(question)])
  }

  function showAll(district, school, question) {
    const [d, s, q] = list()
    d?.show(district)
    s?.show(school)
    q?.show(question)
  }

  async function attractLoop() {
    const token = ++loopToken
    while (token === loopToken) {
      const start = performance.now()
      const sch = pick(schoolData)
      const q = pick(questionBank)
      result.value = { district: sch.district, school: sch.name, question: q }
      await spinAll(sch.district, sch.name, q)
      if (token !== loopToken) return
      await sleep(CYCLE_MS - (performance.now() - start))
    }
  }

  function canAttract() {
    return mode.value === 'attract' && !paused.value && !reducedMotion.value && !document.hidden
  }

  function syncLoop() {
    if (canAttract()) {
      attractLoop()
    } else {
      loopToken++ // 讓正在轉的這一輪自然停妥，之後不再重轉
      if (reducedMotion.value && mode.value === 'attract') {
        const sch = pick(schoolData)
        const q = pick(questionBank)
        result.value = { district: sch.district, school: sch.name, question: q }
        showAll(sch.district, sch.name, q)
      }
    }
  }

  function togglePause() {
    paused.value = !paused.value
    syncLoop()
  }

  function resumeAttract() {
    mode.value = 'attract'
    paused.value = false
    status.value = ''
    syncLoop()
  }

  async function draw() {
    if (mode.value === 'spinning') return
    loopToken++
    mode.value = 'spinning'
    status.value = ''

    const sch = pick(schoolData)
    const question = pick(questionBank)
    result.value = { district: sch.district, school: sch.name, question }

    if (reducedMotion.value) {
      showAll(sch.district, sch.name, question)
    } else {
      await spinAll(sch.district, sch.name, question)
    }

    mode.value = 'done'
    status.value = `題目完成：請查詢「${sch.district} ${sch.name}」的「${question}」`
    if (callbacks.onDrawComplete) {
      callbacks.onDrawComplete(result.value)
    }
  }

  const onVisibility = () => syncLoop()

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    syncLoop()
  })
  onBeforeUnmount(() => {
    loopToken++
    document.removeEventListener('visibilitychange', onVisibility)
  })
  watch(reducedMotion, syncLoop)

  return { mode, paused, result, status, draw, togglePause, resumeAttract }
}
