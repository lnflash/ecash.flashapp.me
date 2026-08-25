<template>
  <div class="flash-wallet">
    <!-- Top bar -->
    <div class="flash-topbar"></div>

    <!-- Balance card -->
    <div class="balance-card">
      <div class="glow" />
      <div class="unit-toggle">
        <button
          class="unit-btn"
          :class="{ active: activeUnit === 'usd' }"
          @click="setUnit('usd')"
        >
          USD
        </button>
        <button
          class="unit-btn"
          :class="{ active: activeUnit === 'sat' }"
          @click="setUnit('sat')"
        >
          BTC
        </button>
      </div>
      <div class="balance-label">YOUR BALANCE</div>
      <div class="balance-amount">
        <span v-if="activeUnit === 'usd'">{{
          formatUsdUnit(totalBalance)
        }}</span>
        <span v-else>{{ formatBtc(totalBalance) }}</span>
      </div>
      <div class="balance-sub">
        <span v-if="activeUnit === 'usd'"
          >{{ totalBalance.toLocaleString() }} cents</span
        >
        <span v-else>{{ formatUsd(totalBalance) }}</span>
      </div>
      <div v-if="flashAddress" class="address-chip" @click="copyAddress">
        <span class="chip-bolt">⚡</span>
        <span class="chip-username">{{ flashUsername }}</span>
        <span class="chip-domain">@ecash.flashapp.me</span>
        <button class="chip-copy" @click.stop="copyAddress">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
        </button>
      </div>
      <div v-if="flashAddress" class="receive-unit-row">
        <span class="receive-unit-label">Receive Lightning as:</span>
        <div class="receive-unit-toggle">
          <button
            class="receive-unit-btn"
            :class="{ 'receive-unit-btn--active': receiveUnit === 'usd' }"
            @click.stop="setReceiveUnit('usd')"
          >
            USD
          </button>
          <button
            class="receive-unit-btn"
            :class="{ 'receive-unit-btn--active': receiveUnit === 'sat' }"
            @click.stop="setReceiveUnit('sat')"
          >
            BTC
          </button>
        </div>
      </div>
    </div>

    <!-- Action row -->
    <div class="action-row">
      <button
        class="action-btn action-btn--green"
        @click="$router.push('/receive')"
      >
        <div class="action-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M5 12l7 7 7-7"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <span class="action-label">Receive</span>
      </button>
      <button class="action-btn" @click="openSend">
        <div class="action-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 19V5M5 12l7-7 7 7"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <span class="action-label">Send</span>
      </button>
      <button class="action-btn" @click="showMore = true">
        <div class="action-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="5" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <span class="action-label">More</span>
      </button>
    </div>

    <!-- Transactions -->
    <div class="tx-section">
      <div class="tx-header">
        <span class="tx-title">Recent</span>
        <span class="tx-see-all" @click="goToFullHistory">{{
          showAllTx ? "See less" : "See all"
        }}</span>
      </div>
      <div v-if="transactions.length === 0" class="tx-empty">
        No transactions yet. Share your address to receive sats.
      </div>
      <div v-for="tx in displayedTx" :key="tx.id" class="tx-row">
        <div
          class="tx-icon"
          :class="tx.amount > 0 ? 'tx-icon--in' : 'tx-icon--out'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              v-if="tx.amount > 0"
              d="M12 5v14M5 12l7 7 7-7"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              v-else
              d="M12 19V5M5 12l7-7 7 7"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="tx-info">
          <div class="tx-name">
            {{ tx.label || (tx.amount > 0 ? "Received" : "Sent") }}
          </div>
          <div class="tx-sub">{{ txSubline(tx) }}</div>
        </div>
        <div
          class="tx-amount"
          :class="tx.amount > 0 ? 'tx-amount--in' : 'tx-amount--out'"
        >
          {{ tx.amount > 0 ? "+" : ""
          }}{{
            activeUnit === "usd"
              ? formatUsd(Math.abs(tx.amount))
              : Math.abs(tx.amount).toLocaleString() + " sats"
          }}
        </div>
      </div>
    </div>

    <!-- Settings sheet -->
    <q-dialog v-model="showSettings" position="bottom">
      <div class="bottom-sheet">
        <div class="sheet-handle" />
        <div class="sheet-title">Settings</div>
        <div class="sheet-items">
          <div class="sheet-item" @click="goToMints">
            <div class="sheet-item-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M12 8v4l3 3"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <span>Manage mints</span>
            </div>
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
          <div class="sheet-item" @click="goToSettings">
            <div class="sheet-item-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
              <span>App settings</span>
            </div>
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
      </div>
    </q-dialog>

    <!-- More sheet -->
    <q-dialog v-model="showMore" position="bottom">
      <div class="bottom-sheet">
        <div class="sheet-handle" />
        <div class="sheet-title">More</div>
        <div class="sheet-items">
          <div class="sheet-item" @click="openScanFromMore">
            <div class="sheet-item-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <rect
                  x="7"
                  y="7"
                  width="10"
                  height="10"
                  rx="1"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
              <span>Scan QR</span>
            </div>
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
          <div class="sheet-item" @click="openBackupKey">
            <div class="sheet-item-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="11"
                  width="18"
                  height="11"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M7 11V7a5 5 0 0110 0v4"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <span>Backup key</span>
            </div>
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
          <div class="sheet-item" @click="openHistory">
            <div class="sheet-item-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <polyline
                  points="12 8 12 12 14 14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <path
                  d="M3.05 11a9 9 0 1 0 .5-4.5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <polyline
                  points="3 3 3 7 7 7"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Full history</span>
            </div>
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
          <div class="sheet-item" @click="goToMintsFromMore">
            <div class="sheet-item-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M12 6v6l4 2"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <span>Mints</span>
            </div>
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
          <div class="sheet-item sheet-item--danger" @click="confirmReset">
            <div class="sheet-item-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <polyline
                  points="3 6 5 6 21 6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10 11v6M14 11v6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <span>Reset wallet</span>
            </div>
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
      </div>
    </q-dialog>

    <!-- QR Scanner sheet -->
    <q-dialog v-model="showScanner" position="bottom">
      <div class="scanner-sheet">
        <div class="sheet-handle" />
        <div class="scanner-header">
          <span class="sheet-title">Scan QR</span>
          <button class="scanner-close" @click="showScanner = false">✕</button>
        </div>
        <div class="scanner-wrap">
          <QrcodeReader v-if="showScanner" @decode="onQrDecode" />
        </div>
        <div class="scanner-hint">
          Point camera at a Lightning invoice, ecash token, or address
        </div>
      </div>
    </q-dialog>

    <!-- Backup key modal -->
    <q-dialog v-model="showBackupKey">
      <div class="backup-modal">
        <div class="backup-title">Your Nostr Key</div>
        <div class="backup-warning">
          ⚠️ Never share this with anyone. Store it somewhere safe.
        </div>
        <div class="backup-nsec" @click="copyNsec">{{ nsec }}</div>
        <button class="backup-copy-btn" @click="copyNsec">Copy nsec</button>
        <button class="backup-close-btn" @click="showBackupKey = false">
          Done
        </button>
      </div>
    </q-dialog>

    <!-- Flash Send Dialog + child dialogs (store-driven, no v-model needed) -->
    <FlashSendDialog />
    <PayInvoiceDialog />
    <SendTokenDialog />

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useProofsStore } from "src/stores/proofs";
import { useTokensStore } from "src/stores/tokens";
import { useFlashAddressStore } from "src/stores/flashAddress";
import { useMintsStore } from "src/stores/mints";
import { useUiStore } from "src/stores/ui";
import { useNostrStore } from "src/stores/nostr";
import { usePriceStore } from "src/stores/price";
import { useWalletStore } from "src/stores/wallet";
import { useSendTokensStore } from "src/stores/sendTokensStore";
import QrcodeReader from "src/components/QrcodeReader.vue";
import FlashSendDialog from "src/components/FlashSendDialog.vue";
import PayInvoiceDialog from "src/components/PayInvoiceDialog.vue";
import SendTokenDialog from "src/components/SendTokenDialog.vue";

