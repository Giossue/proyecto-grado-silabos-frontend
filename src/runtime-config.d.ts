export {};

declare global {
  interface Window {
    __SILABOS_CONFIG__?: { apiUrl?: string };
  }
}
