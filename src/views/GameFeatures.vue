<template>
  <div class="game-features-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <div class="header-left">
            <span class="page-eyebrow">实时功能台</span>
            <h1 class="page-title">游戏功能</h1>
            <p class="page-subtitle">
              当前账号：{{ tokenStore.selectedToken?.name || "未选择Token" }}
            </p>
          </div>

          <div class="header-actions">
            <div class="connection-status" :class="connectionStatus">
              <n-icon>
                <CloudDone />
              </n-icon>
              <span>{{ connectionStatusText }}</span>
            </div>
            <n-button
              strong
              secondary
              :type="isConnected ? 'error' : 'primary'"
              @click="toggleConnection"
            >
              {{ isConnected ? "断开连接" : "重新连接" }}
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 反馈提示区域 -->
    <div v-if="showFeedback" class="feedback-section" />

    <!-- 功能模块网格 -->
    <div class="features-grid-section">
      <div class="container">
        <GameStatus />
      </div>
    </div>

    <!-- WebSocket 连接状态 -->
    <div class="ws-status-section">
      <div class="container">
        <div class="ws-status-card">
          <div class="status-header">
            <h3>连接状态</h3>
            <n-button text @click="toggleConnection">
              {{ isConnected ? "断开连接" : "重新连接" }}
            </n-button>
          </div>
          <div class="status-content">
            <div class="status-item">
              <span>WebSocket状态:</span>
              <span :class="connectionClass">{{ connectionStatusText }}</span>
            </div>
            <div v-if="tokenStore.selectedToken" class="status-item">
              <span>当前Token:</span>
              <span>{{ tokenStore.selectedToken.name }}</span>
            </div>
            <div v-if="lastActivity" class="status-item">
              <span>最后活动:</span>
              <span>{{ lastActivity }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { CloudDone } from "@vicons/ionicons5";

const router = useRouter();
const message = useMessage();
const tokenStore = useTokenStore();

// 响应式数据
const showFeedback = ref(true);
const lastActivity = ref(null);

// 计算属性
const connectionStatus = computed(() => {
  if (!tokenStore.selectedToken) return "disconnected";
  const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
  return status === "connected" ? "connected" : "disconnected";
});

const connectionStatusText = computed(() => {
  if (!tokenStore.selectedToken) return "未选择Token";
  const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
  return status === "connected" ? "已连接" : "未连接";
});

const connectionClass = computed(() => {
  return connectionStatus.value === "connected"
    ? "status-connected"
    : "status-disconnected";
});

const isConnected = computed(() => {
  return connectionStatus.value === "connected";
});

const pickArenaTargetId = (targets) => {
  const candidate =
    targets?.rankList?.[0] ||
    targets?.roleList?.[0] ||
    targets?.targets?.[0] ||
    targets?.targetList?.[0] ||
    targets?.list?.[0];

  if (candidate?.roleId) return candidate.roleId;
  if (candidate?.id) return candidate.id;
  return targets?.roleId || targets?.id;
};

// 方法
const handleFeatureAction = async (featureType) => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择Token");
    router.push("/admin/tokens");
    return;
  }

  const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
  if (status !== "connected") {
    message.warning("WebSocket未连接，请先建立连接");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  const actions = {
    "team-challenge": async () => {
      message.info("开始执行队伍挑战...");
      let targets;
      try {
        targets = await tokenStore.sendMessageWithPromise(
          tokenId,
          "arena_getareatarget",
          {},
          8000,
        );
      } catch (err) {
        message.error(`获取竞技场目标失败：${err.message}`);
        return;
      }
      const targetId = pickArenaTargetId(targets);
      if (!targetId) {
        message.warning("未找到可挑战的竞技场目标");
        return;
      }
      try {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "fight_startareaarena",
          { targetId },
          15000,
        );
        message.success("竞技场战斗已发起");
      } catch (err) {
        message.error(`竞技场战斗失败：${err.message}`);
      }
    },
    "daily-tasks": () => {
      message.info("启动每日任务服务...");
      tokenStore.sendMessage(tokenId, "task_claimdailyreward");
    },
    "salt-robot": () => {
      message.info("领取盐罐机器人奖励...");
      tokenStore.sendMessage(tokenId, "bottlehelper_claim");
    },
    "idle-time": () => {
      message.info("领取挂机时间奖励...");
      tokenStore.sendMessage(tokenId, "system_claimhangupreward");
    },
    "power-switch": () => {
      message.info("执行威震大开关...");
      tokenStore.sendMessage(tokenId, "role_getroleinfo");
    },
    "club-ranking": () => {
      message.info("报名俱乐部排位...");
      tokenStore.sendMessage(tokenId, "legionmatch_rolesignup");
    },
    "club-checkin": () => {
      message.info("执行俱乐部签到...");
      tokenStore.sendMessage(tokenId, "legion_signin");
    },
    "tower-challenge": () => {
      message.info("开始爬塔挑战...");
      // 关键业务：只提示 UI，不打印冗余日志
      // 实际请求体: {"ack":0,"body":{},"cmd":"fight_starttower","seq":XX,"time":TIMESTAMP}
      tokenStore.sendMessage(tokenId, "fight_starttower");
    },
  };

  const action = actions[featureType];
  if (action) {
    await action();
  } else {
    message.warning("功能暂未实现");
  }
};

