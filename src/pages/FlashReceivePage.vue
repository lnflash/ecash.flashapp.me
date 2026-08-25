<template>
  <div class="receive-page">
    <!-- Header -->
    <div class="recv-header">
      <button class="back-btn" @click="$router.back()">
        <div class="back-circle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </button>
      <span class="recv-title">RECEIVE</span>
      <div style="width: 40px" />
    </div>

    <!-- USD / BTC toggle -->
    <div class="recv-toggle-wrap">
      <div class="unit-toggle">
        <button
          class="unit-btn"
          :class="{ active: tab === 'usd' }"
          @click="tab = 'usd'"
        >
          USD
        </button>
        <button
          class="unit-btn"
          :class="{ active: tab === 'btc' }"
          @click="tab = 'btc'"
        >
          BTC
        </button>
      </div>
    </div>

    <!-- USD tab — Lightning Address QR -->
    <div v-if="tab === 'usd'" class="recv-body">
      <h2 class="recv-heading">Receive USD</h2>
      <p class="recv-sub">
        Share your address or QR code. Sender pays in any Lightning wallet — you
        receive in your USD pocket.
      </p>

      <div class="qr-card">
        <div class="qr-wrap" v-if="flashAddress">
          <vue-qrcode
            :value="flashAddress"
            :options="{
              width: 200,
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' },
            }"
            tag="img"
            class="qr-img"
          />
          <div class="qr-bolt">⚡</div>
        </div>
        <div v-else class="qr-placeholder">No Flash Address set</div>
        <div class="qr-addr">{{ flashAddress || "—" }}</div>
      </div>

      <div class="recv-actions">
        <button class="recv-btn" @click="copyAddress">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect
              x="9"
              y="9"
              width="13"
              height="13"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          {{ copied ? "Copied!" : "Copy address" }}
        </button>
        <button class="recv-btn" @click="share">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Share
        </button>
      </div>

      <div class="amount-row" @click="showAmountInput = !showAmountInput">
        <span>Request a specific amount</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 18l6-6-6-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <!-- BTC tab — Lightning invoice -->
    <div v-if="tab === 'btc'" class="recv-body">
      <h2 class="recv-heading">Receive BTC</h2>
      <p class="recv-sub">
        Share your lightning invoice or address. Funds arrive as sats in your
        BTC pocket.
      </p>

      <!-- Sub-toggle: Invoice | Address -->
      <div class="sub-toggle">
        <button
          class="sub-btn"
          :class="{ active: btcTab === 'invoice' }"
          @click="btcTab = 'invoice'"
        >
          ⚡ Lightning invoice
        </button>
        <button
          class="sub-btn"
          :class="{ active: btcTab === 'address' }"
          @click="btcTab = 'address'"
        >
          📬 Address
        </button>
      </div>

      <div v-if="btcTab === 'invoice'" class="qr-card">
        <div v-if="loadingInvoice" class="qr-placeholder">
          <q-spinner color="positive" size="2em" />
        </div>
        <div v-else-if="invoice" class="qr-wrap">
          <vue-qrcode
            :value="invoice"
            :options="{
              width: 200,
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' },
            }"
            tag="img"
            class="qr-img"
          />
          <div class="qr-bolt">⚡</div>
        </div>
        <div class="qr-addr invoice-str">
          {{ invoice ? invoice.slice(0, 24) + "…" : "—" }}
        </div>

        <div
          v-if="expiryTs"
          class="expiry-row"
          :class="{
            'expiry-warning': expiryWarning,
            'expiry-expired': isExpired,
          }"
          @click="isExpired ? generateInvoice() : null"
        >
          <span v-if="!isExpired">⏱ Expires in {{ expiryCountdown }}</span>
          <span v-else>Expired · <strong>Tap to generate new →</strong></span>
        </div>
      </div>

      <div v-if="btcTab === 'address' && flashAddress" class="qr-card">
        <div class="qr-wrap">
          <vue-qrcode
            :value="'lightning:' + flashAddress"
            :options="{
              width: 200,
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' },
            }"
            tag="img"
            class="qr-img"
          />
          <div class="qr-bolt">⚡</div>
        </div>
        <div class="qr-addr">{{ flashAddress }}</div>
      </div>

      <div class="recv-actions" v-if="btcTab === 'invoice' && invoice">
        <button class="recv-btn" @click="copyInvoice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect
              x="9"
              y="9"
              width="13"
              height="13"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          {{ copiedInvoice ? "Copied!" : "Copy invoice" }}
        </button>
        <button class="recv-btn" @click="shareInvoice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Share
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
} from "vue";
import VueQrcode from "@chenfengyuan/vue-qrcode";
import { useFlashAddressStore } from "src/stores/flashAddress";
import { useWalletStore } from "src/stores/wallet";
import { useMintsStore } from "src/stores/mints";
import { decode as decodeBolt11 } from "light-bolt11-decoder";