const FLASH_MINT = "https://forge.flashapp.me";
const POLL_INTERVAL = 30_000;

export default defineComponent({
  name: "FlashWalletPage",
  components: {
    QrcodeReader,
    FlashSendDialog,
    PayInvoiceDialog,
    SendTokenDialog,
  },

  setup() {
    const router = useRouter();
    const proofsStore = useProofsStore();
    const tokensStore = useTokensStore();
    const flashStore = useFlashAddressStore();
    const mintsStore = useMintsStore();
    const uiStore = useUiStore();
    const nostrStore = useNostrStore();
    const priceStore = usePriceStore();

    const walletStore = useWalletStore();
    const sendTokensStore = useSendTokensStore();

    // unit managed by mintsStore.activeUnit
    const showSettings = ref(false);
    const showMore = ref(false);
    const showAllTx = ref(false);
    const showBackupKey = ref(false);
    const showScanner = ref(false);
    const toastMsg = ref("");
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const activeUnit = computed(() => mintsStore.activeUnit || "sat");
    const totalBalance = computed(() => mintsStore.totalUnitBalance);

    function setUnit(u: string) {
      mintsStore.activeUnit = u as any;
    }

    const btcPrice = ref(0);

    function formatUsd(sats: number) {
      if (!parseFloat(String(btcPrice.value))) return "$0.0000";
      const price = parseFloat(String(btcPrice.value)) || 0;
      const usd = (sats / 100_000_000) * price;
      if (usd >= 100) return "$" + usd.toFixed(2);
      if (usd >= 1) return "$" + usd.toFixed(3);
      return "$" + usd.toFixed(4);
    }

    // formatUsdUnit: usd proofs are stored in cents
    function formatUsdUnit(cents: number) {
      const dollars = cents / 100;
      if (dollars >= 100) return "$" + dollars.toFixed(2);
      if (dollars >= 1) return "$" + dollars.toFixed(2);
      return "$" + dollars.toFixed(4);
    }

    function formatBtc(sats: number) {
      return (sats / 100_000_000).toFixed(8);
    }

    const flashAddress = computed(() => flashStore.address);

    // Receive unit preference (default usd)
    const RECEIVE_UNIT_KEY = "cashu.flashAddress.receiveUnit";
    const receiveUnit = ref<string>(
      localStorage.getItem(RECEIVE_UNIT_KEY) || "usd"
    );

    async function setReceiveUnit(unit: string) {
      receiveUnit.value = unit;
      localStorage.setItem(RECEIVE_UNIT_KEY, unit);
      const uname = flashStore.username;
      if (!uname) return;
      try {
        await fetch(`https://ecash.flashapp.me/api/receive-unit/${uname}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiveUnit: unit }),
        });
      } catch {}
    }
    const flashUsername = computed(() => flashStore.username);

    const nsec = ref("");
    // Derive nsec from the actual stored private key hex
    (async () => {
      try {
        const privHex = JSON.parse(
          localStorage.getItem("cashu.ndk.privateKeySignerPrivateKey") || "null"
        );
        if (privHex && typeof privHex === "string" && privHex.length === 64) {
          const { bech32 } = await import("@scure/base");
          const privBytes = new Uint8Array(
            (privHex.match(/.{2}/g) as string[]).map((b) => parseInt(b, 16))
          );
          nsec.value = bech32.encode("nsec", bech32.toWords(privBytes), false);
          return;
        }
      } catch {}
      try {
        nsec.value = nostrStore.seedSignerPrivateKeyNsec || "";
      } catch {}
    })();

    const transactions = computed(() => {
      return (tokensStore.historyTokens || [])
        .filter((t: any) => t.amount !== 0)
        .sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    });

    const displayedTx = computed(() =>
      showAllTx.value ? transactions.value : transactions.value.slice(0, 5)
    );

    function txSubline(tx: any) {
      const parts: string[] = [];
      if (tx.mint) parts.push(tx.mint.replace("https://", "").split("/")[0]);
      if (tx.date) {
        const d = new Date(tx.date);
        const diffH = (Date.now() - d.getTime()) / 3_600_000;
        if (diffH < 24) parts.push(Math.round(diffH) + "h ago");
        else if (diffH < 48) parts.push("Yesterday");
        else
          parts.push(
            d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          );
      }
      return parts.join(" · ");
    }

    function openSend() {
      uiStore.showSendDialog = true;
    }

    function openScanFromMore() {
      showMore.value = false;
      showScanner.value = true;
    }

    function onQrDecode(data: string) {
      showScanner.value = false;
      if (!data) return;
      // Pre-fill the send dialog with the scanned value
      try {
        walletStore.payInvoiceData.input.request = data;
      } catch {}
      uiStore.showSendDialog = true;
    }

    function goToMints() {
      showSettings.value = false;
      router.push("/mints");
    }

    function goToSettings() {
      showSettings.value = false;
      router.push("/settings");
    }

    function goToMintsFromMore() {
      showMore.value = false;
      router.push("/mints");
    }

    function openHistory() {
      showMore.value = false;
      showAllTx.value = true;
      setTimeout(() => {
        document
          .querySelector(".tx-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }

    function goToFullHistory() {
      showAllTx.value = !showAllTx.value;
      if (showAllTx.value) {
        setTimeout(() => {
          document
            .querySelector(".tx-section")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }

    function openBackupKey() {
      showMore.value = false;
      showBackupKey.value = true;
    }

    function confirmReset() {
      showMore.value = false;
      if (
        confirm(
          "Reset wallet? This will clear all local data. Make sure you have your nsec backed up."
        )
      ) {
        localStorage.clear();
        location.reload();
      }
    }

    async function copyAddress() {
      if (!flashAddress.value) return;
      await navigator.clipboard.writeText(flashAddress.value);
      showToast("Address copied!");
    }

    async function copyNsec() {
      if (!nsec.value) return;
      await navigator.clipboard.writeText(nsec.value);
      showToast("Key copied!");
    }

    function showToast(msg: string) {
      toastMsg.value = msg;
      setTimeout(() => {
        toastMsg.value = "";
      }, 2000);
    }

    onMounted(async () => {
      // First-visit: redirect to setup wizard
      const setupDone = localStorage.getItem("cashu.flash.setupDone");
      if (!setupDone) {
        // Suppress stock cashu.me welcome flow
        localStorage.setItem(
          "cashu.welcome.showWelcome",
          JSON.stringify(false)
        );
        localStorage.setItem(
          "cashu.welcome.termsAccepted",
          JSON.stringify(true)
        );
        localStorage.setItem(
          "cashu.welcome.mintSetupCompleted",
          JSON.stringify(true)
        );
        router.replace("/setup");
        return;
      }

      // Ensure user is registered on the server (idempotent upsert)
      if (flashStore.username) {
        try {
          const privHex = JSON.parse(
            localStorage.getItem("cashu.ndk.privateKeySignerPrivateKey") ||
              "null"
          );
          if (privHex && typeof privHex === "string" && privHex.length === 64) {
            const { secp256k1 } = await import("@noble/curves/secp256k1");
            const { bech32 } = await import("@scure/base");
            const privBytes = new Uint8Array(
              privHex.match(/.{2}/g).map((b: string) => parseInt(b, 16))
            );
            const pubBytes = secp256k1.getPublicKey(privBytes, true);
            const xOnly = pubBytes.slice(1);
            const npub = bech32.encode("npub", bech32.toWords(xOnly));
            await fetch("https://ecash.flashapp.me/api/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: flashStore.username, npub }),
            });
          }
        } catch {}
      }

      const mints = mintsStore.mints || [];
      const hasFlash = mints.some((m: any) => m.url === FLASH_MINT);
      if (!hasFlash) {
        try {
          await mintsStore.addMint({ url: FLASH_MINT });
        } catch {}
      }
      try {
        const priceRes = await fetch("https://ecash.flashapp.me/api/price");
        const priceData = await priceRes.json();
        btcPrice.value = parseFloat(String(priceData?.usd || 0)) || 0;
        // Sync into priceStore so lnurlPaySecond (USD→SAT conversion) has a price
        if (btcPrice.value > 0) priceStore.bitcoinPrice = btcPrice.value;
      } catch {}
      if (flashStore.enabled) {
        flashStore.claimPending();
      }
      // Sync receive unit preference from server
      if (flashStore.username) {
        try {
          const ruRes = await fetch(
            `https://ecash.flashapp.me/api/receive-unit/${flashStore.username}`
          );
          if (ruRes.ok) {
            const ruData = await ruRes.json();
            receiveUnit.value = ruData.receiveUnit || "usd";
            localStorage.setItem(RECEIVE_UNIT_KEY, receiveUnit.value);
          }
        } catch {}
      }
      pollTimer = setInterval(async () => {
        try {
          await proofsStore.getProofs();
        } catch {}
      }, POLL_INTERVAL);
    });

    onUnmounted(() => {
      if (pollTimer) clearInterval(pollTimer);
    });

    return {
      activeUnit,
      totalBalance,
      flashAddress,
      flashUsername,
      nsec,
      receiveUnit,
      setReceiveUnit,
      transactions,
      displayedTx,
      showSettings,
      showMore,
      showAllTx,
      showBackupKey,
      toastMsg,
      formatUsd,
      formatUsdUnit,
      formatBtc,
      txSubline,
      setUnit,
      openSend,
      copyAddress,
      copyNsec,
      goToFullHistory,
      goToMints,
      goToSettings,
      goToMintsFromMore,
      openHistory,
      openBackupKey,
      confirmReset,
      showScanner,
      openScanFromMore,
      onQrDecode,
    };
  },
});
</script>

