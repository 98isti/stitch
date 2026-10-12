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
  openDrawer(options: { identifier: string }): Promise<{ success: boolean }>
}

export const StarPrinter = registerPlugin<StarPrinterPlugin>('StarPrinterPlugin')

/** Returns true when running inside the native Capacitor iOS app */
export function isNativeApp(): boolean {
  return !!(window as any).Capacitor?.isNative
}