export default defineComponent({
  name: "FlashReceivePage",
  components: { VueQrcode },
  setup() {
    const flashStore = useFlashAddressStore();
    const walletStore = useWalletStore();
    const mintsStore = useMintsStore();

    const tab = ref<"usd" | "btc">("usd");
    const btcTab = ref<"invoice" | "address">("invoice");
    const copied = ref(false);
    const copiedInvoice = ref(false);
    const loadingInvoice = ref(false);
    const invoice = ref("");
    const expiryTs = ref<number | null>(null);
    const now = ref(Date.now());
    let timer: ReturnType<typeof setInterval> | null = null;

    const flashAddress = computed(() => flashStore.address);

    const secondsLeft = computed(() => {
      if (!expiryTs.value) return Infinity;
      return Math.max(0, expiryTs.value - Math.floor(now.value / 1000));
    });
    const expiryWarning = computed(() => secondsLeft.value < 300);
    const isExpired = computed(() => secondsLeft.value === 0);
    const expiryCountdown = computed(() => {
      const s = secondsLeft.value;
      return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    });

    const FLASH_MINT = "https://forge.flashapp.me";

    async function ensureFlashMint() {
      const mints = mintsStore.mints || [];
      const hasFlash = mints.some((m: any) => m.url === FLASH_MINT);
      if (!hasFlash) {
        try {
          await mintsStore.addMint({ url: FLASH_MINT });
        } catch {}
      }
      if (!mintsStore.activeMintUrl) {
        try {
          await mintsStore.activateMintUrl(FLASH_MINT, false, true);
        } catch {}
      }
    }

    async function generateInvoice() {
      loadingInvoice.value = true;
      invoice.value = "";
      expiryTs.value = null;
      try {
        // Always use SAT for Lightning invoices (LNURL spec requires exact amount match)
        const res = await fetch(FLASH_MINT + "/v1/mint/quote/bolt11", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: 1, unit: "sat" }),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        invoice.value = data.request || "";
        if (data.expiry) expiryTs.value = data.expiry;
        // Store quote ID for later claiming
        if (data.quote)
          localStorage.setItem(
            "cashu.pendingReceiveQuote",
            JSON.stringify({ quote: data.quote, unit: "sat" })
          );
        // Decode expiry from bolt11 as fallback
        if (invoice.value && !expiryTs.value) {
          try {
            const d = decodeBolt11(invoice.value);
            const ts = d.sections?.find((s: any) => s.name === "timestamp")
              ?.value as number;
            const exp = d.sections?.find((s: any) => s.name === "expiry")
              ?.value as number;
            if (ts && exp) expiryTs.value = ts + exp;
          } catch {}
        }
      } catch (e) {
        console.error("[FlashReceive] generateInvoice failed:", e);
      } finally {
        loadingInvoice.value = false;
      }
    }

    async function copyAddress() {
      if (!flashAddress.value) return;
      await navigator.clipboard.writeText(flashAddress.value);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    }

    async function copyInvoice() {
      if (!invoice.value) return;
      await navigator.clipboard.writeText(invoice.value);
      copiedInvoice.value = true;
      setTimeout(() => {
        copiedInvoice.value = false;
      }, 2000);
    }

    function share() {
      if (navigator.share && flashAddress.value) {
        navigator.share({ text: flashAddress.value }).catch(() => {});
      } else copyAddress();
    }

    function shareInvoice() {
      if (navigator.share && invoice.value) {
        navigator.share({ text: invoice.value }).catch(() => {});
      } else copyInvoice();
    }

    // Regenerate invoice when user switches to BTC invoice tab
    watch([tab, btcTab], ([newTab, newBtcTab]) => {
      if (newTab === "btc" && newBtcTab === "invoice" && !invoice.value) {
        generateInvoice();
      }
    });

    onMounted(() => {
      // Start timer immediately so countdown works as soon as invoice loads
      timer = setInterval(() => {
        now.value = Date.now();
      }, 1000);
      // Only generate invoice if we land on BTC invoice tab directly
      if (tab.value === "btc" && btcTab.value === "invoice") {
        generateInvoice();
      }
    });
    onUnmounted(() => {
      if (timer) clearInterval(timer);
    });

    return {
      tab,
      btcTab,
      flashAddress,
      copied,
      copiedInvoice,
      loadingInvoice,
      invoice,
      expiryWarning,
      isExpired,
      expiryCountdown,
      generateInvoice,
      copyAddress,
      copyInvoice,
      share,
      shareInvoice,
    };
  },
});
</script>

