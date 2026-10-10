"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { appPath } from "../url-utils";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PWAContextValue = {
  canInstall: boolean;
  install: () => Promise<void>;
  installMessage: string;
  isIOS: boolean;
  isOnline: boolean;
  isStandalone: boolean;
};

const PWAContext = createContext<PWAContextValue | null>(null);

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) throw new Error("usePWA must be used inside PWAProvider");
  return context;
}

export function PWAProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installMessage, setInstallMessage] = useState("");
  const [isIOS, setIsIOS] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const updateDeviceState = () => {
      setIsOnline(navigator.onLine);
      setIsStandalone(
        standaloneQuery.matches || navigatorWithStandalone.standalone === true,
      );
    };
    const stateTimer = window.setTimeout(() => {
      const userAgent = navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
      updateDeviceState();
    }, 0);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      setInstallMessage("この端末へのインストールが完了しました");
    };

    window.addEventListener("online", updateDeviceState);
    window.addEventListener("offline", updateDeviceState);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    standaloneQuery.addEventListener?.("change", updateDeviceState);

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    if (
      "serviceWorker" in navigator &&
      window.location.protocol === "https:"
    ) {
      navigator.serviceWorker
        .register(appPath("/sw.js"), { scope: appPath("/") })
        .then((registration) => {
          if (registration.waiting && navigator.serviceWorker.controller) {
            setUpdateWorker(registration.waiting);
          }
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setUpdateWorker(worker);
              }
            });
          });
        })
        .catch(() => {
          // The website remains usable when service-worker registration fails.
        });
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange,
      );
    }

    return () => {
      window.clearTimeout(stateTimer);
      window.removeEventListener("online", updateDeviceState);
      window.removeEventListener("offline", updateDeviceState);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      standaloneQuery.removeEventListener?.("change", updateDeviceState);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallMessage(
      choice.outcome === "accepted"
        ? "インストールを開始しました"
        : "インストールはキャンセルされました",
    );
  }, [installPrompt]);

  const contextValue = useMemo(
    () => ({
      canInstall: Boolean(installPrompt),
      install,
      installMessage,
      isIOS,
      isOnline,
      isStandalone,
    }),
    [install, installMessage, installPrompt, isIOS, isOnline, isStandalone],
  );

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      {!isOnline && (
        <div className="pwa-status-banner is-offline" role="status">
          オフラインです。記録はこの端末に保存され、引き続き編集できます。
        </div>
      )}
      {updateWorker && (
        <div className="pwa-status-banner is-update" role="status">
          <span>新しいバージョンを利用できます。</span>
          <button
            type="button"
            onClick={() => updateWorker.postMessage({ type: "SKIP_WAITING" })}
          >
            更新する
          </button>
        </div>
      )}
    </PWAContext.Provider>
  );
}
