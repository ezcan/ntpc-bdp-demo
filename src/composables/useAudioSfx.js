import { ref } from 'vue'

/**
 * 展場專用原生 Web Audio API 互動音效合成引擎
 * 完全免外網、不依賴外部音檔，離線零延遲（與 ntpc-app-demo 保持一致）
 */
let audioCtx = null
const isSfxEnabled = ref(true)

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function useAudioSfx() {
  // 1. 點擊音效 (泡泡彈跳短音)
  function playTapSFX() {
    if (!isSfxEnabled.value) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(520, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)

      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.08)
    } catch {
      // ignore audio context restriction errors
    }
  }

  // 2. 停輪單響 (機械清脆短音)
  function playTickSFX(step = 0) {
    if (!isSfxEnabled.value) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      const baseFreq = 440 + Math.min(step, 8) * 36
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, ctx.currentTime + 0.05)

      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.06)
    } catch {
      // ignore
    }
  }

  // 3. 出題完成音效 (明亮大和弦琶音 + 勝利高音，與 ntpc-app-demo 一致)
  function playSuccessSFX() {
    if (!isSfxEnabled.value) return
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09)

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.09)
        gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + idx * 0.09 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.28)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + idx * 0.09)
        osc.stop(ctx.currentTime + idx * 0.09 + 0.3)
      })
    } catch {
      // ignore
    }
  }

  function toggleSFX() {
    if (!isSfxEnabled.value) {
      isSfxEnabled.value = true
      playTapSFX()
    } else {
      playTapSFX()
      isSfxEnabled.value = false
    }
  }

  function unlockAudio() {
    getAudioContext()
  }

  return {
    isSfxEnabled,
    playTapSFX,
    playTickSFX,
    playSuccessSFX,
    toggleSFX,
    unlockAudio,
  }
}