<style scoped lang="scss">
* {
  box-sizing: border-box;
}

.flash-wallet {
  min-height: 100vh;
  background: #0a0a0a;
  color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
    sans-serif;
  padding-bottom: 40px;
  max-width: 430px;
  margin: 0 auto;
}

.flash-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
}
.flash-wordmark {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: #f5f5f5;
}
.icon-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}
.icon-btn:hover {
  color: #f5f5f5;
}

.balance-card {
  position: relative;
  margin: 0 16px 20px;
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 20px;
  overflow: hidden;
}
.glow {
  position: absolute;
  top: -30px;
  right: -30px;
  width: 160px;
  height: 160px;
  background: radial-gradient(
    circle,
    rgba(65, 173, 73, 0.18) 0%,
    transparent 70%
  );
  pointer-events: none;
}
.unit-toggle {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  padding: 3px;
  margin-bottom: 16px;
}
.unit-btn {
  padding: 5px 16px;
  border-radius: 999px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #888;
  background: transparent;
  transition: all 0.15s;
}
.unit-btn.active {
  background: #41ad49;
  color: #000;
}
.balance-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #666;
  font-weight: 500;
  margin-bottom: 6px;
}
.balance-amount {
  font-size: 42px;
  font-weight: 700;
  letter-spacing: -1.5px;
  line-height: 1;
  margin-bottom: 4px;
}
.balance-sub {
  font-size: 14px;
  color: #888;
  margin-bottom: 16px;
}
.address-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
}
.address-chip:hover {
  border-color: rgba(65, 173, 73, 0.3);
}
.chip-bolt {
  font-size: 16px;
}
.chip-username {
  color: #41ad49;
  font-weight: 600;
  font-size: 14px;
}
.chip-domain {
  color: #888;
  font-size: 14px;
}
.chip-copy {
  margin-left: auto;
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.chip-copy:hover {
  color: #f5f5f5;
}
.receive-unit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding: 0 2px;
}
.receive-unit-label {
  font-size: 12px;
  color: #666;
}
.receive-unit-toggle {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  padding: 2px;
}
.receive-unit-btn {
  padding: 4px 12px;
  border-radius: 999px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: #666;
  background: transparent;
  transition: all 0.15s;
  font-family: inherit;
}
.receive-unit-btn--active {
  background: #41ad49;
  color: #000;
}

