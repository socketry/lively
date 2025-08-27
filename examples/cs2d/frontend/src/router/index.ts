// Route metadata interface
export interface RouteMetadata {
  title?: string
  requiresAuth?: boolean
  fullscreen?: boolean
}

// Route configuration with metadata
export const routeConfig = {
  '/': { title: 'Lobby', requiresAuth: false },
  '/room/:id': { title: 'Room', requiresAuth: true },
  '/game/:id': { title: 'Game', requiresAuth: true, fullscreen: true },
  '/settings': { title: 'Settings', requiresAuth: false },
  '/about': { title: 'About', requiresAuth: false },
} as const

// Navigation utilities
export const updatePageTitle = (pathname: string) => {
  const route = Object.entries(routeConfig).find(([path]) => {
    // Simple path matching - could be enhanced for dynamic routes
    if (path.includes(':')) {
      const pathPattern = path.replace(/:[^/]+/g, '[^/]+')
      return new RegExp(`^${pathPattern}$`).test(pathname)
    }
    return path === pathname
  })

  const title = route?.[1].title ? `${route[1].title} - CS2D` : 'CS2D'
  document.title = title
}

export const getRouteMetadata = (pathname: string): RouteMetadata | null => {
  const route = Object.entries(routeConfig).find(([path]) => {
    if (path.includes(':')) {
      const pathPattern = path.replace(/:[^/]+/g, '[^/]+')
      return new RegExp(`^${pathPattern}$`).test(pathname)
    }
    return path === pathname
  })

  return route?.[1] || null
}

export const handleFullscreenRoute = (pathname: string) => {
  const metadata = getRouteMetadata(pathname)
  if (metadata?.fullscreen) {
    document.body.classList.add('fullscreen')
  } else {
    document.body.classList.remove('fullscreen')
  }
}

export default { routeConfig, updatePageTitle, getRouteMetadata, handleFullscreenRoute }
