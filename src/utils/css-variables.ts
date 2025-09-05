// ===== CSS VARIABLES UTILS =====
// Generic helper functions to read CSS custom properties
// Single source of truth: CSS variables in @styles/ files

// Helper function to get CSS variable value
export const getCSSVariable = (name: string): string => {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name);
};

// Helper function to get CSS variable as number
export const getCSSVariableNumber = (name: string): number => {
  const value = getCSSVariable(name);
  return value ? parseFloat(value) : 0;
};

// Helper function to get CSS variable as percentage
export const getCSSVariablePercent = (name: string): number => {
  const value = getCSSVariable(name);
  if (!value) return 0;
  return parseFloat(value.replace('%', ''));
};

// Helper function to get CSS variable as pixel value
export const getCSSVariablePixel = (name: string): number => {
  const value = getCSSVariable(name);
  if (!value) return 0;
  return parseFloat(value.replace('px', ''));
};

// Helper function to get CSS variable as rem value
export const getCSSVariableRem = (name: string): number => {
  const value = getCSSVariable(name);
  if (!value) return 0;
  return parseFloat(value.replace('rem', ''));
}; 