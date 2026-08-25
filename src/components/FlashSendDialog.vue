<template>
  <!-- Flash-styled send chooser — delegates to existing PayInvoiceDialog / SendTokenDialog -->
  <q-dialog v-model="showSendDialog" position="bottom">
    <div class="send-sheet">
      <div class="sheet-handle" />
      <div class="sheet-title">Send</div>

      <!-- Lightning / address option -->
      <div class="send-option" @click="openLightning">
        <div class="send-option-icon send-option-icon--lightning">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div class="send-option-text">
          <div class="send-option-title">Lightning</div>
          <div class="send-option-sub">
            Invoice, Lightning address, or LNURL
          </div>
        </div>
        <svg
          class="send-option-chevron"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M9 18l6-6-6-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <!-- Ecash token option -->
      <div class="send-option" @click="openEcash">
        <div class="send-option-icon send-option-icon--ecash">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M12 6v2M12 16v2M8.5 9.5l1.5 1.5M14 14l1.5 1.5M6 12h2M16 12h2M8.5 14.5L10 13M14 10l1.5-1.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div class="send-option-text">
          <div class="send-option-title">Ecash</div>
          <div class="send-option-sub">Send a Cashu token</div>
        </div>
        <svg
          class="send-option-chevron"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M9 18l6-6-6-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <!-- Paste / pre-filled input -->
      <div class="send-paste-row">
        <div
          class="send-input-wrap"
          :class="{ 'send-input-wrap--filled': pasteInput }"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            class="send-input-icon"
          >
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
          <input
            v-model="pasteInput"
            class="send-input"
            placeholder="Paste invoice, token, or address…"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            @keyup.enter="submitPaste"
          />
          <button
            v-if="pasteInput"
            class="send-input-clear"
            @click="pasteInput = ''"
          >
            ✕
          </button>
        </div>
        <button
          class="send-go-btn"
          :disabled="!pasteInput.trim()"
          @click="submitPaste"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from "vue";
import { mapWritableState, mapActions } from "pinia";
import { useUiStore } from "src/stores/ui";
import { useWalletStore } from "src/stores/wallet";
import { useSendTokensStore } from "src/stores/sendTokensStore";
import { useMintsStore } from "src/stores/mints";
import { notifyWarning } from "src/js/notify";

export default defineComponent({
  name: "FlashSendDialog",

  setup() {
    const pasteInput = ref("");

    // Watch for pre-filled invoice from QR scanner
    const walletStore = useWalletStore();
    watch(
      () => walletStore.payInvoiceData?.input?.request,
      (val) => {
        if (val) pasteInput.value = val;
      }
    );

    return { pasteInput };
  },

  computed: {
    ...mapWritableState(useUiStore, ["showSendDialog"]),
    ...mapWritableState(useWalletStore, ["payInvoiceData"]),
    ...mapWritableState(useSendTokensStore, [
      "showSendTokens",
      "sendData",
      "showLockInput",
    ]),
    canPay() {
      return useMintsStore().mints?.length > 0;
    },
  },

  methods: {
    openLightning() {
      if (!this.canPay) {
        notifyWarning("Add a mint first to make payments");
        this.showSendDialog = false;
        return;
      }
      this.payInvoiceData.show = true;
      this.payInvoiceData.invoice = null;
      this.payInvoiceData.lnurlpay = null;
      this.payInvoiceData.domain = "";
      this.payInvoiceData.lnurlauth = null;
      this.payInvoiceData.input.request = "";
      this.payInvoiceData.input.comment = "";
      this.showSendDialog = false;
    },

    openEcash() {
      if (!this.canPay) {
        notifyWarning("Add a mint first to make payments");
        this.showSendDialog = false;
        return;
      }
      this.sendData.tokens = "";
      this.sendData.tokensBase64 = "";
      this.sendData.amount = null;
      this.sendData.memo = "";
      this.sendData.p2pkPubkey = "";
      this.sendData.paymentRequest = undefined;
      this.showLockInput = false;
      this.showSendTokens = true;
      this.showSendDialog = false;
    },

    submitPaste() {
      const val = this.pasteInput.trim();
      if (!val) return;
      if (!this.canPay) {
        notifyWarning("Add a mint first to make payments");
        this.showSendDialog = false;
        return;
      }
      // Detect type: cashuA/cashuB = ecash token, everything else = lightning/address
      if (
        val.toLowerCase().startsWith("cashua") ||
        val.toLowerCase().startsWith("cashub")
      ) {
        this.sendData.tokens = val;
        this.sendData.tokensBase64 = val;
        this.sendData.amount = null;
        this.sendData.memo = "";
        this.sendData.p2pkPubkey = "";
        this.sendData.paymentRequest = undefined;
        this.showLockInput = false;
        this.showSendTokens = true;
      } else {
        this.payInvoiceData.show = true;
        this.payInvoiceData.invoice = null;
        this.payInvoiceData.lnurlpay = null;
        this.payInvoiceData.domain = "";
        this.payInvoiceData.lnurlauth = null;
        this.payInvoiceData.input.request = val;
        this.payInvoiceData.input.comment = "";
      }
      this.pasteInput = "";
      this.showSendDialog = false;
    },
  },
});
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.send-sheet {
  background: #141418;
  border-radius: 20px 20px 0 0;
  padding: 12px 20px 40px;
  min-width: 100vw;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
    sans-serif;
  color: #f5f5f5;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 99px;
  margin: 0 auto 20px;
}

.sheet-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 16px;
}

.send-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  cursor: pointer;
  margin-bottom: 10px;
  transition: border-color 0.15s, background 0.15s;
}
.send-option:hover {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.07);
}
.send-option:active {
  background: rgba(255, 255, 255, 0.1);
}

.send-option-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.send-option-icon--lightning {
  background: rgba(250, 200, 0, 0.12);
  color: #f5c400;
}
.send-option-icon--ecash {
  background: rgba(65, 173, 73, 0.12);
  color: #41ad49;
}

.send-option-text {
  flex: 1;
}
.send-option-title {
  font-size: 15px;
  font-weight: 600;
}
.send-option-sub {
  font-size: 13px;
  color: #666;
  margin-top: 2px;
}

.send-option-chevron {
  color: #555;
  flex-shrink: 0;
}

/* Paste row */
.send-paste-row {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.send-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #111114;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 0 14px;
  height: 52px;
  transition: border-color 0.15s;
}
.send-input-wrap:focus-within {
  border-color: #41ad49;
}
.send-input-wrap--filled {
  border-color: rgba(65, 173, 73, 0.4);
}

.send-input-icon {
  color: #555;
  flex-shrink: 0;
}

.send-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #f5f5f5;
  font-size: 14px;
  padding: 0;
  min-width: 0;
}
.send-input::placeholder {
  color: #444;
}

.send-input-clear {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  flex-shrink: 0;
}
.send-input-clear:hover {
  color: #999;
}

.send-go-btn {
  width: 52px;
  height: 52px;
  background: #41ad49;
  border: none;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000;
  flex-shrink: 0;
  transition: background 0.15s;
}
.send-go-btn:hover {
  background: #4ec256;
}
.send-go-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
