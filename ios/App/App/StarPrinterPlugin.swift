import Capacitor
import StarIO10

@objc(StarPrinterPlugin)
public class StarPrinterPlugin: CAPPlugin, CAPBridgedPlugin, StarDeviceDiscoveryManagerDelegate {
    public let identifier = "StarPrinterPlugin"
    public let jsName = "StarPrinterPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "discoverPrinters", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printReceipt",     returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printLabel",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openDrawer",       returnType: CAPPluginReturnPromise),
    ]

    private var discoveryManager: StarDeviceDiscoveryManager?
    private var discoveredPrinters: [[String: String]] = []
    private var discoveryCall: CAPPluginCall?

    // ── Discover printers ─────────────────────────────────────────────────
    @objc func discoverPrinters(_ call: CAPPluginCall) {
        discoveredPrinters = []
        discoveryCall = call
        call.keepAlive = true

        try? discoveryManager?.stopDiscovery()
        discoveryManager = nil

        guard let mgr = try? StarDeviceDiscoveryManagerFactory.create(interfaceTypes: [.lan]) else {
            call.reject("Failed to create discovery manager")
            return
        }
        mgr.discoveryTime = 3000
        mgr.delegate = self
        discoveryManager = mgr
        try? mgr.startDiscovery()
    }

    public func manager(_ manager: StarDeviceDiscoveryManager, didFind printer: StarPrinter) {
        let identifier = printer.connectionSettings.identifier
        let model      = String(describing: printer.information?.model ?? StarPrinterModel.unknown)
        discoveredPrinters.append(["identifier": identifier, "model": model])
    }

    public func managerDidFinishDiscovery(_ manager: StarDeviceDiscoveryManager) {
        discoveryCall?.resolve(["printers": discoveredPrinters])
        discoveryCall?.keepAlive = false
        discoveryCall = nil
    }

    // ── Print receipt ─────────────────────────────────────────────────────
    @objc func printReceipt(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier") else { call.reject("Missing identifier"); return }
        let d      = call.getObject("receipt") ?? [:]
        let copies = call.getInt("copies") ?? 1
        let printer = StarPrinter(StarConnectionSettings(interfaceType: .lan, identifier: identifier))

        Task {
            do {
                try await printer.open()
                let cmd = buildReceipt(d)
                for _ in 0..<copies { try await printer.print(command: cmd) }
                await printer.close()
                call.resolve(["success": true])
            } catch {
                await printer.close()
                call.reject("Print failed: \(error)")
            }
        }
    }

    // ── Print label ───────────────────────────────────────────────────────
    @objc func printLabel(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier") else { call.reject("Missing identifier"); return }
        let d       = call.getObject("label") ?? [:]
        let printer = StarPrinter(StarConnectionSettings(interfaceType: .lan, identifier: identifier))

        Task {
            do {
                try await printer.open()
                let cmd = buildLabel(d)
                try await printer.print(command: cmd)
                await printer.close()
                call.resolve(["success": true])
            } catch {
                await printer.close()
                call.reject("Label failed: \(error)")
            }
        }
    }

    // ── Open cash drawer ──────────────────────────────────────────────────
    @objc func openDrawer(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier") else { call.reject("Missing identifier"); return }
        let printer = StarPrinter(StarConnectionSettings(interfaceType: .lan, identifier: identifier))

        Task {
            do {
                try await printer.open()
                let cmd = StarXpandCommand.StarXpandCommandBuilder()
                    .addDocument(StarXpandCommand.DocumentBuilder()
                        .addDrawer(StarXpandCommand.DrawerBuilder()
                            .actionOpen(StarXpandCommand.Drawer.OpenParameter())))
                    .getCommands()
                try await printer.print(command: cmd)
                await printer.close()
                call.resolve(["success": true])
            } catch {
                await printer.close()
                call.reject("Drawer failed: \(error)")
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private func str(_ d: [String: Any], _ key: String) -> String { d[key] as? String ?? "" }
    private func dbl(_ d: [String: Any], _ key: String) -> Double { d[key] as? Double ?? 0 }
    private func fmt(_ n: Double) -> String { String(format: "$%.2f", n) }
    private func items(_ d: [String: Any]) -> [[String: Any]] { d["items"] as? [[String: Any]] ?? [] }

    private func padRow(_ left: String, _ right: String, _ width: Int = 40) -> String {
        let space = max(1, width - left.count - right.count)
        return left + String(repeating: " ", count: space) + right
    }

    // ── Receipt builder ───────────────────────────────────────────────────
    private func buildReceipt(_ d: [String: Any]) -> String {
        let doc = StarXpandCommand.DocumentBuilder()
        let p   = StarXpandCommand.PrinterBuilder()

        // Header
        p.styleAlignment(.center)
         .styleMagnification(.init(width: 2, height: 2))
         .styleBold(true)
         .actionPrintText("\(str(d,"businessName"))\n")
         .styleBold(false)
         .styleMagnification(.init(width: 1, height: 1))
         .styleAlignment(.left)
         .styleBold(true)
         .actionPrintText("\(str(d,"businessName")) - \(str(d,"locationName"))\n")
         .styleBold(false)

        if !str(d,"locationAddress").isEmpty { p.actionPrintText("\(str(d,"locationAddress"))\n") }
        if !str(d,"locationPhone").isEmpty   { p.actionPrintText("Phone: \(str(d,"locationPhone"))\n") }
        if !str(d,"abn").isEmpty             { p.actionPrintText("ABN: \(str(d,"abn"))\n") }

        p.actionPrintText("----------------------------------------\n")
         .actionPrintText("Ordered: \(str(d,"orderDate"))\n\(str(d,"orderTime"))\nServed by: \(str(d,"servedBy"))\n")
         .actionPrintText("----------------------------------------\n")
         .styleMagnification(.init(width: 2, height: 2))
         .actionPrintText("Order # \(str(d,"orderNumber"))\n")
         .styleMagnification(.init(width: 1, height: 1))
         .actionPrintText("\(str(d,"customerName"))\n")

        if !str(d,"customerPhone").isEmpty { p.actionPrintText("\(str(d,"customerPhone"))\n") }

        p.actionPrintText("----------------------------------------\n")
         .styleMagnification(.init(width: 2, height: 2))
         .actionPrintText("Pick up: \(str(d,"pickupDay"))\n")
         .actionPrintText("\(str(d,"pickupDateFull"))\n")
         .actionPrintText("Pick up time: \(str(d,"pickupTime").isEmpty ? "after 4PM" : str(d,"pickupTime"))\n")
         .styleMagnification(.init(width: 1, height: 1))
         .actionPrintText("----------------------------------------\n")

        // Items
        var groups: [String: [[String: Any]]] = [:]
        for item in items(d) {
            let cat = item["category"] as? String ?? "Other"
            groups[cat, default: []].append(item)
        }
        var totalItems = 0
        for (cat, catItems) in groups {
            p.styleBold(true).actionPrintText("\(cat.uppercased())\n").styleBold(false)
            for item in catItems {
                let name  = item["name"]      as? String ?? ""
                let qty   = item["qty"]       as? Int    ?? 1
                let price = item["unitPrice"] as? Double ?? 0
                let note  = item["note"]      as? String ?? ""
                let priceStr = fmt(price * Double(qty))
                let label = "  \(name)\(qty > 1 ? " x\(qty)" : "")"
                p.actionPrintText("\(padRow(label, priceStr))\n")
                if !note.isEmpty { p.actionPrintText("  (\(note))\n") }
                totalItems += qty
            }
        }

        if !str(d,"orderNote").isEmpty {
            p.actionPrintText("----------------------------------------\n")
             .actionPrintText("Note: \(str(d,"orderNote"))\n")
        }

        // Totals
        let subtotal = dbl(d, "subtotal")
        let total    = dbl(d, "total")
        let paid     = dbl(d, "paidAmount")
        let due      = dbl(d, "stillDue")
        let discount = dbl(d, "discount")

        p.actionPrintText("----------------------------------------\n")
         .actionPrintText("\(padRow("Subtotal", fmt(subtotal)))\n")

        if discount > 0 { p.actionPrintText("\(padRow("Discount", "-\(fmt(discount))"))\n") }

        p.styleBold(true)
         .actionPrintText("\(padRow("Total (incl 10% GST)", fmt(total)))\n")
         .styleBold(false)

        if due > 0 {
            p.actionPrintText("\(padRow("Paid", fmt(paid)))\n")
             .actionPrintText("\(padRow("Still Due", fmt(due)))\n")
        }

        // Item count
        p.styleBold(true).styleInvert(true)
         .actionPrintText(" \(totalItems) ")
         .styleInvert(false).styleBold(false)
         .actionPrintText(" item\(totalItems != 1 ? "s" : "")\n")
         .actionPrintText("----------------------------------------\n")

        // Payment status
        p.styleAlignment(.center)
        if due > 0 {
            p.styleMagnification(.init(width: 2, height: 2)).styleBold(true)
             .actionPrintText("PARTIAL PAYMENT\n").styleBold(false)
             .styleMagnification(.init(width: 1, height: 1))
             .actionPrintText("Due: \(fmt(due))\n")
        } else if paid == 0 {
            p.styleMagnification(.init(width: 2, height: 2)).styleInvert(true).styleBold(true)
             .actionPrintText("NOT PAID\n").styleBold(false).styleInvert(false)
             .styleMagnification(.init(width: 1, height: 1))
        } else {
            p.styleMagnification(.init(width: 4, height: 4)).styleBold(true)
             .actionPrintText("PAID\n").styleBold(false)
             .styleMagnification(.init(width: 1, height: 1))
        }

        p.actionPrintText("Payment method: \(str(d,"paymentMethod"))\n")
         .styleAlignment(.left)
         .actionPrintText("----------------------------------------\n")
         .styleAlignment(.center)
         .actionPrintText("Thank you!\n")

        if !str(d,"barcode").isEmpty {
            p.actionPrintQRCode(.init(content: str(d,"barcode")).setCellSize(8))
        }

        p.actionCut(.partial)

        return StarXpandCommand.StarXpandCommandBuilder()
            .addDocument(doc.addPrinter(p))
            .getCommands()
    }

    // ── Label builder (SP742) ─────────────────────────────────────────────
    private func buildLabel(_ d: [String: Any]) -> String {
        let doc = StarXpandCommand.DocumentBuilder()
        let p   = StarXpandCommand.PrinterBuilder()

        p.styleAlignment(.center)
         .styleMagnification(.init(width: 2, height: 2))
         .actionPrintText("ORDER # \(str(d,"orderNumber"))\n")
         .styleMagnification(.init(width: 1, height: 1))
         .styleAlignment(.left)
         .actionPrintText("----------------------------------------\n")
         .actionPrintText("\(str(d,"customerName"))\n")

        if !str(d,"customerPhone").isEmpty { p.actionPrintText("\(str(d,"customerPhone"))\n") }

        p.actionPrintText("----------------------------------------\n")
         .styleMagnification(.init(width: 2, height: 2))
         .actionPrintText("Pick up:\n\(str(d,"pickupDate"))\n")
         .styleMagnification(.init(width: 1, height: 1))
         .actionPrintText("----------------------------------------\n")

        var groups: [String: [[String: Any]]] = [:]
        for item in items(d) {
            let cat = item["category"] as? String ?? "Other"
            groups[cat, default: []].append(item)
        }
        for (cat, catItems) in groups {
            p.styleBold(true).actionPrintText("\(cat.uppercased())\n").styleBold(false)
            for item in catItems {
                let name = item["name"] as? String ?? ""
                let qty  = item["qty"]  as? Int    ?? 1
                let note = item["note"] as? String ?? ""
                p.actionPrintText("  \(name)\(qty > 1 ? " x\(qty)" : "")\n")
                if !note.isEmpty { p.actionPrintText("  (\(note))\n") }
            }
        }

        if !str(d,"orderNote").isEmpty {
            p.actionPrintText("----------------------------------------\n")
             .actionPrintText("Note: \(str(d,"orderNote"))\n")
        }

        p.actionPrintText("----------------------------------------\n")
         .styleAlignment(.center).actionPrintText("CUSTOMER COPY\n")
         .actionFeedLine(3).actionCut(.partial)

        return StarXpandCommand.StarXpandCommandBuilder()
            .addDocument(doc.addPrinter(p))
            .getCommands()
    }
}
