<template>
  <div class="default-layout">
    <!-- 顶部导航 -->
    <nav class="dashboard-nav">
      <div class="nav-container">
        <div class="nav-brand">
          <img src="/icons/xiaoyugan.png" alt="XYZW" class="brand-logo" />
          <div class="brand-toggle" @click="isMobileMenuOpen = true">
            <n-icon>
              <Menu />
            </n-icon>
            <span class="brand-text">XYZW 控制台</span>
          </div>
        </div>

        <div class="nav-menu">
          <router-link
            to="/admin/dashboard"
            class="nav-item"
            active-class="active"
          >
            <n-icon>
              <Home />
            </n-icon>
            <span>首页</span>
          </router-link>
          <router-link
            to="/admin/game-features"
            class="nav-item"
            active-class="active"
          >
            <n-icon>
              <Cube />
            </n-icon>
            <span>游戏功能</span>
          </router-link>
          <router-link
            to="/admin/batch-daily-tasks"
            class="nav-item"
            active-class="active"
          >
            <n-icon>
              <Layers />
            </n-icon>
            <span>批量日常</span>
          </router-link>
          <router-link
            to="/admin/message-test"
            class="nav-item"
            active-class="active"
          >
            <n-icon>
              <ChatbubbleEllipsesSharp />
            </n-icon>
            <span>消息测试</span>
          </router-link>
          <router-link to="/admin/legion-war" class="nav-item" active-class="active"  v-if="isNowInLegionWarTime()" >
            <n-icon>
              <LockOpen />
            </n-icon>
            <span>实时盐场</span>
          </router-link>
        </div>

        <div class="nav-user">
          <!-- 主题切换按钮 -->
          <ThemeToggle />

          <n-popover
            v-model:show="isAccountSwitcherOpen"
            trigger="click"
            placement="bottom-end"
            :show-arrow="false"
            class="account-switcher-popover"
          >
            <template #trigger>
              <div
                class="account-switcher"
                :class="{ 'is-open': isAccountSwitcherOpen }"
              >
                <div class="account-switcher__avatar-wrap">
                  <n-avatar
                    :src="selectedToken?.avatar || '/icons/xiaoyugan.png'"
                    size="medium"
                    fallback-src="/icons/xiaoyugan.png"
                  />
                  <span class="account-switcher__count">
                    {{ tokenStore.gameTokens.length }}
                  </span>
                </div>

                <div class="account-switcher__summary">
                  <span class="account-switcher__name">
                    {{ selectedToken?.name || "未选择账号" }}
                  </span>
                  <span class="account-switcher__meta">
                    {{ selectedToken?.server || "点击切换Token" }}
                  </span>
                </div>

                <n-icon class="account-switcher__caret">
                  <ChevronDown />
                </n-icon>
              </div>
            </template>

            <div class="account-switcher-panel">
              <div class="account-switcher-panel__search">
                <n-input
                  v-model:value="tokenSearchKeyword"
                  clearable
                  placeholder="搜索Token..."
                >
                  <template #prefix>
                    <n-icon>
                      <Search />
                    </n-icon>
                  </template>
                </n-input>
              </div>

              <div class="account-switcher-panel__filters">
                <button
                  v-for="option in tokenFilterOptions"
                  :key="option.key"
                  type="button"
                  class="account-switcher-panel__filter"
                  :class="{ active: activeTokenFilter === option.key }"
                  @click="activeTokenFilter = option.key"
                >
                  {{ option.label }} ({{ option.count }})
                </button>
              </div>

              <div
                v-if="filteredTokens.length > 0"
                class="account-switcher-panel__list"
              >
                <button
                  v-for="token in filteredTokens"
                  :key="token.id"
                  type="button"
                  class="account-switcher-panel__item"
                  :class="{ active: selectedTokenId === token.id }"
                  @click="handleSelectToken(token.id)"
                >
                  <div class="account-switcher-panel__item-avatar">
                    <n-avatar
                      :src="token.avatar || '/icons/xiaoyugan.png'"
                      size="small"
                      fallback-src="/icons/xiaoyugan.png"
                    />
                    <span
                      class="account-switcher-panel__status-dot"
                      :class="getTokenStatusClass(token.id)"
                    ></span>
                  </div>

                  <div class="account-switcher-panel__item-body">
                    <div class="account-switcher-panel__item-top">
                      <span class="account-switcher-panel__item-name">
                        {{ token.name }}
                      </span>
                      <span
                        class="account-switcher-panel__item-check"
                        v-if="selectedTokenId === token.id"
                      >
                        <n-icon>
                          <Checkmark />
                        </n-icon>
                      </span>
                    </div>

                    <div class="account-switcher-panel__item-meta">
                      <span class="account-switcher-panel__item-server">
                        {{ token.server || "未标记服务器" }}
                      </span>
                      <span class="account-switcher-panel__item-level">
                        Lv.{{ token.level || 1 }}
                      </span>
                      <span class="account-switcher-panel__item-connection">
                        {{ getTokenStatusText(token.id) }}
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              <div v-else class="account-switcher-panel__empty">
                {{ tokenStore.gameTokens.length ? "没有匹配的账号" : "暂无Token账号" }}
              </div>

              <div class="account-switcher-panel__footer">
                <button
                  type="button"
                  class="account-switcher-panel__footer-action"
                  @click="goToTokenManager"
                >
                  <n-icon>
                    <PersonCircle />
                  </n-icon>
                  <span>管理Token</span>
                </button>

                <button
                  type="button"
                  class="account-switcher-panel__footer-action icon-only"
                  @click="refreshSelectedToken"
                  :disabled="!selectedTokenId"
                  title="重新连接当前账号"
                >
                  <n-icon>
                    <Refresh />
                  </n-icon>
                </button>
              </div>
            </div>
          </n-popover>

          <n-dropdown
            trigger="click"
            placement="bottom-end"
            :options="userMenuOptions"
            @select="handleUserAction"
          >
            <button type="button" class="user-settings-button" title="更多设置">
              <n-icon>
                <Settings />
              </n-icon>
            </button>
          </n-dropdown>
        </div>
      </div>
    </nav>
    <n-drawer
      v-model:show="isMobileMenuOpen"
      placement="left"
      style="width: 260px"
    >
      <div class="drawer-menu">
        <router-link
          to="/admin/dashboard"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Home />
          </n-icon>
          <span>首页</span>
        </router-link>
        <router-link
          to="/admin/game-features"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Cube />
          </n-icon>
          <span>游戏功能</span>
        </router-link>
        <router-link
          to="/tokens"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <PersonCircle />
          </n-icon>
          <span>Token管理</span>
        </router-link>
        <router-link
          to="/admin/daily-tasks"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Settings />
          </n-icon>
          <span>任务管理</span>
        </router-link>
        <router-link
          to="/admin/batch-daily-tasks"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Layers />
          </n-icon>
          <span>批量日常</span>
        </router-link>
        <router-link
          to="/admin/message-test"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <ChatbubbleEllipsesSharp />
          </n-icon>
          <span>消息测试</span>
        </router-link>
          <router-link to="/admin/legion-war" class="nav-item" active-class="active"  v-if="isNowInLegionWarTime()" >
            <n-icon>
              <LockOpen />
            </n-icon>
            <span>实时盐场</span>
          </router-link>
        <router-link
          to="/admin/profile"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Settings />
          </n-icon>
          <span>个人设置</span>
        </router-link>
      </div>
    </n-drawer>
    <div class="main">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import {
  useTokenStore,
  selectedToken,
  selectedTokenId,
} from "@/stores/tokenStore";
import ThemeToggle from "@/components/Common/ThemeToggle.vue";
import {
  Home,
  PersonCircle,
  Cube,
  Settings,
  ChevronDown,
  ChatbubbleEllipsesSharp,
  LockOpen,
  Menu,
  Layers,
  Search,
  Refresh,
  Checkmark,
} from "@vicons/ionicons5";

