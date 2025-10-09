"use client";
import { useEffect, useState } from "react";

export function useMiniApp() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMiniApp = async () => {
      try {
        // Development için origin kontrolünü bypass et
        const isDevelopment = process.env.NODE_ENV === "development";

        if (isDevelopment) {
          setIsInMiniApp(true);
        } else {
          const { sdk } = await import("@farcaster/miniapp-sdk");
          const inMiniApp = await sdk.isInMiniApp();
          setIsInMiniApp(inMiniApp);
        }
      } catch (error) {
        const isDevelopment = process.env.NODE_ENV === "development";
        setIsInMiniApp(isDevelopment);
      } finally {
        setIsLoading(false);
      }
    };

    checkMiniApp();
  }, []);

  return { isInMiniApp, isLoading };
}
