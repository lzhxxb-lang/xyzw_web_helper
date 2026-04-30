<template>
  <nav
    ref="navRef"
    class="mobile-bottom-nav"
    :class="{
      'mobile-bottom-nav--has-active': hasActiveTab,
      'mobile-bottom-nav--indicator-ready': indicatorReady,
    }"
    :style="indicatorStyle"
    aria-label="移动端快捷导航"
  >
    <span class="mobile-bottom-nav__active-bg" aria-hidden="true" />
    <router-link
      v-for="(tab, index) in tabs"
      :key="tab.to"
      :ref="(el) => setItemRef(el, index)"
      :to="tab.to"
      class="mobile-bottom-nav__item"
      :class="{ active: isTabActive(tab.to) }"
      active-class="active"
    >
      <span class="mobile-bottom-nav__icon-shell">
        <n-icon :component="tab.icon" />
      </span>
      <span class="mobile-bottom-nav__label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import {
  computed,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import { Cube, Home, Layers, PersonCircle } from "@vicons/ionicons5";

const route = useRoute();

const tabs = [
  {
    to: "/admin/dashboard",
    label: "首页",
    icon: markRaw(Home),
  },
  {
    to: "/admin/game-features",
    label: "功能",
    icon: markRaw(Cube),
  },
  {
    to: "/admin/tokens",
    label: "账号",
    icon: markRaw(PersonCircle),
  },
  {
    to: "/admin/batch-daily-tasks",
    label: "批量",
    icon: markRaw(Layers),
  },
];

const navRef = ref(null);
const itemRefs = ref([]);
const indicatorReady = ref(false);
const indicatorStyle = ref({
  "--indicator-x": "0px",
  "--indicator-y": "0px",
  "--indicator-size": "36px",
});

let resizeObserver;

const isTabActive = (path) =>
  route.path === path || route.path.startsWith(`${path}/`);

const activeIndex = computed(() => tabs.findIndex((tab) => isTabActive(tab.to)));
const hasActiveTab = computed(() => activeIndex.value >= 0);

const setItemRef = (el, index) => {
  if (!el) return;
  itemRefs.value[index] = el.$el ?? el;
};

const updateIndicator = async () => {
  await nextTick();

  if (!hasActiveTab.value || !navRef.value) {
    indicatorReady.value = false;
    return;
  }

  const itemEl = itemRefs.value[activeIndex.value];
  const iconEl = itemEl?.querySelector?.(".mobile-bottom-nav__icon-shell");

  if (!iconEl) {
    indicatorReady.value = false;
    return;
  }

  const navRect = navRef.value.getBoundingClientRect();
  const iconRect = iconEl.getBoundingClientRect();

  indicatorStyle.value = {
    "--indicator-x": `${iconRect.left - navRect.left}px`,
    "--indicator-y": `${iconRect.top - navRect.top}px`,
    "--indicator-size": `${iconRect.width}px`,
  };
  indicatorReady.value = true;
};

watch(
  () => route.path,
  () => {
    updateIndicator();
  },
  { flush: "post" },
);

onMounted(() => {
  updateIndicator();
  window.addEventListener("resize", updateIndicator, { passive: true });

  if (window.ResizeObserver && navRef.value) {
    resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(navRef.value);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateIndicator);
  resizeObserver?.disconnect();
});
</script>

<style scoped lang="scss">
.mobile-bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .mobile-bottom-nav {
    --nav-icon-size: 36px;

    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: var(--z-fixed);
    display: grid;
    width: 100%;
    max-width: 100vw;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm)
      calc(var(--spacing-xs) + env(safe-area-inset-bottom));
    border-top: 1px solid var(--border-light);
    background: var(--bg-primary);
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    contain: layout paint;
    transform: translateZ(0);
  }

  .mobile-bottom-nav__active-bg {
    position: absolute;
    top: -2px;
    left: 0;
    z-index: 0;
    width: var(--indicator-size);
    height: var(--indicator-size);
    border-radius: var(--border-radius-medium);
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    box-shadow: 0 8px 18px rgba(102, 126, 234, 0.28);
    opacity: 0;
    pointer-events: none;
    transform: translate3d(var(--indicator-x), var(--indicator-y), 0)
      scale(0.92);
    transition:
      transform 0.36s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.2s ease,
      width 0.24s ease,
      height 0.24s ease;
    will-change: transform;
  }

  .mobile-bottom-nav--indicator-ready .mobile-bottom-nav__active-bg {
    opacity: 1;
    transform: translate3d(var(--indicator-x), var(--indicator-y), 0) scale(1);
  }

  .mobile-bottom-nav__item {
    position: relative;
    z-index: 1;
    display: flex;
    min-width: 0;
    min-height: 56px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 2px;
    border-radius: var(--border-radius-medium);
    color: var(--text-secondary) !important;
    text-decoration: none;
    transition:
      color var(--transition-fast),
      transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);

    &:hover {
      color: var(--primary-color) !important;
    }

    &:active {
      transform: translateY(1px);
    }

    &.active,
    &.router-link-active {
      color: var(--primary-color) !important;
      background: transparent;
    }
  }

  .mobile-bottom-nav__icon-shell {
    display: flex;
    width: var(--nav-icon-size);
    height: var(--nav-icon-size);
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-medium);
    color: var(--text-tertiary);
    transition:
      color 0.24s ease,
      transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);

    .n-icon {
      font-size: 22px;
    }
  }

  .mobile-bottom-nav__label {
    max-width: 100%;
    overflow: hidden;
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-tight);
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.24s ease;
  }

  .mobile-bottom-nav__item.active,
  .mobile-bottom-nav__item.router-link-active {
    .mobile-bottom-nav__icon-shell {
      color: #ffffff;
      transform: translateY(-2px);
    }

    .mobile-bottom-nav__label {
      color: var(--primary-color);
      font-weight: var(--font-weight-semibold);
    }
  }
}
</style>
