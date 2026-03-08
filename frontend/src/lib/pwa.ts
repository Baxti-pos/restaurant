import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface PwaInstallState {
  canInstall: boolean;
  isStandalone: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInitialized = false;
const listeners = new Set<(state: PwaInstallState) => void>();

const getStandaloneState = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
};

const getCurrentState = (): PwaInstallState => ({
  canInstall: Boolean(deferredPrompt),
  isStandalone: getStandaloneState(),
});

const notify = () => {
  const state = getCurrentState();
  listeners.forEach((listener) => listener(state));
};

const bindDisplayModeListener = () => {
  if (typeof window === "undefined") {
    return;
  }

  const media = window.matchMedia("(display-mode: standalone)");
  const handler = () => notify();

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", handler);
    return;
  }

  if (typeof media.addListener === "function") {
    media.addListener(handler);
  }
};

export const initPwa = () => {
  if (typeof window === "undefined" || isInitialized) {
    return;
  }

  isInitialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });

  bindDisplayModeListener();
  notify();
};

export const registerServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in window.navigator)) {
    return;
  }

  try {
    await window.navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
  } catch (error) {
    console.error("Service worker registratsiyasi bajarilmadi:", error);
  }
};

export const promptPwaInstall = async () => {
  if (!deferredPrompt) {
    return false;
  }

  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;

  if (choice.outcome === "accepted") {
    deferredPrompt = null;
    notify();
    return true;
  }

  return false;
};

export const subscribePwaInstallState = (
  listener: (state: PwaInstallState) => void,
) => {
  listeners.add(listener);
  listener(getCurrentState());

  return () => {
    listeners.delete(listener);
  };
};

export const usePwaInstall = () => {
  const [state, setState] = useState<PwaInstallState>(() => getCurrentState());

  useEffect(() => {
    initPwa();
    return subscribePwaInstallState(setState);
  }, []);

  return {
    ...state,
    install: promptPwaInstall,
  };
};
