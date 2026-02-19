export const BETA_MODE = typeof window !== 'undefined'
  && localStorage.getItem('globalpulse-beta-mode') === 'true';