import { useRouter } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { isNowInLegionWarTime } from '@/utils/clubBattleUtils'

const tokenStore = useTokenStore();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const isMobileMenuOpen = ref(false);
const isAccountSwitcherOpen = ref(false);
const tokenSearchKeyword = ref("");
const activeTokenFilter = ref("all");

const userMenuOptions = [
  {
    label: "清除所有Token并退出",
    key: "logout",
  },
];

const getTokenStatusValue = (tokenId) => tokenStore.getWebSocketStatus(tokenId);

const getTokenStatusClass = (tokenId) => {
  const status = getTokenStatusValue(tokenId);
  switch (status) {
    case "connected":
      return "is-online";
    case "connecting":
      return "is-connecting";
    case "error":
      return "is-error";
    default:
      return "is-offline";
  }
};

const getTokenStatusText = (tokenId) => {
  const status = getTokenStatusValue(tokenId);
  switch (status) {
    case "connected":
      return "在线";
    case "connecting":
      return "连接中";
    case "error":
      return "异常";
    default:
      return "离线";
  }
};

const tokenFilterOptions = computed(() => {
  const all = tokenStore.gameTokens.length;
  const online = tokenStore.gameTokens.filter(
    (token) => getTokenStatusValue(token.id) === "connected",
  ).length;
  const offline = all - online;

  return [
    { key: "all", label: "全部", count: all },
    { key: "online", label: "在线", count: online },
    { key: "offline", label: "离线", count: offline },
  ];
});

