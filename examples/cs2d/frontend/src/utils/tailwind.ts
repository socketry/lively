// Minimal local implementations to avoid external deps in E2E
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | Record<string, boolean>
  | ClassValue[]

function toClassNames(value: ClassValue): string[] {
  if (!value) return []
  if (typeof value === 'string' || typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(toClassNames)
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
  }
  return []
}

/**
 * Merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  // Simple merge without Tailwind conflict resolution
  return toClassNames(inputs).join(' ')
}

/**
 * Game-specific utility classes
 */
export const gameClasses = {
  // Status classes
  online: 'bg-cs-success animate-pulse',
  offline: 'bg-cs-gray',
  connecting: 'bg-cs-warning animate-ping',
  error: 'bg-cs-danger',
  
  // Team classes
  terrorist: 'text-team-t border-team-t',
  counterTerrorist: 'text-team-ct border-team-ct',
  spectator: 'text-team-spectator border-team-spectator',
  
  // Weapon rarity
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400 animate-pulse',
  
  // Health states
  healthy: 'text-cs-success',
  damaged: 'text-cs-warning',
  critical: 'text-cs-danger animate-pulse',
  dead: 'text-cs-gray line-through'
};

/**
 * Generate dynamic health color
 */
export function getHealthColor(health: number): string {
  if (health > 75) return 'text-cs-success';
  if (health > 50) return 'text-yellow-500';
  if (health > 25) return 'text-cs-warning';
  if (health > 0) return 'text-cs-danger animate-pulse';
  return 'text-cs-gray';
}

/**
 * Generate dynamic team styles
 */
export function getTeamStyles(team: 'terrorist' | 'counter_terrorist' | 'spectator'): string {
  const styles = {
    terrorist: 'bg-team-t/10 border-team-t text-team-t',
    counter_terrorist: 'bg-team-ct/10 border-team-ct text-team-ct',
    spectator: 'bg-team-spectator/10 border-team-spectator text-team-spectator'
  };
  return styles[team] || styles.spectator;
}
