<template>
  <div class="setup-page">
    <SetupWizard @complete="onComplete" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRouter } from "vue-router";
import SetupWizard from "src/components/wizard/SetupWizard.vue";
import { useMintsStore } from "src/stores/mints";

const FLASH_MINT = "https://forge.flashapp.me";
const SETUP_DONE_KEY = "cashu.flash.setupDone";

export default defineComponent({
  name: "SetupPage",
  components: { SetupWizard },
  setup() {
    const router = useRouter();
    const mintsStore = useMintsStore();

    async function onComplete() {
      // Pre-add Flash Forge mint
      try {
        await mintsStore.addMint({ url: FLASH_MINT });
      } catch {}
      localStorage.setItem(SETUP_DONE_KEY, "1");
      router.push("/");
    }

    return { onComplete };
  },
});
</script>

<style scoped>
.setup-page {
  position: fixed;
  inset: 0;
  background: #0a0a0a;
  overflow-y: auto;
  z-index: 9999;
}
</style>