const filteredTokens = computed(() => {
  const keyword = tokenSearchKeyword.value.trim().toLowerCase();

  return tokenStore.gameTokens.filter((token) => {
    const status = getTokenStatusValue(token.id);
    const matchesFilter =
      activeTokenFilter.value === "all" ||
      (activeTokenFilter.value === "online" && status === "connected") ||
      (activeTokenFilter.value === "offline" && status !== "connected");

    const haystack = [token.name, token.server, token.remark]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesKeyword = !keyword || haystack.includes(keyword);
    return matchesFilter && matchesKeyword;
  });
});

const handleSelectToken = (tokenId) => {
  const token = tokenStore.selectToken(tokenId);
  if (token) {
    isAccountSwitcherOpen.value = false;
    message.success(`已切换到 ${token.name}`);
  }
};

const goToTokenManager = () => {
  isAccountSwitcherOpen.value = false;
  isMobileMenuOpen.value = false;
  router.push("/tokens");
};

const refreshSelectedToken = () => {
  if (!selectedTokenId.value) {
    message.warning("请先选择一个Token");
    return;
  }
  tokenStore.selectToken(selectedTokenId.value, true);
  message.success("正在重新连接当前账号");
};

watch(isAccountSwitcherOpen, (show) => {
  if (!show) {
    tokenSearchKeyword.value = "";
    activeTokenFilter.value = "all";
  }
});

// 方法
const handleUserAction = async (key) => {
  switch (key) {
    case "logout":
      dialog.warning({
        title: "清除所有Token",
        content: "确定要清除所有Token并返回管理页吗？",
        positiveText: "确定",
        negativeText: "取消",
        onPositiveClick: async () => {
          await tokenStore.clearAllTokens();
          message.success("已清除所有Token");
          router.push("/tokens");
        },
      });
      break;
  }
};
</script>

<style scoped lang="scss">
// 导航栏
.dashboard-nav {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  padding: 0 var(--spacing-lg);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.nav-container {
  display: flex;
  align-items: center;
  height: 64px;
  max-width: 1400px;
  margin: 0 auto;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-right: var(--spacing-xl);
}

.brand-logo {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-small);
}

.brand-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.brand-toggle {
  display: none;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  font-size: var(--font-size-lg);
}

.brand-toggle .n-icon {
  font-size: inherit;
}

.nav-menu {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-medium);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.active {
    background: var(--primary-color-light);
    color: var(--primary-color);
  }
}

.nav-user {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.account-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 248px;
  max-width: 280px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  background: linear-gradient(180deg, var(--bg-primary), var(--bg-secondary));
  box-shadow: var(--shadow-medium);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    transform: translateY(-1px);
    border-color: var(--border-medium);
    box-shadow: var(--shadow-heavy);
  }
}

.account-switcher.is-open {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.12);
}

