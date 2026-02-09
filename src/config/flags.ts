export interface FeatureFlags {
  USE_EDGE_FUNCTIONS: boolean;
  STRICT_TYPES: boolean;
  STRICT_VALIDATION: boolean;
  NEW_DATETIME_HANDLING: boolean;
  ENABLE_RATE_LIMITING: boolean;
}

const defaultFlags: FeatureFlags = {
  USE_EDGE_FUNCTIONS: false,
  STRICT_TYPES: false,
  STRICT_VALIDATION: false,
  NEW_DATETIME_HANDLING: false,
  ENABLE_RATE_LIMITING: false,
};

class FeatureFlagsManager {
  private flags: FeatureFlags;

  constructor() {
    this.flags = this.loadFlags();
  }

  private loadFlags(): FeatureFlags {
    if (typeof window === 'undefined') {
      return defaultFlags;
    }

    try {
      const stored = localStorage.getItem('feature_flags');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultFlags, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load feature flags from storage', e);
    }

    return defaultFlags;
  }

  private saveFlags(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('feature_flags', JSON.stringify(this.flags));
    } catch (e) {
      console.warn('Failed to save feature flags to storage', e);
    }
  }

  get(flag: keyof FeatureFlags): boolean {
    return this.flags[flag] ?? false;
  }

  set(flag: keyof FeatureFlags, value: boolean): void {
    this.flags[flag] = value;
    this.saveFlags();
  }

  getAll(): FeatureFlags {
    return { ...this.flags };
  }

  reset(): void {
    this.flags = defaultFlags;
    this.saveFlags();
  }
}

export const featureFlags = new FeatureFlagsManager();

export function isEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags.get(flag);
}

export function enableFlag(flag: keyof FeatureFlags): void {
  featureFlags.set(flag, true);
}

export function disableFlag(flag: keyof FeatureFlags): void {
  featureFlags.set(flag, false);
}
