"use client";
import { useState, useCallback } from "react";
import { MultisenderConfig } from "@/types";

const initialConfig: MultisenderConfig = {
  tokenType: "ETH",
  recipients: [],
  amountMode: "fixed",
  revertOnFail: true,
};

export function useMultisender() {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<MultisenderConfig>(initialConfig);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  }, [currentStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, 5)));
  }, []);

  const updateConfig = useCallback((newConfig: MultisenderConfig) => {
    setConfig(newConfig);
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(1);
    setConfig(initialConfig);
  }, []);

  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 1: // Token Selection
        return (
          config.tokenType === "ETH" ||
          (config.tokenType === "ERC20" &&
            config.tokenAddress &&
            config.tokenSymbol)
        );
      case 2: // Recipient List
        return config.recipients.length > 0;
      case 3: // Amount Config
        return config.recipients.every(
          (r) => r.amount && parseFloat(r.amount) > 0
        );
      case 4: // Review
        return true; // Always can proceed from review
      case 5: // Transaction
        return false; // No next step from transaction
      default:
        return false;
    }
  }, [currentStep, config]);

  const canGoPrev = useCallback(() => {
    return currentStep > 1;
  }, [currentStep]);

  return {
    currentStep,
    config,
    nextStep,
    prevStep,
    goToStep,
    updateConfig,
    reset,
    canGoNext: canGoNext(),
    canGoPrev: canGoPrev(),
  };
}
