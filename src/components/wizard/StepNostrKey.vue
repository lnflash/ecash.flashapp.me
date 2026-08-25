<template>
  <div class="step">
    <div class="step-header">
      <div class="key-mark">🔑</div>
      <h1 class="step-title">Your secret key</h1>
      <p class="step-sub">
        This key unlocks your wallet. Only you have it — we never see it.
      </p>
    </div>

    <div class="step-body">
      <!-- Already have a key -->
      <div v-if="hasKey" class="key-box key-box--exists">
        <div class="key-box-row">
          <div class="key-icon">✓</div>
          <div>
            <div class="key-box-label">Key loaded</div>
            <div class="key-box-value">{{ shortPubkey }}</div>
          </div>
        </div>
      </div>

      <!-- Generate or import -->
      <template v-else>
        <button
          class="btn btn-outline"
          :class="{ loading: generating }"
          @click="generateKey"
        >
          {{ generating ? "Generating…" : "🎲 Generate a new key" }}
        </button>

        <div class="or-divider"><span>or paste an existing key</span></div>

        <div class="input-wrap" :class="nsecState">
          <input
            v-model="nsecInput"
            class="flash-input"
            :type="showKey ? 'text' : 'password'"
            placeholder="nsec1…"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <button class="eye-btn" @click="showKey = !showKey">
            {{ showKey ? "🙈" : "👁" }}
          </button>
        </div>
        <div class="input-hint" :class="nsecHintClass">{{ nsecHint }}</div>
        <div v-if="importWarning" class="import-warning">
          ⚠️ {{ importWarning }}
        </div>

        <button
          v-if="nsecValid"
          class="btn btn-outline"
          style="margin-top: 12px"
          @click="importKey"
        >
          Import key
        </button>
      </template>

      <!-- Nsec save warning — shown after generation -->
      <template v-if="generatedNsec">
        <div class="nsec-display">
          <div class="nsec-label">Your secret key (nsec)</div>
          <div class="nsec-row">
            <span class="nsec-value">{{
              showNsec
                ? generatedNsec
                : generatedNsec.slice(0, 12) + "•".repeat(20)
            }}</span>
            <button class="copy-btn" @click="copyNsec">
              {{ copied ? "✓" : "Copy" }}
            </button>
          </div>
          <button class="toggle-btn" @click="showNsec = !showNsec">
            {{ showNsec ? "Hide" : "Show full key" }}
          </button>
        </div>

        <div class="warning-box">
          <div class="warning-icon">⚠️</div>
          <p>
            Save this key before continuing. If you lose it, you lose access to
            your wallet permanently.
          </p>
        </div>

        <label class="checkbox-row">
          <input type="checkbox" v-model="confirmed" />
          <span>I've saved my key somewhere safe</span>
        </label>
      </template>
    </div>

    <div class="step-footer">
      <button
        class="btn btn-primary"
        :disabled="!canContinue && !nsecValid"
        @click="
          nsecValid && !hasKey && !keyImported ? importKey() : $emit('next')
        "
      >
        Continue →
      </button>
      <button class="btn btn-ghost" @click="$emit('skip')">Skip for now</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from "vue";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bech32 } from "@scure/base";

