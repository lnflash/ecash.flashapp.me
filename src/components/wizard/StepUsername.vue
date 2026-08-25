<template>
  <div class="step">
    <!-- Header -->
    <div class="step-header">
      <div class="flash-mark">⚡</div>
      <h1 class="step-title">Get your Lightning Address</h1>
      <p class="step-sub">
        Receive Bitcoin from anyone at
        <span class="green">you@ecash.flashapp.me</span>
      </p>
    </div>

    <!-- Input -->
    <div class="step-body">
      <div class="input-wrap" :class="inputState">
        <input
          v-model="username"
          class="flash-input"
          type="text"
          placeholder="satoshi"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          maxlength="30"
          @input="onInput"
        />
        <span class="input-suffix">@ecash.flashapp.me</span>
      </div>

      <div class="input-hint" :class="hintClass">{{ hint }}</div>

      <!-- Address preview -->
      <div v-if="username.length >= 3" class="address-preview">
        <span class="address-icon">⚡</span>
        <span class="address-text"
          >{{ username.toLowerCase() }}@ecash.flashapp.me</span
        >
      </div>
    </div>

    <!-- Actions -->
    <div class="step-footer">
      <button class="btn btn-primary" :disabled="!canContinue" @click="next">
        {{ checking ? "Checking…" : "Continue" }}
      </button>
      <button class="btn btn-ghost" @click="$emit('skip')">Skip for now</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { useFlashAddressStore } from "src/stores/flashAddress";

const RESERVED = [
  "patoo",
  "vandana",
  "calypso",
  "naomi",
  "sparks",
  "jake",
  "corazon",
  "lori",
  "scribe",
  "pulse",
  "admin",
  "root",
  "api",
  "www",
  "support",
  "help",
  "you",
  "test",
  "flash",
  "demo",
  "user",
];

export default defineComponent({
  name: "StepUsername",
  emits: ["next", "skip"],
  setup(_, { emit }) {
    const username = ref("");
    const checking = ref(false);
    const available = ref<boolean | null>(null);
    const flashStore = useFlashAddressStore();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const inputState = computed(() => {
      if (!username.value || username.value.length < 3) return "";
      if (checking.value) return "checking";
      if (available.value === true) return "ok";
      if (available.value === false) return "error";
      return "";
    });

    const hint = computed(() => {
      if (!username.value) return "3–30 characters, lowercase only";
      if (username.value.length < 3) return "Too short — at least 3 characters";
      if (!/^[a-z0-9_-]+$/.test(username.value))
        return "Only lowercase letters, numbers, _ or -";
      if (RESERVED.includes(username.value)) return "That name is reserved";
      if (checking.value) return "Checking availability…";
      if (available.value === true) return "✓ Available!";
      if (available.value === false) return "✗ Already taken — try another";
      return "3–30 characters, lowercase only";
    });

    const hintClass = computed(() => {
      if (available.value === true) return "hint-ok";
      if (available.value === false) return "hint-error";
      return "";
    });

    const canContinue = computed(
      () => available.value === true && !checking.value
    );

    function onInput() {
      const val = username.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      username.value = val;
      available.value = null;
      if (timer) clearTimeout(timer);
      if (val.length < 3 || RESERVED.includes(val)) return;
      timer = setTimeout(() => check(val), 450);
    }

    async function check(name: string) {
      checking.value = true;
      try {
        const res = await fetch(`https://ecash.flashapp.me/api/check/${name}`);
        const d = await res.json();
        available.value = d.available === true;
      } catch {
        available.value = null;
      } finally {
        checking.value = false;
      }
    }

    async function next() {
      if (!canContinue.value) return;
      // Register the address
      const privkey = (() => {
        try {
          const v = localStorage.getItem(
            "cashu.ndk.privateKeySignerPrivateKey"
          );
          return v ? JSON.parse(v) : null;
        } catch {
          return null;
        }
      })();

      if (privkey) {
        // Already have an npub — register with it
        try {
          const { bech32 } = await import("@scure/base");
          const { secp256k1 } = (await import(
            "@noble/curves/secp256k1"
          )) as any;
          const bytes = new Uint8Array(
            privkey.match(/.{2}/g).map((b: string) => parseInt(b, 16))
          );
          const pubBytes = secp256k1.getPublicKey(bytes, true);
          const xOnly = pubBytes.slice(1);
          const npub = bech32.encode("npub", bech32.toWords(xOnly));
          await fetch("https://ecash.flashapp.me/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username.value, npub }),
          });
        } catch {}
      }

      localStorage.setItem(
        "cashu.flashAddress.username",
        JSON.stringify(username.value)
      );
      localStorage.setItem("cashu.flashAddress.enabled", JSON.stringify(true));
      localStorage.setItem(
        "cashu.flashAddress.automaticClaim",
        JSON.stringify(true)
      );
      flashStore.connect(username.value);
      emit("next");
    }

    return {
      username,
      checking,
      available,
      inputState,
      hint,
      hintClass,
      canContinue,
      onInput,
      next,
    };
  },
});
</script>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 0 24px;
  padding-top: max(48px, env(safe-area-inset-top, 48px));
  padding-bottom: max(40px, env(safe-area-inset-bottom, 40px));
  background: #0a0a0a;
}

.step-header {
  flex: 0;
  text-align: center;
  padding-bottom: 40px;
}

.flash-mark {
  font-size: 48px;
  margin-bottom: 20px;
  display: block;
}

.step-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #f5f5f5;
  margin: 0 0 12px;
  line-height: 1.2;
}

.step-sub {
  font-size: 16px;
  color: #888;
  margin: 0;
  line-height: 1.5;
}

.green {
  color: #41ad49;
}

.step-body {
  flex: 1;
}

.input-wrap {
  display: flex;
  align-items: center;
  background: #111114;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 0 16px;
  transition: border-color 0.15s;
  height: 56px;
}

.input-wrap.checking {
  border-color: rgba(255, 255, 255, 0.2);
}
.input-wrap.ok {
  border-color: rgba(65, 173, 73, 0.6);
}
.input-wrap.error {
  border-color: rgba(239, 68, 68, 0.6);
}
.input-wrap:focus-within {
  border-color: #41ad49;
}

.flash-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #f5f5f5;
  font-size: 17px;
  font-family: inherit;
  padding: 0;
  min-width: 0;
}

.flash-input::placeholder {
  color: #555;
}

.input-suffix {
  font-size: 14px;
  color: #555;
  white-space: nowrap;
  margin-left: 4px;
  flex-shrink: 0;
}

.input-hint {
  font-size: 13px;
  color: #666;
  margin-top: 8px;
  min-height: 20px;
  padding-left: 4px;
}
.hint-ok {
  color: #41ad49;
}
.hint-error {
  color: #ef4444;
}

.address-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(65, 173, 73, 0.08);
  border: 1px solid rgba(65, 173, 73, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  margin-top: 16px;
}

.address-icon {
  font-size: 16px;
}

.address-text {
  font-size: 15px;
  font-weight: 600;
  color: #41ad49;
  word-break: break-all;
}

.step-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 24px;
}

.btn {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: none;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}
.btn:active {
  transform: scale(0.98);
}
.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-primary {
  background: #41ad49;
  color: #000;
}
.btn-primary:not(:disabled):hover {
  background: #4ec256;
}

.btn-ghost {
  background: none;
  color: #666;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
}
.btn-ghost:hover {
  color: #999;
  border-color: rgba(255, 255, 255, 0.15);
}
</style>
