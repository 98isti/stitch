/**
 * StarPrinter Capacitor Plugin
 * JavaScript bridge to StarPrinterPlugin.swift
 * Falls back gracefully when not running in a native iOS app.
 */

import { registerPlugin } from '@capacitor/core'

export interface StarPrinterPlugin {
  discoverPrinters(): Promise<{ printers: { identifier: string; model: string }[] }>
  printReceipt(options: { identifier: string; receipt: Record<string, unknown>; copies?: number }): Promise<{ success: boolean }>
  printLabel(options: { identifier: string; label: Record<string, unknown> }): Promise<{ success: boolean }>
  printLabelsForOrder(options: {
    orderNumber: string
    customerName: string
    pickupDate: string
    itemsJson: string
    shopType: string
    impactIdentifier: string
    thermalIdentifier: string
  }): Promise<{ success: boolean }>
  printPickupSheet(options: {
    identifier: string
    businessName: string
    locationName: string
    date: string
    ordersJson: string
    footer?: string
  }): Promise<{ success: boolean }>
  openDrawer(options: { identifier: string }): Promise<{ success: boolean }>
}

export const StarPrinter = registerPlugin<StarPrinterPlugin>('StarPrinterPlugin')

/** Returns true when running inside the native Capacitor iOS app */
export function isNativeApp(): boolean {
  const cap = (window as any).Capacitor
  if (!cap) return false
  // Capacitor v5+ uses isNativePlatform(), v3 used isNative
  return !!(cap.isNativePlatform?.() ?? cap.isNative)
}
