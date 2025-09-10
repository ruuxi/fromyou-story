'use client';

import { useState, useEffect } from 'react';

type DeviceType = 'mobile' | 'desktop';

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      // Check for touch capability and screen size
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileWidth = window.innerWidth <= 768;
      
      setDeviceType(isTouchDevice || isMobileWidth ? 'mobile' : 'desktop');
    };

    // Check on mount
    checkDevice();

    // Check on resize
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceType;
}

// Helper function for conditional text
export function getDeviceText(desktop: string, mobile: string, deviceType: DeviceType): string {
  return deviceType === 'mobile' ? mobile : desktop;
}