<style scoped lang="scss">
* {
  box-sizing: border-box;
}

.receive-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
    sans-serif;
  padding-bottom: 40px;
  max-width: 430px;
  margin: 0 auto;
}
.recv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 12px;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.back-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f5f5f5;
}
.recv-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #888;
}

.recv-toggle-wrap {
  display: flex;
  justify-content: center;
  padding: 8px 0 20px;
}
.unit-toggle {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  padding: 3px;
}
.unit-btn {
  padding: 7px 24px;
  border-radius: 999px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: #888;
  background: transparent;
  &.active {
    background: #41ad49;
    color: #000;
  }
}

.recv-body {
  padding: 0 16px;
}
.recv-heading {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
}
.recv-sub {
  font-size: 14px;
  color: #888;
  line-height: 1.5;
  margin: 0 0 24px;
}

.qr-card {
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.qr-wrap {
  position: relative;
  display: inline-flex;
  border-radius: 12px;
  overflow: hidden;
}
.qr-img {
  display: block;
  width: 200px;
  height: 200px;
  border-radius: 12px;
}
.qr-bolt {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  pointer-events: none;
}
.qr-addr {
  font-size: 14px;
  font-weight: 600;
  color: #f5f5f5;
  text-align: center;
}
.invoice-str {
  font-family: monospace;
  font-size: 12px;
  color: #666;
}
.qr-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 14px;
}

.recv-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.recv-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #1a1a1e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px;
  color: #f5f5f5;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 16px;
  font-size: 14px;
  color: #888;
  cursor: pointer;
  &:hover {
    border-color: rgba(65, 173, 73, 0.3);
    color: #41ad49;
  }
}

.sub-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.sub-btn {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: #888;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &.active {
    background: rgba(65, 173, 73, 0.12);
    border-color: rgba(65, 173, 73, 0.4);
    color: #41ad49;
  }
}

.expiry-row {
  transition: color 0.3s;
}
.expiry-row.expiry-warning {
  color: #f59e0b;
}
.expiry-row.expiry-expired {
  color: #ef4444;
  cursor: pointer;
}
.expiry-row {
  width: 100%;
  text-align: center;
  font-size: 13px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.25);
  color: #eab308;
  cursor: pointer;
}
</style>