// 已移除 sendWebSocketMessage，使用 tokenStore.sendMessage 代替

const connectWebSocket = () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择一个Token");
    router.push("/admin/tokens");
    return;
  }

  try {
    const tokenId = tokenStore.selectedToken.id;
    const token = tokenStore.selectedToken.token;

    // 使用 tokenStore 的 WebSocket 连接管理
    tokenStore.createWebSocketConnection(tokenId, token);
    message.info("正在建立 WebSocket 连接...");

    // 等待连接建立
    setTimeout(async () => {
      const status = tokenStore.getWebSocketStatus(tokenId);
      if (status === "connected") {
        message.success("WebSocket 连接成功");
        // 连接成功后自动初始化游戏数据
        await initializeGameData();
      }
    }, 2000);
  } catch (error) {
    console.error("WebSocket连接失败:", error);
    message.error("WebSocket连接失败");
  }
};

const disconnectWebSocket = () => {
  if (tokenStore.selectedToken) {
    const tokenId = tokenStore.selectedToken.id;
    tokenStore.closeWebSocketConnection(tokenId);
    message.info("WebSocket连接已断开");
  }
};

const toggleConnection = () => {
  if (connectionStatus.value === "connected") {
    disconnectWebSocket();
  } else {
    connectWebSocket();
  }
};

// handleWebSocketMessage 已移除，消息处理由 tokenStore 负责

// 生命周期
onMounted(() => {
  // 检查是否需要连接 WebSocket
  if (tokenStore.selectedToken) {
    const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
    if (status !== "connected") {
      connectWebSocket();
    } else {
      // 如果已连接，立即获取初始数据
      initializeGameData();
    }
  }
});

// 监听当前选中 Token 的连接错误（如 token 过期）并给出明确提示
watch(
  () => {
    if (!tokenStore.selectedToken)
      return { status: "disconnected", lastError: null };
    const conn = tokenStore.wsConnections[tokenStore.selectedToken.id];
    return { status: conn?.status, lastError: conn?.lastError };
  },
  (cur) => {
    if (!cur) return;
    if (cur.status === "error" && cur.lastError) {
      const err = String(cur.lastError.error || "").toLowerCase();
      if (err.includes("token") && err.includes("expired")) {
        const importMethod = tokenStore.selectedToken?.importMethod;
        if (
          importMethod === "url" ||
          importMethod === "bin" ||
          importMethod === "wxQrcode"
        ) {
          message.warning("Token已过期，正在尝试自动刷新...");
          return;
        }
        message.error("当前 Token 已过期，请重新导入后再试");
        router.push("/admin/tokens");
      }
    }
  },
  { deep: true },
);

// 初始化游戏数据
const initializeGameData = async () => {
  if (!tokenStore.selectedToken) return;

  try {
    const tokenId = tokenStore.selectedToken.id;
    // 获取初始化数据（静默）
    tokenStore.sendMessage(tokenId, "role_getroleinfo");
    tokenStore.sendMessage(tokenId, "tower_getinfo");
    tokenStore.sendMessage(tokenId, "evotower_getinfo");
    tokenStore.sendMessage(tokenId, "presetteam_getinfo");
    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "fight_startlevel",
    );
    tokenStore.setBattleVersion(res?.battleData?.version);
  } catch (error) {
    // 静默处理初始化异常
  }
};

onUnmounted(() => {
  // WebSocket 连接由 tokenStore 管理，不需要手动清理
});
</script>

<style scoped lang="scss">
.game-features-page {
  --features-page-bg:
    linear-gradient(135deg, rgba(15, 118, 110, 0.08), transparent 30%),
    linear-gradient(180deg, #f4f8f6 0%, #e8f0ed 100%);
  --features-panel-bg: rgba(255, 255, 255, 0.86);
  --features-panel-strong: rgba(255, 255, 255, 0.94);
  --features-border: rgba(31, 52, 71, 0.12);
  --features-shadow: 0 20px 46px rgba(18, 38, 63, 0.12);
  --features-soft-shadow: 0 10px 24px rgba(18, 38, 63, 0.08);
  --features-accent: #0f766e;
  --features-accent-soft: rgba(15, 118, 110, 0.12);
  --features-ink: #13212f;
  --features-muted: #607083;
  min-height: 100dvh;
  background: var(--features-page-bg);
  padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom));
  overflow-x: clip;
}

