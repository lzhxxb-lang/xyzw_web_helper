<template>
  <MyCard class="legacy-claim" :statusClass="cardStatusClass">
    <template #icon>
      <img src="/icons/1736425783912140.png" alt="功法图标" />
    </template>

    <template #title>
      <h3>功法残卷</h3>
      <p>{{ subtitle }}</p>
    </template>

    <template #badge>
      <span>{{ badgeText }}</span>
    </template>

    <template #default>
      <div class="legacy-summary">
        <div class="legacy-summary__item legacy-summary__item--primary">
          <span class="legacy-summary__label">当前残卷</span>
          <strong class="legacy-summary__value">{{ fragmentCount }}</strong>
        </div>
        <div class="legacy-summary__item">
          <span class="legacy-summary__label">上次领取</span>
          <strong class="legacy-summary__value">{{ state.lastClaimed }}</strong>
        </div>
      </div>

      <div v-if="state.lastMessage" class="legacy-message" :class="messageClass">
        {{ state.lastMessage }}
      </div>
    </template>

    <template #action>
      <button
        class="action-button primary"
        :disabled="!canClaim"
        @click="claimLegacyFragments"
      >
        <span v-if="state.isClaiming" class="loading-text">
          <i class="line-md:loading-loop"></i>
          领取中...
        </span>
        <span v-else>领取残卷</span>
      </button>
      <button
        class="action-button secondary"
        :disabled="state.isRefreshing || !selectedTokenId"
        @click="refreshRoleInfo"
      >
        <span v-if="state.isRefreshing" class="loading-text">
          <i class="line-md:loading-loop"></i>
          刷新中...
        </span>
        <span v-else>刷新</span>
      </button>
    </template>
  </MyCard>
</template>

<script setup>
import { computed, ref } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import MyCard from "../Common/MyCard.vue";

const LEGACY_FRAGMENT_ITEM_ID = 37007;

const tokenStore = useTokenStore();
const message = useMessage();

const state = ref({
  isClaiming: false,
  isRefreshing: false,
  lastClaimed: 0,
  lastTotal: 0,
  lastMessage: "",
  lastResultType: "idle",
});

const roleInfo = computed(() => tokenStore.gameData?.roleInfo || null);

const selectedTokenId = computed(() => tokenStore.selectedToken?.id || "");

const isConnected = computed(() => {
  if (!selectedTokenId.value) return false;
  return tokenStore.getWebSocketStatus(selectedTokenId.value) === "connected";
});

const fragmentCount = computed(() => {
  return (
    roleInfo.value?.role?.items?.[LEGACY_FRAGMENT_ITEM_ID]?.quantity ||
    state.value.lastTotal ||
    0
  );
});

const legacyColor = computed(() => roleInfo.value?.role?.legacy?.color || 0);

const subtitle = computed(() => {
  if (!selectedTokenId.value) return "请先选择账号";
  if (!isConnected.value) return "账号未连接";
  if (legacyColor.value > 0) return `功法等级 ${legacyColor.value}`;
  return "挂机产出可领取";
});

const badgeText = computed(() => {
  if (state.value.isClaiming) return "领取中";
  if (!selectedTokenId.value) return "未选择";
  if (!isConnected.value) return "未连接";
  if (state.value.lastResultType === "success") return "已领取";
  if (state.value.lastResultType === "error") return "异常";
  return "待领取";
});

const cardStatusClass = computed(() => ({
  active: state.value.isClaiming,
  completed: state.value.lastResultType === "success",
  energy:
    !state.value.isClaiming &&
    state.value.lastResultType !== "success" &&
    (state.value.lastResultType === "error" ||
      !selectedTokenId.value ||
      !isConnected.value),
}));

const canClaim = computed(() => {
  return Boolean(
    selectedTokenId.value &&
      isConnected.value &&
      !state.value.isClaiming &&
      !state.value.isRefreshing,
  );
});

const messageClass = computed(() => ({
  "is-success": state.value.lastResultType === "success",
  "is-error": state.value.lastResultType === "error",
}));

