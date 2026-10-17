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
        CAPPluginMethod(name: "printPickupSheet",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printVoucher",         returnType: CAPPluginReturnPromise),
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
    // ── Auto-reconnect retry helper ─────────────────────────────────────────
    // Retries up to maxAttempts times with a delay between each attempt.
    // Handles the common case of a printer dropping when paper roll is changed.
    private func withRetry(maxAttempts: Int = 3, delaySeconds: Double = 3.0,
                           job: @escaping () async throws -> Void) async throws {
        var lastError: Error? = nil
        for attempt in 1...maxAttempts {
            do {
                try await job()
                return  // success
            } catch {
                lastError = error
                if attempt < maxAttempts {
                    print("Printer attempt \(attempt) failed: \(error). Retrying in \(delaySeconds)s...")
                    try await Task.sleep(nanoseconds: UInt64(delaySeconds * 1_000_000_000))
                }
            }
        }
        throw lastError!
    }

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

        let isRedo     = call.getString("isRedo") == "true"
        let redoReason  = call.getString("redoReason") ?? ""
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
                    try await self.withRetry { [self] in
                        try await printer.open()
                        let cmd = self.buildCompactLabels(
                            orderNumber: orderNumber, customerName: customerName,
                            pickupDate: pickupDate, labelNames: dcLabelNames, isDryCleaning: true,
                            isRedo: isRedo, redoReason: redoReason)
                        try await printer.print(command: cmd)
                        await printer.close()
                    }
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
                    try await self.withRetry { [self] in
                        try await printer.open()
                        let cmd = self.buildCompactLabels(
                            orderNumber: orderNumber, customerName: customerName,
                            pickupDate: pickupDate, labelNames: altLabelNames, isDryCleaning: false,
                            isRedo: isRedo, redoReason: redoReason)
                        try await printer.print(command: cmd)
                        await printer.close()
                    }
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
        isDryCleaning: Bool,
        isRedo: Bool = false,
        redoReason: String = ""
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

                // REDO banner
                if isRedo {
                    doc.addPrinter(StarXpandCommand.PrinterBuilder()
                        .styleAlignment(.center).styleBold(true)
                        .styleMagnification(.init(width: 2, height: 2))
                        .actionPrintText("*** REDO ***").actionFeedLine(1))
                    if !redoReason.isEmpty {
                        doc.addPrinter(StarXpandCommand.PrinterBuilder()
                            .styleAlignment(.left).styleBold(false)
                            .styleMagnification(.init(width: 1, height: 1))
                            .actionPrintText(redoReason).actionFeedLine(1))
                    }
                }
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
                // ── THERMAL (mC-Print3) — partialDirect cut ───────────────────────
                // Mixing .left and .right alignments without a line feed causes
                // the mC-Print3 to centre the entire line. Fix: print the large
                // order# with a line feed (left-only, no right-side duplicate).
                // .partialDirect cuts at the current position without extra paper
                // feed, keeping the top margin as tight as .partialDirect allows.

                // Row 1: large order# (2x, left) + small order# (1x, right) on
                // same line. Keep alignment .left throughout — switching to .right
                // mid-line causes mC-Print3 to centre the whole line. Instead,
                // manually pad spaces to push the 1x order# to the right margin.
                // 2x text takes (count × 2) char-widths; remaining = WIDTH − that.
                let largeWidth = orderNumber.count * 2
                let padSpaces  = max(1, WIDTH - largeWidth - orderNumber.count)
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .styleAlignment(.left).styleBold(true)
                    .styleMagnification(.init(width: 2, height: 2))
                    .actionPrintText(orderNumber)
                    .styleMagnification(.init(width: 1, height: 1)).styleBold(false)
                    .actionPrintText(String(repeating: " ", count: padSpaces) + orderNumber + "\n"))

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

                // Standard partial cut — mC-Print3 feeds to cutter position.
                // The resulting top margin is a fixed hardware distance on this
                // printer and cannot be reduced further in software.
                doc.addPrinter(StarXpandCommand.PrinterBuilder()
                    .actionCut(.partial))
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

    // ── Print pickup sheet ──────────────────────────────────────────────────
    @objc func printPickupSheet(_ call: CAPPluginCall) {
        guard let identifier   = call.getString("identifier"),
              let ordersJson   = call.getString("ordersJson")
        else { call.reject("Missing identifier or ordersJson"); return }

        let businessName = call.getString("businessName") ?? ""
        let locationName = call.getString("locationName") ?? ""
        let dateLabel    = call.getString("date") ?? ""
        let footer       = call.getString("footer") ?? ""

        guard let data   = ordersJson.data(using: .utf8),
              let orders = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
        else { call.reject("Invalid ordersJson"); return }

        let printer = StarPrinter(StarConnectionSettings(interfaceType: .lan, identifier: identifier))

        Task {
            do {
                try await printer.open()
                let cmd = self.buildPickupSheet(
                    businessName: businessName,
                    locationName: locationName,
                    dateLabel:    dateLabel,
                    orders:       orders,
                    footer:       footer
                )
                try await printer.print(command: cmd)
                await printer.close()
                call.resolve(["success": true])
            } catch {
                await printer.close()
                call.reject("Pickup sheet print failed: \(error)")
            }
        }
    }

    private func buildPickupSheet(
        businessName: String,
        locationName: String,
        dateLabel:    String,
        orders:       [[String: Any]],
        footer:       String
    ) -> String {
        let doc = StarXpandCommand.DocumentBuilder()
        let p   = StarXpandCommand.PrinterBuilder()

        // ── Header ────────────────────────────────────────────────────────
        p.styleAlignment(.center)
         .styleBold(true)
         .actionPrintText("\(businessName)\n")
         .styleBold(false)
         .actionPrintText("\(locationName)\n")
         .actionPrintText("----------------------------------------\n")
         .styleMagnification(.init(width: 2, height: 2))
         .actionPrintText("Pick Up Date:\n")
         .styleBold(true)
         .actionPrintText("\(dateLabel)\n")
         .styleBold(false)
         .styleMagnification(.init(width: 1, height: 1))
         .actionPrintText("----------------------------------------\n\n")

        // ── Orders ────────────────────────────────────────────────────────
        for order in orders {
            let orderNum   = order["orderNumberString"] as? String ?? ""
            let customer   = order["customerName"]      as? String ?? ""
            let phone      = order["customerPhone"]     as? String ?? ""
            let amount     = order["orderAmount"]       as? Double ?? 0
            let status     = order["status"]            as? String ?? "In progress"
            let orderNote  = order["orderNote"]         as? String ?? ""
            let items      = order["items"]             as? [[String: Any]] ?? []

            // Order header
            p.styleAlignment(.left)
             .styleBold(true)
             .actionPrintText("Order# \(orderNum)\n")
             .styleBold(false)
             .actionPrintText("Customer: \(customer)\n")
            if !phone.isEmpty { p.actionPrintText("Phone: \(phone)\n") }
            p.actionPrintText("\n")

            // Items grouped by category (strip trailing number e.g. "Trouser 1" → "TROUSER")
            var groups: [String: [[String: Any]]] = [:]
            var groupOrder: [String] = []
            for item in items {
                var cat = item["category"] as? String ?? "Other"
                // Strip trailing " 1", " 2" etc
                if let range = cat.range(of: #"\s+\d+$"#, options: .regularExpression) {
                    cat = String(cat[cat.startIndex..<range.lowerBound])
                }
                cat = cat.uppercased()
                if groups[cat] == nil { groups[cat] = []; groupOrder.append(cat) }
                groups[cat]!.append(item)
            }

            var totalQty = 0
            for cat in groupOrder {
                guard let catItems = groups[cat] else { continue }
                p.styleBold(true).actionPrintText("\(cat)\n").styleBold(false)
                for item in catItems {
                    let name       = item["name"]       as? String   ?? ""
                    let qty        = item["quantity"]   as? Int      ?? 1
                    let price      = item["unitPrice"]  as? Double   ?? 0
                    let note       = item["note"]       as? String   ?? ""
                    let components = item["components"] as? [String] ?? []
                    let extras     = item["extras"]     as? [[String: Any]] ?? []
                    let label = "  \(name) x\(qty)"
                    p.actionPrintText("\(padRow(label, fmt(price)))\n")
                    for c in components { p.actionPrintText("    \u{2514} \(c)\n") }
                    for e in extras {
                        let eName = e["name"] as? String ?? ""
                        let ePrice = e["price"] as? Double ?? 0
                        p.actionPrintText("    + \(eName) $\(fmt(ePrice))\n")
                    }
                    if !note.isEmpty { p.actionPrintText("  (\(note))\n") }
                    totalQty += qty
                }
            }

            if !orderNote.isEmpty {
                p.actionPrintText("Note: \(orderNote)\n")
            }

            // Subtotal + item count
            p.actionPrintText("\n")
             .actionPrintText("\(padRow("Subtotal", fmt(amount)))\n")
             .styleBold(true).styleMagnification(.init(width: 2, height: 2))
             .actionPrintText("\(totalQty) item\(totalQty != 1 ? "s" : "")\n")
             .styleMagnification(.init(width: 1, height: 1)).styleBold(false)

            // Status — inverted if still in progress
            let isActive = status == "In progress" || status == "Redo"
            if isActive {
                p.styleInvert(true).actionPrintText("Status: \(status)").styleInvert(false).actionPrintText("\n")
            } else {
                p.actionPrintText("Status: \(status)\n")
            }
            p.actionPrintText("----------------------------------------\n\n")
        }

        // ── Cut ──────────────────────────────────────────────────────────
        p.actionFeedLine(3).actionCut(.partial)

        return StarXpandCommand.StarXpandCommandBuilder()
            .addDocument(doc.addPrinter(p))
            .getCommands()
    }

    // ── Print voucher ─────────────────────────────────────────────────────
    @objc func printVoucher(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier") else { call.reject("Missing identifier"); return }
        let printer = StarPrinter(StarConnectionSettings(interfaceType: .lan, identifier: identifier))

        let businessName    = call.getString("businessName")    ?? ""
        let locationName    = call.getString("locationName")    ?? ""
        let locationAddress = call.getString("locationAddress") ?? ""
        let locationPhone   = call.getString("locationPhone")   ?? ""
        let abn             = call.getString("abn")             ?? ""
        let voucherCode     = call.getString("voucherCode")     ?? ""
        let amount          = call.getDouble("amount")          ?? 0
        let customerName    = call.getString("customerName")    ?? ""
        let customerPhone   = call.getString("customerPhone")   ?? ""
        let issueDate       = call.getString("issueDate")       ?? ""
        let expiryDate      = call.getString("expiryDate")      ?? ""

        Task {
            do {
                try await printer.open()
                let cmd = self.buildVoucherReceipt(
                    businessName:    businessName,
                    locationName:    locationName,
                    locationAddress: locationAddress,
                    locationPhone:   locationPhone,
                    abn:             abn,
                    voucherCode:     voucherCode,
                    amount:          amount,
                    customerName:    customerName,
                    customerPhone:   customerPhone,
                    issueDate:       issueDate,
                    expiryDate:      expiryDate
                )
                try await printer.print(command: cmd)
                await printer.close()
                call.resolve(["success": true])
            } catch {
                await printer.close()
                call.reject("Voucher print failed: \(error)")
            }
        }
    }

    private func formatReceiptDate(_ iso: String) -> String {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        guard let date = fmt.date(from: iso) else { return iso }
        let out = DateFormatter()
        out.dateFormat = "d MMMM yyyy"
        return out.string(from: date)
    }

    private func buildVoucherReceipt(
        businessName:    String,
        locationName:    String,
        locationAddress: String,
        locationPhone:   String,
        abn:             String,
        voucherCode:     String,
        amount:          Double,
        customerName:    String,
        customerPhone:   String,
        issueDate:       String,
        expiryDate:      String
    ) -> String {
        let doc = StarXpandCommand.DocumentBuilder()
        let p   = StarXpandCommand.PrinterBuilder()

        // ── Header: business details ──────────────────────────────────────
        p.styleAlignment(.center)
         .styleBold(true)
         .actionPrintText("\(businessName)\n")
         .styleBold(false)

        p.styleAlignment(.left)
        if !locationName.isEmpty    { p.actionPrintText("\(businessName) - \(locationName)\n") }
        if !locationAddress.isEmpty { p.actionPrintText("\(locationAddress)\n") }
        if !locationPhone.isEmpty   { p.actionPrintText("Phone: \(locationPhone)\n") }
        if !abn.isEmpty             { p.actionPrintText("ABN: \(abn)\n") }

        // ── VOUCHER title ─────────────────────────────────────────────────
        p.styleAlignment(.center)
         .actionPrintText("----------------------------------------\n")
         .styleBold(true)
         .styleMagnification(.init(width: 2, height: 2))
         .actionPrintText("VOUCHER\n")
         .styleBold(false)
         .styleMagnification(.init(width: 1, height: 1))
         .actionPrintText("----------------------------------------\n")

        // ── Amount (large) ────────────────────────────────────────────────
        p.styleBold(true)
         .styleMagnification(.init(width: 3, height: 3))
         .actionPrintText(String(format: "$%.2f\n", amount))
         .styleBold(false)
         .styleMagnification(.init(width: 1, height: 1))

        // ── Customer details ──────────────────────────────────────────────
        p.styleAlignment(.left)
         .actionPrintText("----------------------------------------\n")
        if !customerName.isEmpty  { p.actionPrintText("Name:  \(customerName)\n") }
        if !customerPhone.isEmpty { p.actionPrintText("Phone: \(customerPhone)\n") }

        // ── Code + Issue Date ─────────────────────────────────────────────
        p.actionPrintText("----------------------------------------\n")
         .styleBold(true)
         .styleMagnification(.init(width: 2, height: 2))
         .actionPrintText("\(voucherCode)\n")
         .styleBold(false)
         .styleMagnification(.init(width: 1, height: 1))
         .actionPrintText("Issue Date: \(formatReceiptDate(issueDate))\n")

        // ── Expiry Date (large) ───────────────────────────────────────────
        p.actionPrintText("----------------------------------------\n")
         .styleAlignment(.left)
         .styleMagnification(.init(width: 2, height: 2))
         .styleBold(true)
         .actionPrintText("Expiry Date:\n")
         .actionPrintText("\(formatReceiptDate(expiryDate))\n")
         .styleBold(false)
         .styleMagnification(.init(width: 1, height: 1))

        // ── Footer ────────────────────────────────────────────────────────
        p.actionPrintText("----------------------------------------\n")
         .styleAlignment(.center)
         .actionPrintText("Redeem this voucher at any \(businessName)\nlocation before the expiry date.\nThank you!\n")
         .actionFeedLine(3)
         .actionCut(.partial)

        return StarXpandCommand.StarXpandCommandBuilder()
            .addDocument(doc.addPrinter(p))
            .getCommands()
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
        if left.count + right.count + 1 > width {
            // Name too long — print price right-aligned on next line
            let padding = max(0, width - right.count)
            return left + "\n" + String(repeating: " ", count: padding) + right
        }
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
                let name       = item["name"]       as? String   ?? ""
                let qty        = item["qty"]        as? Int      ?? 1
                let price      = item["unitPrice"]  as? Double   ?? 0
                let note       = item["note"]       as? String   ?? ""
                let components = item["components"] as? [String] ?? []
                let extras     = item["extras"]     as? [[String: Any]] ?? []
                let priceStr = fmt(price * Double(qty))
                let label = "  \(name)\(qty > 1 ? " x\(qty)" : "")"
                p.actionPrintText("\(padRow(label, priceStr))\n")
                for c in components { p.actionPrintText("    \u{2514} \(c)\n") }
                for e in extras {
                    let eName = e["name"] as? String ?? ""
                    let ePrice = e["price"] as? Double ?? 0
                    p.actionPrintText("    + \(eName) $\(fmt(ePrice))\n")
                }
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
        p.styleBold(true).styleMagnification(.init(width: 2, height: 2))
         .actionPrintText("\(totalItems) item\(totalItems != 1 ? "s" : "")\n")
         .styleMagnification(.init(width: 1, height: 1)).styleBold(false)
         .actionPrintText("----------------------------------------\n")

        // Payment status — with refund handling
        let refundAmt = dbl(d, "refundAmount")
        p.styleAlignment(.center)
        if refundAmt > 0 {
            // Always show PAID first (money was collected), then refund label
            p.styleMagnification(.init(width: 4, height: 4)).styleBold(true)
             .actionPrintText("PAID\n").styleBold(false)
             .styleMagnification(.init(width: 2, height: 2))
            if refundAmt >= paid {
                p.actionPrintText("(Fully Refunded)\n")
            } else {
                p.actionPrintText("(Partially Refunded)\n")
            }
            p.styleMagnification(.init(width: 1, height: 1))
        } else if due > 0 && paid > 0 {
            p.styleMagnification(.init(width: 3, height: 3)).styleInvert(true).styleBold(true)
             .actionPrintText("PARTIALLY PAID\n").styleBold(false).styleInvert(false)
             .styleMagnification(.init(width: 1, height: 1))
             .actionPrintText("Due: \(fmt(due))\n")
        } else if due > 0 {
            p.styleMagnification(.init(width: 4, height: 4)).styleInvert(true).styleBold(true)
             .actionPrintText("NOT PAID\n").styleBold(false).styleInvert(false)
             .styleMagnification(.init(width: 1, height: 1))
             .actionPrintText("Due: \(fmt(due))\n")
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

        p.styleAlignment(.center)
         .actionPrintText("\n— Powered by Stitch POS —\n")
         .actionCut(.partial)

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