/* 深色主题下背景 */
[data-theme="dark"] .game-features-page {
  --features-page-bg:
    linear-gradient(135deg, rgba(20, 184, 166, 0.1), transparent 32%),
    linear-gradient(180deg, #0d1622 0%, #111827 100%);
  --features-panel-bg: rgba(22, 32, 45, 0.82);
  --features-panel-strong: rgba(28, 40, 55, 0.94);
  --features-border: rgba(148, 163, 184, 0.18);
  --features-shadow: 0 22px 52px rgba(0, 0, 0, 0.34);
  --features-soft-shadow: 0 10px 26px rgba(0, 0, 0, 0.26);
  --features-accent: #2dd4bf;
  --features-accent-soft: rgba(45, 212, 191, 0.14);
  --features-ink: #f8fafc;
  --features-muted: #a7b4c2;
  background: var(--features-page-bg);
}

// 页面头部
.page-header {
  padding: clamp(18px, 3vw, 34px) 0 var(--spacing-md);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .page-header {
    padding: var(--spacing-md) 0;
    margin-bottom: var(--spacing-md);

    .header-content {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-md);
      text-align: left;
    }

    .page-title {
      font-size: var(--font-size-xl);
    }
  }

  .features-grid-section {
    padding: var(--spacing-md) 0;
  }

  .ws-status-section {
    padding: 0 0 var(--spacing-lg) 0;
  }

  .ws-status-card {
    padding: var(--spacing-md);
  }
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--spacing-lg);
  padding: clamp(18px, 3vw, 28px);
  border: 1px solid var(--features-border);
  border-radius: 22px;
  background:
    linear-gradient(135deg, var(--features-panel-strong), var(--features-panel-bg)),
    repeating-linear-gradient(
      135deg,
      transparent 0,
      transparent 10px,
      rgba(15, 118, 110, 0.035) 10px,
      rgba(15, 118, 110, 0.035) 11px
    );
  box-shadow: var(--features-shadow);
  backdrop-filter: blur(16px);
}

.header-left {
  flex: 1;
  min-width: 0;
}

.page-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border: 1px solid rgba(15, 118, 110, 0.22);
  border-radius: 999px;
  background: var(--features-accent-soft);
  color: var(--features-accent);
  font-size: 12px;
  font-weight: 700;
}

.page-title {
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 800;
  color: var(--features-ink);
  line-height: 1.08;
  margin: 12px 0 0;
}

.page-subtitle {
  color: var(--features-muted);
  font-size: var(--font-size-md);
  margin: 10px 0 0;
  overflow-wrap: anywhere;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);

  &.connected {
    background: rgba(24, 160, 88, 0.1);
    border-color: rgba(24, 160, 88, 0.18);
    color: var(--success-color);
  }

  &.disconnected {
    background: rgba(208, 48, 80, 0.1);
    border-color: rgba(208, 48, 80, 0.18);
    color: var(--error-color);
  }
}

// 反馈提示区域
.feedback-section {
  display: none;
}

// 功能模块网格
.features-grid-section {
  padding: var(--spacing-md) 0 var(--spacing-lg);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.feature-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-lg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all var(--transition-normal);
  border-left: 4px solid var(--primary-color);

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  // 不同功能的主题色
  &.team-challenge {
    border-left-color: #2080f0;
  }

  &.daily-tasks {
    border-left-color: #f0a020;
  }

  &.salt-robot {
    border-left-color: #18a058;
  }

  &.idle-time {
    border-left-color: #d03050;
  }

  &.power-switch {
    border-left-color: #7c3aed;
  }

  &.club-ranking {
    border-left-color: #f59e0b;
  }

  &.club-checkin {
    border-left-color: #10b981;
  }

  &.tower-challenge {
    border-left-color: #6366f1;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-medium);
  background: var(--primary-color-light);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  :deep(svg) {
    width: 24px;
    height: 24px;
  }
}

.feature-title {
  flex: 1;

  h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0 0 var(--spacing-xs) 0;
  }
}

.feature-subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.feature-badge,
.feature-status {
  flex-shrink: 0;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-small);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.feature-status {
  &.in-progress {
    background: rgba(240, 160, 32, 0.1);
    color: var(--warning-color);
  }

  &.completed {
    background: rgba(24, 160, 88, 0.1);
    color: var(--success-color);
  }

  &.waiting {
    background: rgba(32, 128, 240, 0.1);
    color: var(--info-color);
  }
}

.card-content {
  margin-bottom: var(--spacing-lg);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);

  .stage-text {
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
  }

  .progress-text {
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
  }
}

.time-display {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  text-align: center;
  margin-bottom: var(--spacing-sm);
  font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
}

.task-description {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.card-actions {
  margin-top: var(--spacing-lg);
}

// WebSocket状态区域
.ws-status-section {
  padding: 0 0 var(--spacing-xl) 0;
}

.ws-status-card {
  background: var(--features-panel-bg);
  border: 1px solid var(--features-border);
  border-radius: 18px;
  padding: var(--spacing-lg);
  box-shadow: var(--features-soft-shadow);
  backdrop-filter: blur(14px);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);

  h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0;
  }
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--features-border);

  &:last-child {
    border-bottom: none;
  }

  span:first-child {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  span:last-child {
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
    text-align: right;
    overflow-wrap: anywhere;
  }
}

.status-connected {
  color: var(--success-color);
}

.status-disconnected {
  color: var(--error-color);
}

// 响应式设计
@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
    text-align: center;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .feature-card {
    padding: var(--spacing-md);
  }

  .card-header {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-sm);
  }
}
</style>