.account-switcher__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.account-switcher__count {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: linear-gradient(135deg, #30d158, #12b981);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 6px 14px rgba(18, 185, 129, 0.26);
}

.account-switcher__summary {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.account-switcher__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-switcher__meta {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-switcher__caret {
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
}

.account-switcher.is-open .account-switcher__caret {
  transform: rotate(180deg);
}

.account-switcher-panel {
  width: 320px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--border-light);
  background: linear-gradient(180deg, var(--bg-primary), var(--bg-secondary));
  color: var(--text-primary);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.16);
}

.account-switcher-panel__search :deep(.n-input) {
  --n-color: var(--bg-secondary);
  --n-color-focus: var(--bg-primary);
  --n-text-color: var(--text-primary);
  --n-placeholder-color: var(--text-tertiary);
  --n-border: 1px solid var(--border-light);
  --n-border-hover: 1px solid var(--border-medium);
  --n-border-focus: 1px solid var(--primary-color);
  --n-box-shadow-focus: 0 0 0 2px rgba(102, 126, 234, 0.14);
  border-radius: 12px;
}

.account-switcher-panel__filters {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.account-switcher-panel__filter {
  border: 1px solid transparent;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.account-switcher-panel__filter.active {
  border-color: rgba(102, 126, 234, 0.22);
  background: var(--primary-color-light);
  color: var(--primary-color);
}

.account-switcher-panel__list {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding-right: 2px;
}

.account-switcher-panel__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: 14px;
  background: var(--bg-primary);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.account-switcher-panel__item:hover {
  transform: translateX(2px);
  border-color: rgba(102, 126, 234, 0.24);
  background: var(--bg-secondary);
}

.account-switcher-panel__item.active {
  border-color: rgba(102, 126, 234, 0.35);
  background: linear-gradient(135deg, var(--primary-color-light), var(--bg-primary));
}

.account-switcher-panel__item-avatar {
  position: relative;
  flex-shrink: 0;
}

.account-switcher-panel__status-dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 10px;
  height: 10px;
  border: 2px solid var(--bg-primary);
  border-radius: 50%;
  background: #6b7280;
}

.account-switcher-panel__status-dot.is-online {
  background: #30d158;
}

.account-switcher-panel__status-dot.is-connecting {
  background: #f59e0b;
}

.account-switcher-panel__status-dot.is-error {
  background: #ef4444;
}

.account-switcher-panel__status-dot.is-offline {
  background: #94a3b8;
}

.account-switcher-panel__item-body {
  min-width: 0;
  flex: 1;
}

.account-switcher-panel__item-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.account-switcher-panel__item-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-switcher-panel__item-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  font-size: 16px;
}

.account-switcher-panel__item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.account-switcher-panel__item-server,
.account-switcher-panel__item-level,
.account-switcher-panel__item-connection {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bg-tertiary);
}

.account-switcher-panel__empty {
  margin-top: 12px;
  padding: 24px 12px;
  border-radius: 14px;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  text-align: center;
  font-size: 13px;
}

.account-switcher-panel__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.account-switcher-panel__footer-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.account-switcher-panel__footer-action:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: rgba(102, 126, 234, 0.24);
}

.account-switcher-panel__footer-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.account-switcher-panel__footer-action:first-child {
  flex: 1;
}

.account-switcher-panel__footer-action.icon-only {
  width: 40px;
  flex-shrink: 0;
}

.user-settings-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.user-settings-button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: rgba(94, 114, 228, 0.2);
}

@media (max-width: 768px) {
  .nav-item span {
    display: none;
  }

  .nav-menu {
    display: none;
  }

  .nav-item {
    padding: var(--spacing-sm);
    flex: 0 0 auto;
  }

  .nav-container {
    height: 56px;
  }

  .brand-logo {
    display: none;
  }

  .brand-toggle {
    display: inline-flex;
  }

  .nav-user {
    gap: var(--spacing-sm);
  }

  .account-switcher {
    min-width: 48px;
    padding: 6px;
    justify-content: center;
  }

  .account-switcher__summary {
    display: none;
  }
  .account-switcher-panel {
    width: min(320px, calc(100vw - 24px));
  }

  .user-settings-button {
    display: none;
  }
}

.drawer-menu {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-medium);
  color: var(--text-secondary);
  text-decoration: none;
}

.drawer-item.router-link-active {
  background: var(--primary-color-light);
  color: var(--primary-color);
}

/* 禁用样式：灰化、鼠标禁止、无hover效果 */
.nav-item.disabled {
  background: #cccccc;
  color: #999999;
  cursor: not-allowed; /* 鼠标样式：禁止 */
  pointer-events: none; /* 可选：直接禁用所有鼠标事件（比阻止click更彻底） */
}
</style>
