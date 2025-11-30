/**
 * Scroll Debug Utility
 * 
 * Helps diagnose scroll jitter issues by logging:
 * - Re-render counts per component
 * - Layout changes (height/width shifts)
 * - Scroll position and velocity
 * - State updates during scroll
 * 
 * Usage: Import and call functions in components experiencing jitter
 * Only active in __DEV__ mode
 */

// Track render counts per component
const renderCounts: Record<string, number> = {};

// Track layout changes
const layoutHistory: Record<string, { height: number; width: number; timestamp: number }[]> = {};

// Track scroll events
let lastScrollY = 0;
let lastScrollTime = 0;
let scrollVelocities: number[] = [];

/**
 * Log component render - call at start of component
 */
export const logRender = (componentName: string, itemId?: string) => {
  if (!__DEV__) return;
  
  const key = itemId ? `${componentName}:${itemId}` : componentName;
  renderCounts[key] = (renderCounts[key] || 0) + 1;
  
  // Only log every 10th render to reduce noise
  if (renderCounts[key] % 10 === 0) {
    console.log(`[Render] ${key} rendered ${renderCounts[key]} times`);
  }
};

/**
 * Log layout change - call in onLayout handler
 */
export const logLayout = (
  componentName: string,
  itemId: string,
  height: number,
  width: number,
  expectedHeight?: number
) => {
  if (!__DEV__) return;
  
  const key = `${componentName}:${itemId}`;
  const now = Date.now();
  
  if (!layoutHistory[key]) {
    layoutHistory[key] = [];
  }
  
  const history = layoutHistory[key];
  const lastLayout = history[history.length - 1];
  
  // Check if layout actually changed
  if (lastLayout && lastLayout.height === height && lastLayout.width === width) {
    return; // No change, don't log
  }
  
  history.push({ height, width, timestamp: now });
  
  // Keep only last 5 entries
  if (history.length > 5) {
    history.shift();
  }
  
  // Log if height changed significantly (>1px)
  if (lastLayout && Math.abs(lastLayout.height - height) > 1) {
    console.warn(
      `[Layout Shift] ${key}: height ${lastLayout.height.toFixed(0)} → ${height.toFixed(0)} (Δ${(height - lastLayout.height).toFixed(0)}px)` +
      (expectedHeight ? ` expected=${expectedHeight.toFixed(0)}` : '')
    );
  } else if (!lastLayout) {
    // First layout
    console.log(
      `[Layout Init] ${key}: ${width.toFixed(0)}x${height.toFixed(0)}` +
      (expectedHeight ? ` expected=${expectedHeight.toFixed(0)} diff=${(height - expectedHeight).toFixed(0)}` : '')
    );
  }
};

/**
 * Log scroll event - call in onScroll handler
 */
export const logScroll = (scrollY: number, listName: string = 'list') => {
  if (!__DEV__) return;
  
  const now = Date.now();
  const timeDelta = now - lastScrollTime;
  
  if (timeDelta > 0 && lastScrollTime > 0) {
    const distance = Math.abs(scrollY - lastScrollY);
    const velocity = distance / timeDelta * 1000; // px/sec
    
    scrollVelocities.push(velocity);
    if (scrollVelocities.length > 10) {
      scrollVelocities.shift();
    }
    
    // Log if velocity is unusual (very fast or very slow with movement)
    if (velocity > 3000) {
      console.log(`[Scroll] ${listName}: velocity=${velocity.toFixed(0)}px/s (FAST)`);
    }
  }
  
  lastScrollY = scrollY;
  lastScrollTime = now;
};

/**
 * Log state update during scroll - helps identify re-renders during scroll
 */
export const logStateUpdate = (stateName: string, isScrolling: boolean) => {
  if (!__DEV__) return;
  
  if (isScrolling) {
    console.warn(`[State During Scroll] ${stateName} updated while scrolling - may cause jitter`);
  }
};

/**
 * Get summary of render counts
 */
export const getRenderSummary = (): Record<string, number> => {
  return { ...renderCounts };
};

/**
 * Reset all tracking data
 */
export const resetDebugData = () => {
  Object.keys(renderCounts).forEach(key => delete renderCounts[key]);
  Object.keys(layoutHistory).forEach(key => delete layoutHistory[key]);
  scrollVelocities = [];
  lastScrollY = 0;
  lastScrollTime = 0;
};

/**
 * Check if expo-image is causing layout shifts by logging image load events
 */
export const logImageLoad = (
  imageUri: string,
  componentName: string,
  loadTime: number
) => {
  if (!__DEV__) return;
  
  if (loadTime > 100) {
    console.log(`[Image Load] ${componentName}: ${loadTime}ms for ${imageUri.slice(-30)}`);
  }
};

/**
 * Log FlashList recycling events
 */
export const logRecycle = (itemId: string, fromIndex: number, toIndex: number) => {
  if (!__DEV__) return;
  
  console.log(`[Recycle] Item ${itemId}: index ${fromIndex} → ${toIndex}`);
};

