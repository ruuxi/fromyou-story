export const springAnimation = {
  duration: 350,
  easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

export const smoothAnimation = {
  duration: 200,
  easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
} as const

export const quickAnimation = {
  duration: 150,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

export const createStaggerDelay = (index: number, baseDelay: number = 30) => {
  return Math.min(index * baseDelay, 1200)
}

export const animationClasses = {
  fadeIn: 'opacity-0 animate-fade-in',
  slideUp: 'translate-y-4 opacity-0 animate-slide-up',
  scaleIn: 'scale-95 opacity-0 animate-scale-in',
} as const

export const getAnimationStyle = (
  index: number, 
  animate: boolean,
  baseDelay: number = 30
): React.CSSProperties => {
  if (!animate) return {}
  
  return {
    animationDelay: `${createStaggerDelay(index, baseDelay)}ms`,
    animationFillMode: 'backwards',
  }
}