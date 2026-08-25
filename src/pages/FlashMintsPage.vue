<template>
  <div class="mints-page">
    <!-- Header -->
    <div class="mints-header">
      <button class="back-btn" @click="$router.back()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 12H5M5 12l7 7M5 12l7-7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <span class="header-title">Mints</span>
      <button class="add-btn" @click="showAdd = true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- Mint list -->
    <div class="mints-list">
      <div
        v-for="mint in mintItems"
        :key="mint.url"
        class="mint-card"
        :class="{ 'mint-card--active': mint.url === activeMintUrl }"
        @click="activate(mint.url)"
      >
        <div class="mint-card-left">
          <div
            class="mint-dot"
            :class="{ 'mint-dot--active': mint.url === activeMintUrl }"
          />
          <div class="mint-info">
            <div class="mint-name">{{ mintLabel(mint.url) }}</div>
            <div class="mint-url">{{ mintShortUrl(mint.url) }}</div>
          </div>
        </div>
        <div class="mint-card-right">
          <div class="mint-balance">{{ mint.balance }} sats</div>
          <button
            v-if="mint.url !== FLASH_MINT"
            class="mint-remove"
            @click.stop="confirmRemove(mint.url)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="mintItems.length === 0" class="mints-empty">
        No mints added yet. Add one to get started.
      </div>
    </div>

    <!-- Add mint sheet -->
    <q-dialog v-model="showAdd" position="bottom">
      <div class="bottom-sheet">
        <div class="sheet-handle" />
        <div class="sheet-title">Add mint</div>

        <div
          class="input-wrap"
          :class="{
            'input-wrap--ok': urlValid,
            'input-wrap--error': addInput && !urlValid,
          }"
        >
          <input
            v-model="addInput"
            class="mint-input"
            placeholder="https://mint.example.com"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            @keyup.enter="doAddMint"
          />
        </div>
        <div v-if="addError" class="add-error">{{ addError }}</div>

        <!-- Quick-add Flash mint -->
        <div
          v-if="!hasFlashMint"
          class="quick-add"
          @click="addInput = FLASH_MINT"
        >
          <span class="quick-add-bolt">⚡</span>
          <span>Add Flash mint (forge.flashapp.me)</span>
        </div>

        <button
          class="add-mint-btn"
          :disabled="!urlValid || adding"
          @click="doAddMint"
        >
          {{ adding ? "Adding…" : "Add mint" }}
        </button>
      </div>
    </q-dialog>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useMintsStore, MintClass } from "src/stores/mints";
import { useProofsStore } from "src/stores/proofs";

const FLASH_MINT = "https://forge.flashapp.me";

