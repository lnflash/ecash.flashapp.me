<template>
  <div class="step">
    <div class="step-center">
      <!-- Done checkmark -->
      <div class="done-circle">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path
            d="M8 21L16 29L32 13"
            stroke="#41AD49"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <h1 class="step-title">You're set up.</h1>
      <p class="step-sub">
        Your Flash Address is ready. Share it to receive Bitcoin from anywhere.
      </p>

      <!-- Address card -->
      <div v-if="address" class="address-card" @click="copyAddress">
        <div class="address-card-label">YOUR FLASH ADDRESS</div>
        <div class="address-card-value">⚡ {{ address }}</div>
        <div class="address-card-hint">
          {{ copied ? "✓ Copied!" : "Tap to copy" }}
        </div>
      </div>

      <!-- Registration status -->
      <div
        v-if="regStatus"
        class="reg-status"
        :class="'reg-status--' + regStatus"
      >
        <span v-if="regStatus === 'pending'">⏳ Registering address…</span>
        <span v-else-if="regStatus === 'ok'">✓ Address registered</span>
        <span v-else-if="regStatus === 'error'"
          >⚠️ Registration failed — you can retry from settings</span
        >
      </div>
    </div>

    <div class="step-footer">
      <button
        class="btn btn-primary"
        :disabled="regStatus === 'pending'"
        @click="$emit('done')"
      >
        Open my wallet →
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bech32 } from "@scure/base";

const FLASH_API = "https://ecash.flashapp.me";

export default defineComponent({
  name: "StepDone",
  emits: ["done"],
  setup() {
    const copied = ref(false);
    const regStatus = ref<"pending" | "ok" | "error" | null>(null);

    const username = computed(() => {
      try {
        return (
          JSON.parse(
            localStorage.getItem("cashu.flashAddress.username") || "null"
          ) || null
        );
      } catch {
        return null;
      }
    });

    const address = computed(() => {
      return username.value ? `${username.value}@ecash.flashapp.me` : null;
    });

    function copyAddress() {
      if (!address.value) return;
      navigator.clipboard.writeText(address.value).then(() => {
        copied.value = true;
        setTimeout(() => {
          copied.value = false;
        }, 2000);
      });
    }

    async function registerAddress() {
      const uname = username.value;
      if (!uname) return;

      // Get private key from localStorage
      let privHex: string | null = null;
      try {
        privHex = JSON.parse(
          localStorage.getItem("cashu.ndk.privateKeySignerPrivateKey") || "null"
        );
      } catch {}

      if (!privHex || typeof privHex !== "string" || privHex.length !== 64) {
        console.error("[StepDone] No valid private key found in localStorage");
        regStatus.value = "error";
        return;
      }

      regStatus.value = "pending";

      try {
        // Derive npub from private key using bundled @noble/curves
        const privBytes = new Uint8Array(
          privHex.match(/.{2}/g)!.map((b) => parseInt(b, 16))
        );
        const pubBytes = secp256k1.getPublicKey(privBytes, true); // 33 bytes compressed
        const xOnly = pubBytes.slice(1); // 32 bytes x-only

        if (xOnly.length !== 32) {
          throw new Error(`xOnly key has wrong length: ${xOnly.length}`);
        }

        const words = bech32.toWords(xOnly);
        const npub = bech32.encode("npub", words);

        if (!npub.startsWith("npub1") || npub.length < 60) {
          throw new Error(
            `Invalid npub derived: "${npub}" (len ${npub.length})`
          );
        }

        console.log(
          `[StepDone] Registering ${uname}@ecash.flashapp.me with npub ${npub.slice(
            0,
            20
          )}...`
        );

        const res = await fetch(`${FLASH_API}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: uname, npub }),
        });

        const data = await res.json();

        if (data.ok) {
          console.log(`[StepDone] Registered: ${data.address}`);
          regStatus.value = "ok";
        } else {
          console.error("[StepDone] Registration failed:", data.error);
          regStatus.value = "error";
        }
      } catch (err) {
        console.error("[StepDone] Registration exception:", err);
        regStatus.value = "error";
      }
    }

    onMounted(() => {
      registerAddress();
    });

    return { address, copied, regStatus, copyAddress };
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
.step-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 20px;
}
.done-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(65, 173, 73, 0.12);
  border: 2px solid rgba(65, 173, 73, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #f5f5f5;
  margin: 0;
}
.step-sub {
  font-size: 16px;
  color: #888;
  margin: 0;
  line-height: 1.6;
  max-width: 320px;
}
.address-card {
  width: 100%;
  background: rgba(65, 173, 73, 0.08);
  border: 1.5px solid rgba(65, 173, 73, 0.3);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.address-card:hover {
  border-color: rgba(65, 173, 73, 0.5);
}
.address-card-label {
  font-size: 11px;
  color: #666;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.address-card-value {
  font-size: 18px;
  font-weight: 700;
  color: #41ad49;
  word-break: break-all;
  margin-bottom: 8px;
}
.address-card-hint {
  font-size: 12px;
  color: #555;
}
.reg-status {
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 10px;
}
.reg-status--pending {
  color: #888;
  background: rgba(255, 255, 255, 0.04);
}
.reg-status--ok {
  color: #41ad49;
  background: rgba(65, 173, 73, 0.08);
}
.reg-status--error {
  color: #f5a623;
  background: rgba(245, 166, 35, 0.08);
}
.step-footer {
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
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: #41ad49;
  color: #000;
}
.btn-primary:hover {
  background: #4ec256;
}
</style>
