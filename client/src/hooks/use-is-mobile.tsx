import * as React from "react"

const MOBILE_BREAKPOINT = 1024 // Increased to detect iPads and tablets 

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkIsMobile = () => {
      // Check if the device has touch capability (for tablets/mobile)
      const hasTouchScreen = 'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        (navigator as any).msMaxTouchPoints > 0;
      
      // Check for both screen size AND touch capability
      // This will handle iPads and other tablets
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;
      
      // For iPads specifically, we can check for iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
      // Consider it mobile if it's a small screen with touch OR it's iOS with touch
      return (isSmallScreen && hasTouchScreen) || (isIOS && hasTouchScreen);
    };

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(checkIsMobile());
    }
    
    mql.addEventListener("change", onChange)
    setIsMobile(checkIsMobile());
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