.action-row {
  display: flex;
  gap: 12px;
  padding: 0 16px 24px;
}
.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: #1a1a1e;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 14px 8px;
  cursor: pointer;
  color: #f5f5f5;
  transition: all 0.15s;
}
.action-btn:hover {
  border-color: rgba(255, 255, 255, 0.12);
}
.action-btn--green {
  background: #41ad49;
  border-color: #41ad49;
  color: #000;
}
.action-btn--green:hover {
  background: #4dc656;
}
.action-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}
.action-btn--green .action-icon {
  background: rgba(0, 0, 0, 0.15);
}
.action-label {
  font-size: 12px;
  font-weight: 600;
}

.tx-section {
  padding: 0 16px;
}
.tx-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.tx-title {
  font-size: 17px;
  font-weight: 700;
}
.tx-see-all {
  font-size: 14px;
  color: #41ad49;
  cursor: pointer;
}
.tx-empty {
  font-size: 14px;
  color: #555;
  text-align: center;
  padding: 32px 0;
}
.tx-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.tx-row:last-child {
  border-bottom: none;
}
.tx-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tx-icon--in {
  background: rgba(65, 173, 73, 0.15);
  color: #41ad49;
}
.tx-icon--out {
  background: rgba(255, 255, 255, 0.06);
  color: #888;
}
.tx-info {
  flex: 1;
  min-width: 0;
}
.tx-name {
  font-size: 15px;
  font-weight: 600;
}
.tx-sub {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tx-amount {
  font-size: 15px;
  font-weight: 700;
}
.tx-amount--in {
  color: #41ad49;
}
.tx-amount--out {
  color: #f5f5f5;
}

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
.sheet-items {
  display: flex;
  flex-direction: column;
}
.sheet-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #f5f5f5;
}
.sheet-item:last-child {
  border-bottom: none;
}
.sheet-item:hover {
  color: #41ad49;
}
.sheet-item--danger {
  color: #ff4444;
}
.sheet-item--danger:hover {
  color: #ff6666;
}
.sheet-item-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.backup-modal {
  background: #141418;
  border-radius: 20px;
  padding: 24px 20px;
  max-width: 360px;
  width: 90vw;
}
.backup-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}
.backup-warning {
  font-size: 13px;
  color: #f5a623;
  margin-bottom: 16px;
  background: rgba(245, 166, 35, 0.1);
  padding: 10px 12px;
  border-radius: 10px;
}
.backup-nsec {
  font-size: 12px;
  font-family: monospace;
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px;
  word-break: break-all;
  color: #888;
  margin-bottom: 16px;
  cursor: pointer;
}
.backup-nsec:hover {
  border-color: rgba(65, 173, 73, 0.4);
}
.backup-copy-btn {
  width: 100%;
  padding: 14px;
  background: #41ad49;
  color: #000;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 10px;
  font-size: 15px;
}
.backup-close-btn {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.06);
  color: #f5f5f5;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
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

/* Scanner sheet */
.scanner-sheet {
  background: #141418;
  border-radius: 20px 20px 0 0;
  padding: 12px 20px 40px;
  min-width: 100vw;
}
.scanner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.scanner-close {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}
.scanner-close:hover {
  color: #f5f5f5;
}
.scanner-wrap {
  border-radius: 14px;
  overflow: hidden;
  background: #000;
}
.scanner-hint {
  font-size: 13px;
  color: #666;
  text-align: center;
  margin-top: 14px;
}
</style>
