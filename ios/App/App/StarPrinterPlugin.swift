import Capacitor
import StarIO10

@objc(StarPrinterPlugin)
public class StarPrinterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StarPrinterPlugin"
    public let jsName = "StarPrinter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "discoverPrinters", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printReceipt",     returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printLabel",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openDrawer",       returnType: CAPPluginReturnPromise),
    ]

    private var discoveryManager: StarDeviceDiscoveryManager?
    private var discovered: [StarPrinter] = []

    // ── Discover printers on LAN ───────────────────────────────────────────
    @objc func discoverPrinters(_ call: CAPPluginCall) {
        discovered = []
        do {
            try discoveryManager?.stopDiscovery()
        } catch {}
        discoveryManager = nil

        do {
            let mgr = try StarDeviceDiscoveryManagerFactory.create(interfaceTypes: [.lan])
            self.discoveryManager = mgr
            mgr.discoveryTime = 3000  // 3 seconds

            var found: [[String: String]] = []

            mgr.delegate = DiscoveryDelegate(
                onFound: { printer in
                    found.append([
                        "identifier": printer.connectionSettings.identifier,
                        "model": printer.information?.model.rawValue ?? "Unknown"
                    ])
                },
                onFinished: {
                    call.resolve(["printers": found])
                }
            )

            try mgr.startDiscovery()
        } catch {
            call.reject("Discovery failed: \(error)")
        }
    }

    // ── Print receipt (thermal) ────────────────────────────────────────────
    @objc func printReceipt(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier") else {
            call.reject("Missing printer identifier")
            return
        }
        let receiptData = call.getObject("receipt") ?? [:]
        let copies = call.getInt("copies") ?? 1

        let settings = StarConnectionSettings(interfaceType: .lan, identifier: identifier)
        let printer  = StarPrinter(settings)
        let command  = buildReceiptCommand(receiptData)

        Task {
            do {
                for _ in 0..<copies {
                    try await printer.open()
                    try await printer.print(command: command)
                    await printer.close()
                }
                call.resolve(["success": true])
            } catch {
                await printer.close()
                call.reject("Print failed: \(error)")
            }
        }
    }

    // ── Print label (impact SP742) ─────────────────────────────────────────
    @objc func printLabel(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier") else {
            call.reject("Missing printer identifier")
            return
        }
        let labelData = call.getObject("label") ?? [:]

        let settings = StarConnectionSettings(interfaceType: .lan, identifier: identifier)
        let printer  = StarPrinter(settings)
        let command  = buildLabelCommand(labelData)

        Task {
            do {
                try await printer.open()
                try await printer.print(command: command)
                await printer.close()
                call.resolve(["success": true])
            } catch {
                await printer.close()
                call.reject("Label print failed: \(error)")
            }
        }
    }

    // ── Open cash drawer ──────────────────────────────────────────────────
    @objc func openDrawer(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier") else {
            call.reject("Missing printer identifier")
            return
        }

        let settings = StarConnectionSettings(interfaceType: .lan, identifier: identifier)
        let printer  = StarPrinter(settings)

        let builder = StarXpandCommand.StarXpandCommandBuilder()
        builder.addDocument(
            StarXpandCommand.DocumentBuilder()
                .addDrawer(StarXpandCommand.DrawerBuilder()
                    .actionOpen(StarXpandCommand.Drawer.OpenParameter())
                )
        )

        Task {
            do {
                try await printer.open()
                try await printer.print(command: builder.getCommands())
                await printer.close()
                call.resolve(["success": true])
            } catch {
                await printer.close()
                call.reject("Drawer open failed: \(error)")
            }
        }
    }

    // ── Receipt builder ───────────────────────────────────────────────────
    private func buildReceiptCommand(_ d: [String: Any]) -> String {
        let builder  = StarXpandCommand.StarXpandCommandBuilder()
        let doc      = StarXpandCommand.DocumentBuilder()
        let printer  = StarXpandCommand.PrinterBuilder()

        func str(_ key: String) -> String { d[key] as? String ?? "" }
        func dbl(_ key: String) -> Double { d[key] as? Double ?? 0 }
        func items() -> [[String: Any]] { d["items"] as? [[String: Any]] ?? [] }

        let fmt: (Double) -> String = { String(format: "$%.2f", $0) }

        // Header
        printer
            .styleAlignment(.center)
            .styleBold(true)
            .styleMagnification(StarXpandCommand.MagnificationParameter(width: 2, height: 2))
            .actionPrintText("\(str("businessName"))\n")
            .styleBold(false)
            .styleMagnification(StarXpandCommand.MagnificationParameter(width: 1, height: 1))

        printer.styleAlignment(.left)
            .styleBold(true)
            .actionPrintText("\(str("businessName")) - \(str("locationName"))\n")
            .styleBold(false)

        if !str("locationAddress").isEmpty { printer.actionPrintText("\(str("locationAddress"))\n") }
        if !str("locationPhone").isEmpty   { printer.actionPrintText("Phone: \(str("locationPhone"))\n") }
        if !str("abn").isEmpty             { printer.actionPrintText("ABN: \(str("abn"))\n") }

        printer.actionPrintText("----------------------------------------\n")
        printer.actionPrintText("Ordered: \(str("orderDate"))\n\(str("orderTime"))\nServed by: \(str("servedBy"))\n")
        printer.actionPrintText("----------------------------------------\n")

        // Order number
        printer.styleMagnification(StarXpandCommand.MagnificationParameter(width: 2, height: 2))
            .actionPrintText("Order # \(str("orderNumber"))\n")
            .styleMagnification(StarXpandCommand.MagnificationParameter(width: 1, height: 1))
            .actionPrintText("\(str("customerName"))\n")
        if !str("customerPhone").isEmpty { printer.actionPrintText("\(str("customerPhone"))\n") }

        printer.actionPrintText("----------------------------------------\n")

        // Pickup
        printer.styleMagnification(StarXpandCommand.MagnificationParameter(width: 2, height: 2))
            .actionPrintText("Pick up: \(str("pickupDay"))\n")
            .actionPrintText("\(str("pickupDateFull"))\n")
            .actionPrintText("Pick up time: \(str("pickupTime").isEmpty ? "after 4PM" : str("pickupTime"))\n")
            .styleMagnification(StarXpandCommand.MagnificationParameter(width: 1, height: 1))

        printer.actionPrintText("----------------------------------------\n")

        // Items grouped by category
        var groups: [String: [[String: Any]]] = [:]
        for item in items() {
            let cat = item["category"] as? String ?? "Other"
            groups[cat, default: []].append(item)
        }
        var totalItems = 0
        for (cat, catItems) in groups {
            printer.styleBold(true).actionPrintText("\(cat.uppercased())\n").styleBold(false)
            for item in catItems {
                let name  = item["name"]  as? String ?? ""
                let qty   = item["qty"]   as? Int    ?? 1
                let price = item["unitPrice"] as? Double ?? 0
                let note  = item["note"]  as? String ?? ""
                let priceStr = fmt(price * Double(qty))
                let qtyStr   = qty > 1 ? " x\(qty)" : ""
                let left     = "  \(name)\(qtyStr)"
                let spaces   = max(1, 40 - left.count - priceStr.count)
                printer.actionPrintText("\(left)\(String(repeating: " ", count: spaces))\(priceStr)\n")
                if !note.isEmpty { printer.actionPrintText("  (\(note))\n") }
                totalItems += qty
            }
        }

        if !str("orderNote").isEmpty {
            printer.actionPrintText("----------------------------------------\n")
            printer.actionPrintText("Note: \(str("orderNote"))\n")
        }

        printer.actionPrintText("----------------------------------------\n")

        // Totals
        let subtotal  = dbl("subtotal")
        let total     = dbl("total")
        let paid      = dbl("paidAmount")
        let stillDue  = dbl("stillDue")
        let discount  = dbl("discount")

        printer.actionPrintText("Subtotal\(String(repeating: " ", count: 32 - 8 - fmt(subtotal).count))\(fmt(subtotal))\n")
        if discount > 0 {
            let dStr = "-\(fmt(discount))"
            printer.actionPrintText("Discount\(String(repeating: " ", count: 32 - 8 - dStr.count))\(dStr)\n")
        }
        printer.styleBold(true)
        let totalLine = "Total (incl 10% GST)"
        let totalStr  = fmt(total)
        printer.actionPrintText("\(totalLine)\(String(repeating: " ", count: 40 - totalLine.count - totalStr.count))\(totalStr)\n")
        printer.styleBold(false)

        if stillDue > 0 {
            printer.actionPrintText("Paid\(String(repeating: " ", count: 36 - fmt(paid).count))\(fmt(paid))\n")
            printer.actionPrintText("Still Due\(String(repeating: " ", count: 31 - fmt(stillDue).count))\(fmt(stillDue))\n")
        }

        // Item count
        printer
            .styleBold(true).styleInvert(true)
            .actionPrintText(" \(totalItems) ")
            .styleInvert(false).styleBold(false)
            .actionPrintText(" item\(totalItems != 1 ? "s" : "")\n")

        printer.actionPrintText("----------------------------------------\n")

        // Payment status
        printer.styleAlignment(.center)
        if stillDue > 0 {
            printer.styleMagnification(StarXpandCommand.MagnificationParameter(width: 2, height: 2))
                .styleBold(true).actionPrintText("PARTIAL\n").styleBold(false)
                .styleMagnification(StarXpandCommand.MagnificationParameter(width: 1, height: 1))
                .actionPrintText("Due: \(fmt(stillDue))\n")
        } else if paid == 0 {
            printer.styleMagnification(StarXpandCommand.MagnificationParameter(width: 2, height: 2))
                .styleInvert(true).styleBold(true).actionPrintText("NOT PAID")
                .styleInvert(false).styleBold(false)
                .styleMagnification(StarXpandCommand.MagnificationParameter(width: 1, height: 1))
                .actionPrintText("\n")
        } else {
            printer.styleMagnification(StarXpandCommand.MagnificationParameter(width: 4, height: 4))
                .styleBold(true).actionPrintText("PAID\n").styleBold(false)
                .styleMagnification(StarXpandCommand.MagnificationParameter(width: 1, height: 1))
        }

        printer.styleAlignment(.left)
            .actionPrintText("Payment method: \(str("paymentMethod"))\n")
            .styleAlignment(.center)
            .actionPrintText("Thank you!\n")

        // QR code
        if !str("barcode").isEmpty {
            printer.actionPrintQRCode(
                StarXpandCommand.Printer.QRCodeParameter(content: str("barcode")).setCellSize(8)
            )
        }

        printer.actionCut(StarXpandCommand.Printer.CutType.partial)
        doc.addPrinter(printer)
        builder.addDocument(doc)
        return builder.getCommands()
    }

    // ── Label builder (SP742) ─────────────────────────────────────────────
    private func buildLabelCommand(_ d: [String: Any]) -> String {
        let builder = StarXpandCommand.StarXpandCommandBuilder()
        let doc     = StarXpandCommand.DocumentBuilder()
        let printer = StarXpandCommand.PrinterBuilder()

        func str(_ key: String) -> String { d[key] as? String ?? "" }
        func items() -> [[String: Any]] { d["items"] as? [[String: Any]] ?? [] }

        printer.styleAlignment(.center)
            .styleMagnification(StarXpandCommand.MagnificationParameter(width: 2, height: 2))
            .actionPrintText("ORDER # \(str("orderNumber"))\n")
            .styleMagnification(StarXpandCommand.MagnificationParameter(width: 1, height: 1))
            .styleAlignment(.left)
            .actionPrintText("----------------------------------------\n")
            .actionPrintText("\(str("customerName"))\n")

        if !str("customerPhone").isEmpty { printer.actionPrintText("\(str("customerPhone"))\n") }

        printer.actionPrintText("----------------------------------------\n")
            .styleMagnification(StarXpandCommand.MagnificationParameter(width: 2, height: 2))
            .actionPrintText("Pick up: \(str("pickupDay"))\n\(str("pickupDateFull"))\n")
            .styleMagnification(StarXpandCommand.MagnificationParameter(width: 1, height: 1))
            .actionPrintText("----------------------------------------\n")

        var groups: [String: [[String: Any]]] = [:]
        for item in items() {
            let cat = item["category"] as? String ?? "Other"
            groups[cat, default: []].append(item)
        }
        for (cat, catItems) in groups {
            printer.styleBold(true).actionPrintText("\(cat.uppercased())\n").styleBold(false)
            for item in catItems {
                let name = item["name"] as? String ?? ""
                let qty  = item["qty"]  as? Int    ?? 1
                let note = item["note"] as? String ?? ""
                printer.actionPrintText("  \(name)\(qty > 1 ? " x\(qty)" : "")\n")
                if !note.isEmpty { printer.actionPrintText("  (\(note))\n") }
            }
        }

        if !str("orderNote").isEmpty {
            printer.actionPrintText("----------------------------------------\n")
                .actionPrintText("Note: \(str("orderNote"))\n")
        }

        printer.actionPrintText("----------------------------------------\n")
            .styleAlignment(.center)
            .actionPrintText("CUSTOMER COPY\n")
            .actionFeedLine(3)
            .actionCut(StarXpandCommand.Printer.CutType.partial)

        doc.addPrinter(printer)
        builder.addDocument(doc)
        return builder.getCommands()
    }
}

// ── Discovery delegate helper ─────────────────────────────────────────────
private class DiscoveryDelegate: NSObject, StarDeviceDiscoveryManagerDelegate {
    private let onFound:    (StarPrinter) -> Void
    private let onFinished: () -> Void

    init(onFound: @escaping (StarPrinter) -> Void, onFinished: @escaping () -> Void) {
        self.onFound    = onFound
        self.onFinished = onFinished
    }

    func manager(_ manager: StarDeviceDiscoveryManager, didFind printer: StarPrinter) {
        onFound(printer)
    }

    func managerDidFinishDiscovery(_ manager: StarDeviceDiscoveryManager) {
        onFinished()
    }
}
