import Capacitor
import StarIO10

@objc(StarPrinterPlugin)
public class StarPrinterPlugin: CAPPlugin, CAPBridgedPlugin, StarDeviceDiscoveryManagerDelegate {
    public let identifier = "StarPrinterPlugin"
    public let jsName = "StarPrinterPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "discoverPrinters",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printReceipt",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printLabel",          returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printLabelsForOrder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openDrawer",          returnType: CAPPluginReturnPromise),
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

    // ── Print labels for order ──────────────────────────────────────────────
    // Routes dry-cleaning items → impact printer (SP742, blank leader+trailer)
    // and alterations items → thermal printer (mC-Print3, no blanks).
    @objc func printLabelsForOrder(_ call: CAPPluginCall) {
        guard let orderNumber  = call.getString("orderNumber"),
              let customerName = call.getString("customerName"),
              let pickupDate   = call.getString("pickupDate"),
              let itemsJson    = call.getString("itemsJson"),
              let shopType     = call.getString("shopType"),
              let impactId     = call.getString("impactIdentifier"),
              let thermalId    = call.getString("thermalIdentifier")
        else { call.reject("Missing required parameters"); return }

        guard let data  = itemsJson.data(using: .utf8),
              let items = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
        else { call.reject("Invalid items JSON"); return }

        let isDCShop = shopType == "dryCleaning"

        // Split items into dry-cleaning vs alterations
        var dcItems:  [[String: Any]] = []
        var altItems: [[String: Any]] = []
        for item in items {
            let cat  = (item["category"] as? String ?? "").lowercased()
            let name = (item["name"]     as? String ?? "").lowercased()
            let isDC = isDCShop || cat.contains("dry cleaning") || name.contains("dry cleaning")
            if isDC { dcItems.append(item) } else { altItems.append(item) }
        }

        // Build one label-name entry per physical garment × quantity
        func buildLabelNames(from src: [[String: Any]]) -> [String] {
            var names: [String] = []
            var handled = Set<String>()
            for item in src {
                let garmentId  = item["garmentId"]  as? String ?? ""
                let qty        = item["quantity"]   as? Int    ?? 1
                let itemName   = item["name"]       as? String ?? ""
                let components = item["components"] as? [String] ?? []
                if !garmentId.isEmpty {
                    if handled.contains(garmentId) { continue }
                    handled.insert(garmentId)
                }
                let count = max(qty, 1)
                if components.isEmpty {
                    names.append(contentsOf: Array(repeating: itemName, count: count))
                } else {
                    for _ in 0..<count { names.append(contentsOf: components) }
                }
            }
            return names
        }

        let dcLabelNames  = isDCShop
            ? buildLabelNames(from: items)
            : buildLabelNames(from: dcItems)
        let altLabelNames = buildLabelNames(from: altItems)

        Task {
            var anyPrinted = false

            // Impact printer: dry-cleaning labels
            if !dcLabelNames.isEmpty {
                let printer = StarPrinter(StarConnectionSettings(interfaceType: .lan, identifier: impactId))
                do {
                    try await printer.open()
                    let cmd = self.buildCompactLabels(
                        orderNumber: orderNumber, customerName: customerName,
                        pickupDate: pickupDate, labelNames: dcLabelNames, isDryCleaning: true)
                    try await printer.print(command: cmd)
                    await printer.close()
                    anyPrinted = true
                } catch {
                    await printer.close()
                    print("Impact label print failed: \(error)")
                }
            }

            // Thermal printer: alterations labels
            if !altLabelNames.isEmpty {
                let printer = StarPrinter(StarConnectionSettings(interfaceType: .lan, identifier: thermalId))
                do {
                    try await printer.open()
                    let cmd = self.buildCompactLabels(
                        orderNumber: orderNumber, customerName: customerName,
                        pickupDate: pickupDate, labelNames: altLabelNames, isDryCleaning: false)
                    try await printer.print(command: cmd)
                    await printer.close()
                    anyPrinted = true
                } catch {
                    await printer.close()
                    print("Thermal label print failed: \(error)")
                }
            }

            if anyPrinted { call.resolve(["success": true]) }
            else { call.reject("No labels printed — check printer connections") }
        }
    }

    // ── Compact label builder ──────────────────────────────────────────────────
    // 3-row layout matching the STIDC green label format:
    //   Row 1: ORDER NUMBER (2× bold left)    ORDER NUMBER (small right)
    //   Row 2: Pickup date (left)             X of N (right)
    //   Row 3: ITEM NAME ≤25 chars (left)     CUSTOMER NAME (right)
    //
    // isDryCleaning=true  → blank leader + ESC d 1 cuts + blank trailer (SP742)
    // isDryCleaning=false → standard partial cuts, no blanks (mC-Print3)
    private func buildCompactLabels(
        orderNumber:  String,
        customerName: String,
        pickupDate:   String,
        labelNames:   [String],
        isDryCleaning: Bool
    ) -> String {
        let total = labelNames.count
        let WIDTH = 42

        // Build a fixed-width two-column string (left + spaces + right)
        func twoCol(_ left: String, _ right: String) -> String {
            let l      = String(left.prefix(WIDTH))
            let spaces = max(1, WIDTH - l.count - right.count)
            return l + String(repeating: " ", count: spaces) + right
        }

        // Blank label — same physical height as a garment label
        func makeBlank(finalCut: Bool) -> StarXpandCommand.DocumentBuilder {
            let doc = StarXpandCommand.DocumentBuilder()
            doc.addPrinter(StarXpandCommand.PrinterBuilder()
                .styleMagnification(.init(width: 1, height: 1)).actionFeedLine(1))
            doc.addPrinter(StarXpandCommand.PrinterBuilder()
                .styleAlignment(.left).styleBold(true)
                .styleMagnification(.init(width: 2, height: 2))
                .actionPrintText(" ").actionFeedLine(1))
            doc.addPrinter(StarXpandCommand.PrinterBuilder()
                .styleAlignment(.right).actionPrintText(" \n"))
            doc.addPrinter(StarXpandCommand.PrinterBuilder()
                .styleAlignment(.left).styleBold(true)
                .actionPrintText(" ").actionFeedLine(1))
            doc.addPrinter(StarXpandCommand.PrinterBuilder()
                .styleAlignment(.left).styleBold(true)
                .actionPrintText(" ").actionFeedLine(1))
            // ESC d 1 releases the previous (last garment) label at current position.
            // actionCut(.partial) then ejects the blank itself — the extra cutter-feed
            // distance is confined to this sacrificial blank, not a garment label.
            doc.addRaw(Data([0x1B, 0x64, 0x01]))
            if finalCut {
                doc.addPrinter(StarXpandCommand.PrinterBuilder().actionCut(.partial))
            }
            return doc
        }

        let builder = StarXpandCommand.StarXpandCommandBuilder()

        // Leading blank label (dry cleaning only)
        if isDryCleaning { builder.addDocument(makeBlank(finalCut: false)) }

        for i in 1...total {
            let name = String(labelNames[i - 1].prefix(25)).uppercased()
            let doc  = StarXpandCommand.DocumentBuilder()

            if isDryCleaning {
                // ── IMPACT (SP742) — ESC d 1 current-position cut ─────────────────────
                // Pre-feed: 1 line so text starts right after cut
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .styleMagnification(.init(width: 1, height: 1)).actionFeedLine(1))

                // Row 1 LEFT: order number large bold (2×2)
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .styleAlignment(.left).styleBold(true)
                    .styleMagnification(.init(width: 2, height: 2))
                    .actionPrintText(orderNumber).actionFeedLine(1))
                // Row 1 RIGHT: order number small right-aligned
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .styleAlignment(.right).styleBold(false)
                    .styleMagnification(.init(width: 1, height: 1))
                    .actionPrintText("\(orderNumber) \n"))

                // Row 2: date (left) + count (right)
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .styleAlignment(.left).styleBold(true)
                    .styleMagnification(.init(width: 1, height: 1))
                    .actionPrintText(twoCol(pickupDate, "\(i) of \(total)"))
                    .actionFeedLine(1))

                // Row 3: item name (left) + customer name (right)
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .styleAlignment(.left).styleBold(true)
                    .actionPrintText(twoCol(name, customerName.uppercased())))

                // Post-feed + ESC d 1 current-position cut
                doc.addPrinter(StarXpandCommand.PrinterBuilder().actionFeedLine(1))
                doc.addRaw(Data([0x1B, 0x64, 0x01]))

            } else {
                // ── THERMAL (mC-Print3) — standard actionCut(.partial) ──────────────
                // mC-Print3 interprets ESC d 1 differently from SP742 so we
                // use the StarXpand cut API. No pre/post feed to keep height tight.

                // Row 1 LEFT: order number large bold (2×2) — NO actionFeedLine after.
                // Without the line feed the print head stays at the end of the large
                // text; the right-aligned 1x text then lands alongside the bottom of
                // the 2x area, matching the visual of the DC impact labels.
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .styleAlignment(.left).styleBold(true)
                    .styleMagnification(.init(width: 2, height: 2))
                    .actionPrintText(orderNumber))
                // Row 1 RIGHT: order number small right-aligned (same visual row)
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .styleAlignment(.right).styleBold(false)
                    .styleMagnification(.init(width: 1, height: 1))
                    .actionPrintText("\(orderNumber) \n"))

                // Row 2: date (left) + count (right)
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .styleAlignment(.left).styleBold(true)
                    .styleMagnification(.init(width: 1, height: 1))
                    .actionPrintText(twoCol(pickupDate, "\(i) of \(total)"))
                    .actionFeedLine(1))

                // Row 3: item name (left) + customer name (right)
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .styleAlignment(.left).styleBold(true)
                    .actionPrintText(twoCol(name, customerName.uppercased())))

                // Standard partial cut (feeds to cutter position — no addRaw needed)
                doc.addPrinter(StarXpandCommand.PrinterBuilder().actionCut(.partial))
            }

            builder.addDocument(doc)
        }

        // Trailing blank label (dry cleaning only — flushes last garment label cleanly)
        if isDryCleaning { builder.addDocument(makeBlank(finalCut: true)) }

        return builder.getCommands()
    }

    // ── Print label (legacy) ───────────────────────────────────────────────
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