const normalizeLegacyError = (error) => {
  const rawMessage = error?.message || String(error || "未知错误");
  if (rawMessage.includes("200160")) return "功法系统未开启";
  if (rawMessage.toLowerCase().includes("timeout")) {
    return "请求超时，请稍后重试";
  }
  if (rawMessage.includes("WebSocket未连接")) return "账号未连接，请先连接账号";
  return rawMessage;
};

const refreshRoleInfo = async () => {
  if (!selectedTokenId.value) {
    message.warning("请先选择Token");
    return;
  }

  if (!isConnected.value) {
    message.warning("当前账号未连接");
    return;
  }

  try {
    state.value.isRefreshing = true;
    await tokenStore.sendGetRoleInfo(selectedTokenId.value);
    message.success("功法数据已刷新");
  } catch (error) {
    const errorMessage = normalizeLegacyError(error);
    state.value.lastResultType = "error";
    state.value.lastMessage = errorMessage;
    message.error("刷新失败: " + errorMessage);
  } finally {
    state.value.isRefreshing = false;
  }
};

const claimLegacyFragments = async () => {
  if (!selectedTokenId.value) {
    message.warning("请先选择Token");
    return;
  }

  if (!isConnected.value) {
    message.warning("当前账号未连接");
    return;
  }

  try {
    state.value.isClaiming = true;
    state.value.lastMessage = "";
    state.value.lastResultType = "idle";
    message.info("正在领取功法残卷...");

    const result = await tokenStore.sendMessageWithPromise(
      selectedTokenId.value,
      "legacy_claimhangup",
      {},
      5000,
    );

    const rewardValue = Number(result?.reward?.[0]?.value || 0);
    const total = result?.role?.items?.[LEGACY_FRAGMENT_ITEM_ID]?.quantity;

    state.value.lastClaimed = rewardValue;
    state.value.lastTotal = Number(total || fragmentCount.value || 0);
    state.value.lastResultType = "success";
    state.value.lastMessage =
      rewardValue > 0
        ? `本次领取 ${rewardValue} 个，当前共有 ${state.value.lastTotal} 个`
        : "领取完成，暂无新增残卷";

    await tokenStore.sendGetRoleInfo(selectedTokenId.value);
    tokenStore.sendMessage(selectedTokenId.value, "legacy_getinfo");
    message.success("功法残卷领取完成");
  } catch (error) {
    const errorMessage = normalizeLegacyError(error);
    state.value.lastResultType = "error";
    state.value.lastMessage = errorMessage;
    message.error("功法残卷领取失败: " + errorMessage);
  } finally {
    state.value.isClaiming = false;
  }
};
</script>

<style scoped lang="scss">
.legacy-claim {
  .legacy-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-sm);
  }

  .legacy-summary__item {
    min-width: 0;
    padding: var(--spacing-md);
    border: 1px solid var(--border-light);
    border-radius: var(--border-radius-medium);
    background: var(--bg-secondary);
  }

  .legacy-summary__item--primary {
    background: var(--primary-color-light);
    border-color: var(--primary-color);
  }

  .legacy-summary__label {
    display: block;
    margin-bottom: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    line-height: var(--line-height-tight);
  }

  .legacy-summary__value {
    display: block;
    overflow: hidden;
    color: var(--text-primary);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-tight);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .legacy-message {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-medium);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    word-break: break-word;

    &.is-success {
      background: rgba(24, 160, 88, 0.1);
      color: var(--success-color);
    }

    &.is-error {
      background: rgba(208, 48, 80, 0.1);
      color: var(--error-color);
    }
  }

  .action-button {
    border: none;

    &.primary {
      --bg-color: var(--primary-color);
      --text-color: #fff;

      &:hover:not(:disabled) {
        background: var(--primary-color-hover);
      }
    }

    &.secondary {
      --bg-color: var(--bg-tertiary);
      --text-color: var(--text-primary);

      border: 1px solid var(--border-light);

      &:hover:not(:disabled) {
        color: var(--primary-color);
        border-color: var(--primary-color);
      }
    }
  }

  .loading-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
  }

  @media (max-width: 420px) {
    .legacy-summary {
      grid-template-columns: 1fr;
    }
  }
}
</style>