export default defineComponent({
  name: "FlashMintsPage",

  setup() {
    const router = useRouter();
    const mintsStore = useMintsStore();
    const proofsStore = useProofsStore();

    const showAdd = ref(false);
    const addInput = ref("");
    const addError = ref("");
    const adding = ref(false);
    const toastMsg = ref("");

    const activeMintUrl = computed(() => mintsStore.activeMintUrl);

    const mintItems = computed(() => {
      return (mintsStore.mints || []).map((m: any) => {
        const mc = new MintClass(m);
        const balances = mc.allBalances;
        const balance = Object.values(
          balances as Record<string, number>
        ).reduce((s: number, v: number) => s + v, 0);
        return { url: m.url, balance };
      });
    });

    const hasFlashMint = computed(() =>
      (mintsStore.mints || []).some((m: any) => m.url === FLASH_MINT)
    );

    const urlValid = computed(() => {
      try {
        const u = new URL(addInput.value.trim());
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    });

    function mintLabel(url: string) {
      if (url === FLASH_MINT) return "⚡ Flash";
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    }

    function mintShortUrl(url: string) {
      return url
        .replace("https://", "")
        .replace("http://", "")
        .replace(/\/$/, "");
    }

    async function activate(url: string) {
      try {
        await mintsStore.activateMintUrl(url, false, true);
        showToast("Mint activated");
      } catch (e: any) {
        showToast("Could not activate mint");
      }
    }

    async function doAddMint() {
      if (!urlValid.value || adding.value) return;
      adding.value = true;
      addError.value = "";
      try {
        await mintsStore.addMint({ url: addInput.value.trim() });
        addInput.value = "";
        showAdd.value = false;
        showToast("Mint added!");
      } catch (e: any) {
        addError.value = e?.message || "Could not connect to mint";
      } finally {
        adding.value = false;
      }
    }

    async function confirmRemove(url: string) {
      if (!confirm(`Remove ${mintShortUrl(url)}?`)) return;
      try {
        await mintsStore.removeMint(url);
        showToast("Mint removed");
      } catch {
        showToast("Could not remove mint");
      }
    }

    function showToast(msg: string) {
      toastMsg.value = msg;
      setTimeout(() => {
        toastMsg.value = "";
      }, 2000);
    }

    return {
      FLASH_MINT,
      showAdd,
      addInput,
      addError,
      adding,
      activeMintUrl,
      mintItems,
      hasFlashMint,
      urlValid,
      toastMsg,
      mintLabel,
      mintShortUrl,
      activate,
      doAddMint,
      confirmRemove,
    };
  },
});
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.mints-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
    sans-serif;
  padding-bottom: 40px;
  max-width: 430px;
  margin: 0 auto;
}

.mints-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
}
.header-title {
  font-size: 17px;
  font-weight: 700;
}
.back-btn,
.add-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}
.back-btn:hover,
.add-btn:hover {
  color: #f5f5f5;
}
.add-btn {
  color: #41ad49;
}

.mints-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mint-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.mint-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
}
.mint-card--active {
  border-color: rgba(65, 173, 73, 0.4);
  background: rgba(65, 173, 73, 0.05);
}

.mint-card-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.mint-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}
.mint-dot--active {
  background: #41ad49;
}

.mint-info {
}
.mint-name {
  font-size: 15px;
  font-weight: 600;
}
.mint-url {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.mint-card-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mint-balance {
  font-size: 14px;
  font-weight: 600;
  color: #41ad49;
}
.mint-remove {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 6px;
}
.mint-remove:hover {
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.mints-empty {
  text-align: center;
  color: #555;
  font-size: 14px;
  padding: 48px 0;
}

/* Add sheet */
.bottom-sheet {
  background: #141418;
  border-radius: 20px 20px 0 0;
  padding: 12px 20px 40px;
  min-width: 100vw;
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

.input-wrap {
  display: flex;
  align-items: center;
  background: #111114;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 0 16px;
  height: 56px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
}
.input-wrap:focus-within {
  border-color: #41ad49;
}
.input-wrap--ok {
  border-color: rgba(65, 173, 73, 0.5);
}
.input-wrap--error {
  border-color: rgba(239, 68, 68, 0.4);
}

.mint-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #f5f5f5;
  font-size: 15px;
  padding: 0;
}
.mint-input::placeholder {
  color: #555;
}

.add-error {
  font-size: 13px;
  color: #ef4444;
  padding-left: 4px;
  margin-bottom: 12px;
}

.quick-add {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(65, 173, 73, 0.06);
  border: 1px solid rgba(65, 173, 73, 0.2);
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  color: #41ad49;
  margin-bottom: 16px;
}
.quick-add:hover {
  background: rgba(65, 173, 73, 0.1);
}
.quick-add-bolt {
  font-size: 18px;
}

.add-mint-btn {
  width: 100%;
  padding: 16px;
  background: #41ad49;
  color: #000;
  font-weight: 700;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  font-size: 16px;
  font-family: inherit;
  margin-top: 8px;
  transition: opacity 0.15s;
}
.add-mint-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.add-mint-btn:not(:disabled):hover {
  background: #4ec256;
}

.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: #41ad49;
  color: #000;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 99px;
  z-index: 9999;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