export default defineComponent({
  name: "StepNostrKey",
  emits: ["next", "skip"],
  setup(_, { emit }) {
    const nsecInput = ref("");
    const showKey = ref(false);
    const showNsec = ref(false);
    const generating = ref(false);
    const generatedNsec = ref("");
    const confirmed = ref(false);
    const copied = ref(false);
    const importWarning = ref("");
    const nsecError = ref(""); // explicit error from checksum or import failure
    const keyImported = ref(false); // reactive flag so Continue knows key was just imported

    const hasKey = computed(() => {
      try {
        const v = localStorage.getItem("cashu.ndk.privateKeySignerPrivateKey");
        if (!v) return false;
        const hex = JSON.parse(v);
        return typeof hex === "string" && hex.length === 64;
      } catch {
        return false;
      }
    });

    const shortPubkey = computed(() => {
      try {
        const v = localStorage.getItem("cashu.ndk.pubkey");
        if (!v) return "Key configured";
        const hex = JSON.parse(v);
        return hex ? hex.slice(0, 12) + "…" + hex.slice(-6) : "Key configured";
      } catch {
        return "Key configured";
      }
    });

    const nsecValid = computed(() => {
      const v = nsecInput.value;
      if (!v || !v.startsWith("nsec1") || v.length < 60) return false;
      try {
        const { prefix } = bech32.decode(v);
        return prefix === "nsec";
      } catch {
        return false;
      }
    });

    // Warn if the pasted nsec is already registered to a different username
    watch(nsecValid, async (valid) => {
      if (!valid) {
        importWarning.value = "";
        nsecError.value = "";
        return;
      }
      try {
        const { secp256k1 } = await import("@noble/curves/secp256k1");
        const { bech32: b32 } = await import("@scure/base");
        const { words } = b32.decode(nsecInput.value);
        const bytes = new Uint8Array(b32.fromWords(words));
        const pubBytes = secp256k1.getPublicKey(bytes, true);
        const npub = b32.encode("npub", b32.toWords(pubBytes.slice(1)));
        const res = await fetch(
          "https://ecash.flashapp.me/api/lookup-npub/" + npub
        ).catch(() => null);
        if (!res || !res.ok) return;
        const data = await res.json();
        const currentUser = (() => {
          try {
            return JSON.parse(
              localStorage.getItem("cashu.flashAddress.username") || "null"
            );
          } catch {
            return null;
          }
        })();
        if (data.registered && data.username && data.username !== currentUser) {
          importWarning.value =
            "This key is already registered as " +
            data.username +
            "@ecash.flashapp.me";
        } else {
          importWarning.value = "";
        }
      } catch {
        importWarning.value = "";
      }
    });

    const nsecState = computed(() => {
      if (!nsecInput.value) return "";
      return nsecValid.value ? "ok" : "error";
    });

    const nsecHint = computed(() => {
      if (!nsecInput.value) return "";
      if (nsecError.value) return nsecError.value;
      if (nsecValid.value) return "✓ Valid nsec";
      const v = nsecInput.value;
      if (!v.startsWith("nsec1")) return "Must start with nsec1…";
      if (v.length < 60) return "Key too short";
      return "Invalid checksum — check for typos";
    });

    const nsecHintClass = computed(() => {
      if (!nsecInput.value) return "";
      if (nsecError.value) return "hint-error";
      return nsecValid.value ? "hint-ok" : "hint-error";
    });

    const canContinue = computed(() => {
      if (hasKey.value) return true;
      if (generatedNsec.value) return confirmed.value;
      return false;
    });

    async function generateKey() {
      generating.value = true;
      try {
        const priv = secp256k1.utils.randomPrivateKey();
        const privHex = Array.from(priv)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const pubBytes = secp256k1.getPublicKey(priv, true);
        const xOnly = pubBytes.slice(1);
        const nsec = bech32.encode("nsec", bech32.toWords(priv));
        const npub = bech32.encode("npub", bech32.toWords(xOnly));

        localStorage.setItem(
          "cashu.ndk.privateKeySignerPrivateKey",
          JSON.stringify(privHex)
        );
        localStorage.setItem(
          "cashu.ndk.signerType",
          JSON.stringify("PRIVATEKEY")
        );
        localStorage.setItem(
          "cashu.welcome.showWelcome",
          JSON.stringify(false)
        );
        localStorage.setItem(
          "cashu.welcome.termsAccepted",
          JSON.stringify(true)
        );

        generatedNsec.value = nsec;

        const pendingUsername = (() => {
          try {
            return JSON.parse(
              localStorage.getItem("cashu.flashAddress.username") || "null"
            );
          } catch {
            return null;
          }
        })();
        if (pendingUsername) {
          await fetch("https://ecash.flashapp.me/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: pendingUsername, npub }),
          }).catch(() => {});
        }
      } finally {
        generating.value = false;
      }
    }

    async function importKey() {
      if (!nsecValid.value) return;
      nsecError.value = "";
      try {
        const { prefix, words } = bech32.decode(nsecInput.value);
        if (prefix !== "nsec") {
          nsecError.value = "Not a valid nsec key";
          return;
        }
        const bytes = new Uint8Array(bech32.fromWords(words));
        if (bytes.length !== 32) {
          nsecError.value = "Invalid key length";
          return;
        }
        const privHex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        localStorage.setItem(
          "cashu.ndk.privateKeySignerPrivateKey",
          JSON.stringify(privHex)
        );
        localStorage.setItem(
          "cashu.ndk.signerType",
          JSON.stringify("PRIVATEKEY")
        );
        confirmed.value = true;
        keyImported.value = true;
        // Do not auto-advance; let user click Continue to see any warnings
      } catch (e) {
        nsecError.value =
          "Invalid key: " + (e instanceof Error ? e.message : String(e));
      }
    }

    function copyNsec() {
      navigator.clipboard.writeText(generatedNsec.value).then(() => {
        copied.value = true;
        setTimeout(() => {
          copied.value = false;
        }, 2000);
      });
    }

    return {
      nsecInput,
      showKey,
      showNsec,
      generating,
      generatedNsec,
      confirmed,
      copied,
      importWarning,
      nsecError,
      keyImported,
      hasKey,
      shortPubkey,
      nsecValid,
      nsecState,
      nsecHint,
      nsecHintClass,
      canContinue,
      generateKey,
      importKey,
      copyNsec,
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
  padding-bottom: 36px;
}
.key-mark {
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
}
.step-sub {
  font-size: 16px;
  color: #888;
  margin: 0;
  line-height: 1.5;
}
.step-body {
  flex: 1;
}
.step-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 24px;
}
.key-box {
  background: #111114;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
}
.key-box--exists {
  border-color: rgba(65, 173, 73, 0.4);
  background: rgba(65, 173, 73, 0.06);
}
.key-box-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.key-icon {
  font-size: 22px;
  color: #41ad49;
  flex-shrink: 0;
}
.key-box-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.key-box-value {
  font-size: 14px;
  color: #41ad49;
  font-family: monospace;
  margin-top: 2px;
}
.input-wrap {
  display: flex;
  align-items: center;
  background: #111114;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 0 16px;
  height: 56px;
  transition: border-color 0.15s;
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
  font-size: 15px;
  font-family: monospace;
  padding: 0;
  min-width: 0;
}
.flash-input::placeholder {
  color: #555;
}
.eye-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 0 0 0 8px;
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
.or-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
  color: #555;
  font-size: 13px;
}
.or-divider::before,
.or-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}
.nsec-display {
  background: #111114;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  margin-top: 20px;
}
.nsec-label {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
.nsec-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nsec-value {
  flex: 1;
  font-family: monospace;
  font-size: 13px;
  color: #f5f5f5;
  word-break: break-all;
}
.copy-btn {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f5f5f5;
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.toggle-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
  padding: 0;
}
.toggle-btn:hover {
  color: #999;
}
.warning-box {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgba(234, 179, 8, 0.08);
  border: 1px solid rgba(234, 179, 8, 0.25);
  border-radius: 12px;
  padding: 14px;
  margin-top: 16px;
}
.warning-icon {
  flex-shrink: 0;
  font-size: 20px;
}
.warning-box p {
  margin: 0;
  font-size: 14px;
  color: #ccc;
  line-height: 1.5;
}
.checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  margin-top: 16px;
  font-size: 14px;
  color: #aaa;
}
.checkbox-row input {
  margin-top: 2px;
  cursor: pointer;
  accent-color: #41ad49;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
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
.btn-outline {
  background: none;
  color: #f5f5f5;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
}
.btn-outline:hover {
  border-color: rgba(255, 255, 255, 0.3);
}
.btn-outline.loading {
  opacity: 0.5;
  cursor: wait;
}
.btn-ghost {
  background: none;
  color: #666;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
}
.btn-ghost:hover {
  color: #999;
}
</style>
