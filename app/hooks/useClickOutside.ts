import { RefObject, useEffect } from 'react';

type Handler = (event: MouseEvent) => void;

/**
 * Hook for detecting clicks outside a referenced element
 * @param ref React ref object pointing to the element to monitor
 * @param handler Function to call when a click outside is detected
 * @param enabled Boolean to conditionally enable/disable the hook
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: Handler,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;
    
    const listener = (event: MouseEvent) => {
      // Do nothing if the ref isn't set or if clicking inside the referenced element
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      
      handler(event);
    };
    
    document.addEventListener('mousedown', listener);
    
    return () => {
      document.removeEventListener('mousedown', listener);
    };
  }, [ref, handler, enabled]);
} 