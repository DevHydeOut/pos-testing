// hooks/useCraftConnector.ts
import { useCallback } from 'react';

// Type for Craft.js connector functions
type ConnectorFunction = (ref: HTMLElement) => HTMLElement;

export const useCraftConnector = () => {
  const createConnector = useCallback((connect: ConnectorFunction, drag: ConnectorFunction) => {
    return (ref: HTMLElement | null) => {
      if (ref) {
        connect(ref);
        drag(ref);
      }
    };
  }, []);

  return { createConnector };
};