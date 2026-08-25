import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useWalletStore } from "./wallet";
import { useReceiveTokensStore } from "./receiveTokensStore";
import { useTokensStore } from "./tokens";
import { notifySuccess } from "../js/notify";
import token from "../js/token";

const FLASH_API = "https://ecash.flashapp.me";

export const useFlashAddressStore = defineStore("flashAddress", {
  state: () => ({
    username: useLocalStorage<string>("cashu.flashAddress.username", ""),
    enabled: useLocalStorage<boolean>("cashu.flashAddress.enabled", false),
    lastCheck: useLocalStorage<number | null>(
      "cashu.flashAddress.lastCheck",
      null
    ),
    automaticClaim: useLocalStorage<boolean>(
      "cashu.flashAddress.automaticClaim",
      true
    ),
    loading: false,
  }),

  getters: {
    address(): string {
      if (!this.username) return "";
      return `${this.username}@ecash.flashapp.me`;
    },
    privkeyHex(): string {
      try {
        const stored = localStorage.getItem(
          "cashu.ndk.privateKeySignerPrivateKey"
        );
        if (!stored) return "";
        const val = JSON.parse(stored);
        return typeof val === "string" && val.length === 64 ? val : "";
      } catch {
        return "";
      }
    },
  },

  actions: {
    connect: function (username: string) {
      this.username = username.toLowerCase().trim();
      this.enabled = true;
      notifySuccess(`⚡ Flash Address connected: ${this.address}`);
    },

    disconnect: function () {
      this.username = "";
      this.enabled = false;
    },

    claimPending: async function () {
      if (!this.enabled || !this.username) return;
      if (!this.privkeyHex) {
        console.log("[flashAddress] no privkey stored, skipping claim");
        return;
      }

      this.lastCheck = Date.now();
      this.loading = true;

      try {
        const res = await fetch(`${FLASH_API}/api/claim/${this.username}`);
        if (!res.ok) return;
        const data = await res.json();

        if (!data.token || data.balance === 0) return;

        console.log(
          `[flashAddress] ${data.balance} sats pending for ${this.username}`
        );

        // Guard: don't re-claim tokens already in history
        const tokensStore = useTokensStore();
        if (
          tokensStore.historyTokens.find((t: any) => t.token === data.token)
        ) {
          console.log("[flashAddress] token already in history, skipping");
          return;
        }

        // Decode token to get amount/mint/unit
        const decoded = token.decode(data.token);
        if (!decoded) return;
        const amount = token
          .getProofs(decoded)
          .reduce((s: number, p: any) => s + p.amount, 0);
        const mintUrl = token.getMint(decoded);
        const unit = (token.getUnit(decoded) as string) || "sat";

        // Add to history as pending
        tokensStore.addPendingToken({
          label: `⚡ ${this.address}`,
          amount,
          token: data.token,
          mint: mintUrl,
          unit,
        });

        if (this.automaticClaim) {
          const receiveStore = useReceiveTokensStore();
          const walletStore = useWalletStore();

          // Provide P2PK privkey so receiveTokensStore can unlock locked proofs
          receiveStore.receiveData.tokensBase64 = data.token;
          receiveStore.receiveData.p2pkPrivateKey = this.privkeyHex;

          try {
            await walletStore.redeem();
            notifySuccess(`⚡ ${amount} sats received from ${this.address}`);

            // Clear server-side proofs after successful claim
            await fetch(`${FLASH_API}/api/claimed/${this.username}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pubkey: data.pubkey }),
            }).catch(() => {});
          } catch (e) {
            console.error("[flashAddress] auto-redeem failed:", e);
            receiveStore.showReceiveTokens = true;
          }
        }
      } catch (e) {
        console.error("[flashAddress] claim error:", e);
      } finally {
        this.loading = false;
      }
    },
  },
});
