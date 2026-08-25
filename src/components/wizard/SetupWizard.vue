<template>
  <!-- Full-screen takeover — covers everything including cashu.me UI -->
  <div class="setup-wizard-overlay">
    <div class="setup-wizard">
      <!-- Progress bar -->
      <div class="wizard-progress-bar">
        <div
          class="wizard-progress-fill"
          :style="{ width: progressPct + '%' }"
        />
      </div>

      <!-- Steps -->
      <transition :name="transitionName" mode="out-in">
        <StepUsername
          v-if="step === 0"
          key="step0"
          @next="advance"
          @skip="advance"
        />
        <StepNostrKey
          v-else-if="step === 1"
          key="step1"
          @next="advance"
          @skip="advance"
        />
        <StepDone v-else key="step2" @done="complete" />
      </transition>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import StepUsername from "./StepUsername.vue";
import StepNostrKey from "./StepNostrKey.vue";
import StepDone from "./StepDone.vue";

export default defineComponent({
  name: "SetupWizard",
  components: { StepUsername, StepNostrKey, StepDone },
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "complete"],
  setup(props, { emit }) {
    const step = ref(0);
    const transitionName = ref("slide-left");

    const progressPct = computed(() => {
      if (step.value === 0) return 33;
      if (step.value === 1) return 66;
      return 100;
    });

    function advance() {
      transitionName.value = "slide-left";
      step.value = Math.min(step.value + 1, 2);
    }

    function complete() {
      localStorage.setItem("cashu.flash.setupDone", "1");
      emit("update:modelValue", false);
      emit("complete");
    }

    return { step, progressPct, transitionName, advance, complete };
  },
});
</script>

<style scoped>
.setup-wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0a0a0a;
  display: flex;
  align-items: stretch;
}

.setup-wizard {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.wizard-progress-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.wizard-progress-fill {
  height: 100%;
  background: #41ad49;
  transition: width 0.4s ease;
}

/* Slide transition */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}
.slide-left-enter-from {
  opacity: 0;
  transform: translateX(32px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-32px);
}
</style>
