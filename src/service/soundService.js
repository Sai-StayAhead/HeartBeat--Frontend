/**
 * HeartBeat Sound Notification Service
 * Plays audio notifications for real-time WebSocket events:
 * - 'message' (new team/client messages)
 * - 'action_item' (action item assignments)
 *
 * Includes Web Audio API synthesizer fallback and browser autoplay unlocking.
 */

const SOUND_ENABLED_KEY = "heartbeat_sound_enabled";

let soundEnabled = true;
try {
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  if (stored !== null) soundEnabled = stored === "true";
} catch (_) { }

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled));
  } catch (_) { }
  return soundEnabled;
}

export function toggleSound() {
  return setSoundEnabled(!soundEnabled);
}

// Pre-load audio elements
let messageAudio = null;
let actionItemAudio = null;
let audioContext = null;
let unlocked = false;
// DEDUPLICATION & THROTTLE CONTROLS:
// 1. Global cooldown: strictly prevents ANY sound from playing within 1200ms of another.
let lastGlobalSoundPlayedAt = 0;
const GLOBAL_SOUND_COOLDOWN_MS = 1200;

// 2. Specific event deduplication: prevents the exact same event / ID from playing within 5000ms.
const recentSoundEvents = new Map();
const SOUND_DEDUPE_WINDOW_MS = 5000;

function getAudioContext() {
  if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctx();
  }
  return audioContext;
}

function initAudioElements() {
  if (typeof window === "undefined") return;
  if (!messageAudio) {
    try {
      messageAudio = new Audio("/sounds/message.mp3");
      messageAudio.preload = "auto";
    } catch (_) { }
  }
  if (!actionItemAudio) {
    try {
      actionItemAudio = new Audio("/sounds/action_item.mp3");
      actionItemAudio.preload = "auto";
    } catch (_) { }
  }
}

// Browser Autoplay Policy Unlocker:
// Unlocks AudioContext and HTMLAudioElement upon the first user interaction.
function unlockAudio() {
  if (unlocked) return;
  unlocked = true;

  initAudioElements();

  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => { });
  }

  // Pre-roll audio elements muted to satisfy browser autoplay requirements without noise
  if (messageAudio) {
    messageAudio.muted = true;
    messageAudio.play().then(() => {
      messageAudio.pause();
      messageAudio.currentTime = 0;
      messageAudio.muted = false;
    }).catch(() => {
      messageAudio.muted = false;
    });
  }
  if (actionItemAudio) {
    actionItemAudio.muted = true;
    actionItemAudio.play().then(() => {
      actionItemAudio.pause();
      actionItemAudio.currentTime = 0;
      actionItemAudio.muted = false;
    }).catch(() => {
      actionItemAudio.muted = false;
    });
  }

  window.removeEventListener("click", unlockAudio);
  window.removeEventListener("keydown", unlockAudio);
  window.removeEventListener("touchstart", unlockAudio);
  window.removeEventListener("pointerdown", unlockAudio);
  window.removeEventListener("scroll", unlockAudio);
}

if (typeof window !== "undefined") {
  window.addEventListener("click", unlockAudio, { passive: true, once: true });
  window.addEventListener("keydown", unlockAudio, { passive: true, once: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true, once: true });
  window.addEventListener("pointerdown", unlockAudio, { passive: true, once: true });
  window.addEventListener("scroll", unlockAudio, { passive: true, once: true });
}

/**
 * Web Audio API synthesizer fallback
 * Plays pleasant bell tones if audio files fail or are blocked.
 */
function playSynthSound(soundType) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => { });
    }

    const now = ctx.currentTime;

    if (soundType === "action_item") {
      // 3-tone ascending alert chime: C5 (523Hz), E5 (659Hz), G5 (784Hz)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.36);
      });
    } else {
      // 2-tone message chime: F5 (698Hz), A5 (880Hz)
      const freqs = [698.46, 880.0];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);

        gain.gain.setValueAtTime(0, now + idx * 0.14);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.33);
      });
    }
  } catch (_) { }
}

/**
 * Play notification sound for given soundType ("action_item" | "message")
 */
export function playNotificationSound(soundType) {
  if (!soundEnabled) return;

  const now = Date.now();
  // Global cooldown: ensure at least 1200ms between any sounds
  if (now - lastGlobalSoundPlayedAt < GLOBAL_SOUND_COOLDOWN_MS) {
    console.log("🔇 Sound suppressed by global cooldown (< 1200ms)");
    return;
  }
  lastGlobalSoundPlayedAt = now;

  initAudioElements();

  const isActionItem = soundType === "action_item";
  const audio = isActionItem ? actionItemAudio : messageAudio;

  if (audio) {
    try {
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch((err) => {
          // If aborted by browser or rapid events, never synthesize a duplicate tone!
          if (err?.name === "AbortError") {
            return;
          }
          playSynthSound(soundType);
        });
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        playSynthSound(soundType);
      }
    }
  } else {
    playSynthSound(soundType);
  }
}

/**
 * Handles incoming WebSocket event payload and triggers sound if applicable
 */
export function handleWebSocketSoundEvent(data, currentUserId) {
  if (!data) return;

  console.log("🔊 WS SOUND EVENT:", data);

  // If payload explicitly disables sound, respect it
  if (data.play_sound === false || data.playSound === false) {
    return;
  }

  // Sound triggers: either play_sound is true, OR an incoming message/notification event
  const isTargetEvent =
    data.play_sound ||
    data.playSound ||
    data.sound_type ||
    data.event === "new_message" ||
    data.event === "new_notification" ||
    data.event === "action_item_assigned";

  if (!isTargetEvent) {
    return;
  }

  // Do not play sound if the current user is the sender
  const senderId =
    data.sender_user_id ??
    data.sender_id ??
    data.user_id ??
    data.data?.sender_user_id ??
    data.data?.sender_id;

  if (
    senderId != null &&
    currentUserId != null &&
    String(senderId) === String(currentUserId)
  ) {
    console.log(
      "🔇 Message sound skipped — current user is the sender:",
      currentUserId
    );
    return;
  }

  // Prevent duplicate WebSocket events from firing multiple sounds.
  // Check any available identifier in the payload.
  const entityId =
    data.message_id ??
    data.notification_id ??
    data.action_item_id ??
    data.id ??
    data.data?.id ??
    data.data?.message_id ??
    data.data?.notification_id;

  const eventName = data.event || "event";
  const soundType =
    data.sound_type ||
    data.soundType ||
    (eventName === "new_notification" || eventName === "action_item_assigned"
      ? "action_item"
      : "message");

  const eventKey = entityId != null
    ? `${eventName}:${entityId}`
    : `${eventName}:${soundType}`;

  const now = Date.now();
  const previousTime = recentSoundEvents.get(eventKey);

  if (previousTime != null && now - previousTime < SOUND_DEDUPE_WINDOW_MS) {
    console.log("🔇 Duplicate sound event skipped:", eventKey);
    return;
  }

  recentSoundEvents.set(eventKey, now);

  // Prevent the map from growing forever.
  setTimeout(() => {
    const storedTime = recentSoundEvents.get(eventKey);
    if (storedTime === now) {
      recentSoundEvents.delete(eventKey);
    }
  }, SOUND_DEDUPE_WINDOW_MS);

  playNotificationSound(soundType);
}