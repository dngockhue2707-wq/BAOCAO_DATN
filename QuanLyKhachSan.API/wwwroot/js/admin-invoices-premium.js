
"use strict";

(() => {
    if (document.body.dataset.page !== "invoices") return;

    const currency = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);

    let currentModal = null;
    let currentBody = null;
    let detailObserver = null;
    let exporting = false;

    function element(tag, className = "", text = "") {
        const node = document.createElement(tag);
        node.className = className;
        node.textContent = text;
        return node;
    }

    function invoiceNumber() {
        const title = currentModal?.querySelector(
            ".invoice-modal-header h2"
        )?.textContent || "";

        const match = title.match(/#(\d+)/);
        return match ? match[1] : "";
    }

    function invoiceReady() {
        if (!currentBody || !currentModal) return false;

        const sections = currentBody.querySelectorAll(".admin-panel");
        return sections.length >= 3 && !!invoiceNumber();
    }

    function reportStatus(text, isError = false) {
        const status = currentModal?.querySelector(".invoice-export-status");
        if (!status) return;
        status.textContent = text;
        status.classList.toggle("is-error", isError);
        status.hidden = !text;
    }

    function setExportBusy(busy) {
        exporting = busy;

        currentModal?.querySelectorAll(
            ".invoice-export-button"
        ).forEach(button => {
            button.disabled = busy;
        });
    }

    function makeReport() {
        if (!invoiceReady()) {
            throw new Error("Hóa đơn chưa tải xong hoặc thiếu dữ liệu.");
        }

        const sheet = element("article", "invoice-print-sheet");
        const head = element("header", "invoice-print-header");

        const brand = element("div", "invoice-print-brand");
        brand.append(
            element("span", "invoice-print-brand-mark", "✦"),
            element("strong", "", "KS HOTEL")
        );

        const subtitle = element(
            "p",
            "invoice-print-brand-subtitle",
            "THÔNG TIN HÓA ĐƠN KHÁCH SẠN"
        );

        const title = element(
            "h1",
            "",
            `HÓA ĐƠN #${invoiceNumber()}`
        );

        const description = element(
            "p",
            "invoice-print-description",
            "Thông tin đặt phòng và các giao dịch được ghi nhận trong hệ thống."
        );

        head.append(brand, subtitle, title, description);
        sheet.appendChild(head);

        const sections = currentBody.querySelectorAll(".admin-panel");

        sections.forEach((section, index) => {
            const clone = section.cloneNode(true);
            clone.classList.add("invoice-print-section");
            clone.removeAttribute("style");

            clone.querySelectorAll("[style]").forEach(node => {
                node.removeAttribute("style");
            });

            clone.querySelectorAll(
                "button, input, select, textarea, .admin-actions"
            ).forEach(node => node.remove());

            clone.querySelectorAll(".admin-table-wrapper").forEach(wrapper => {
                wrapper.classList.add("invoice-print-table-wrapper");
            });

            if (index === 2) {
                clone.classList.add("invoice-print-payment");
            }

            sheet.appendChild(clone);
        });

        const foot = element("footer", "invoice-print-footer");

        const note = element(
            "p",
            "",
            "Tài liệu được xuất từ hệ thống quản lý khách sạn KS Hotel."
        );

        const stamp = element(
            "p",
            "",
            `Mã tham chiếu hóa đơn: #${invoiceNumber()}`
        );

        foot.append(note, stamp);
        sheet.appendChild(foot);

        return sheet;
    }

    const printStyles = `
        @page {
            size: A4 portrait;
            margin: 13mm;
        }
        * {
            box-sizing: border-box;
        }
        html, body {
            margin: 0;
            padding: 0;
            background: white;
            color: #30251E;
            font-family: Georgia, "Times New Roman", serif;
        }
        .invoice-print-sheet {
            width: 100%;
            background: white;
            color: #30251E;
            font-size: 11px;
            line-height: 1.5;
        }
        .invoice-print-header {
            padding: 0 0 16px;
            margin-bottom: 16px;
            border-bottom: 2px solid #926024;
            text-align: center;
        }
        .invoice-print-brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            font-size: 23px;
            color: #80501D;
        }
        .invoice-print-brand-mark {
            font-size: 25px;
        }
        .invoice-print-brand-subtitle {
            margin: 5px 0 13px;
            font-size: 10px;
            letter-spacing: 2px;
        }
        .invoice-print-header h1 {
            margin: 0;
            font-size: 23px;
            font-weight: 600;
        }
        .invoice-print-description {
            margin: 8px 0 0;
            font-size: 11px;
            color: #75685E;
        }
        .invoice-print-section {
            padding: 13px;
            margin: 0 0 13px;
            border: 1px solid #E2D4C4;
            border-radius: 8px;
            background: white;
            break-inside: auto;
        }
        .invoice-print-section > h2,
        .invoice-print-section > h3 {
            margin: 0 0 12px;
            font-family: Georgia, "Times New Roman", serif;
            color: #67421F;
            font-size: 15px;
            font-weight: bold;
            break-after: avoid;
        }
        .invoice-print-section > div:not(.admin-table-wrapper) {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 9px;
        }
        .invoice-print-section > div:not(.admin-table-wrapper) > div {
            min-width: 0;
            padding: 8px 9px;
            border-radius: 5px;
            background: #F8F5F1;
            overflow-wrap: anywhere;
        }
        .invoice-print-section > div:not(.admin-table-wrapper) > div > div {
            margin-bottom: 4px;
            color: #75685E;
            font-size: 10px;
        }
        .invoice-print-section strong {
            color: #30251E;
            font-size: 11px;
            overflow-wrap: anywhere;
        }
        .invoice-print-payment {
            border-color: #C9A77C;
        }
        .invoice-print-table-wrapper {
            width: 100%;
            overflow: visible;
        }
        .invoice-print-section table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 9px;
        }
        .invoice-print-section th,
        .invoice-print-section td {
            padding: 7px 5px;
            border: 1px solid #E7DCD0;
            text-align: left;
            vertical-align: top;
            overflow-wrap: anywhere;
        }
        .invoice-print-section th {
            background: #F1E8DC;
            color: #493526;
            font-weight: bold;
        }
        .invoice-print-section tr {
            break-inside: avoid;
        }
        .invoice-print-footer {
            padding: 14px 0 0;
            border-top: 1px solid #D9C5AD;
            text-align: center;
            font-size: 10px;
            color: #77685A;
        }
        .invoice-print-footer p {
            margin: 4px 0;
        }
        button, .invoice-export-toolbar {
            display: none !important;
        }
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    `;

    function createPrintDocument(sheet) {
        return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Hoa don ${invoiceNumber()} - KS Hotel</title>
<style>${printStyles}</style>
</head>
<body>
${sheet.outerHTML}
</body>
</html>`;
    }

    function printInvoice() {
        try {
            const sheet = makeReport();
            const frame = document.createElement("iframe");

            frame.style.position = "fixed";
            frame.style.width = "0";
            frame.style.height = "0";
            frame.style.border = "0";
            frame.style.visibility = "hidden";
            frame.setAttribute("aria-hidden", "true");

            document.body.appendChild(frame);

            const frameWindow = frame.contentWindow;
            const documentToPrint = frameWindow.document;

            documentToPrint.open();
            documentToPrint.write(createPrintDocument(sheet));
            documentToPrint.close();

            let fired = false;

            const runPrint = () => {
                if (fired) return;
                fired = true;

                frameWindow.focus();
                frameWindow.print();

                setTimeout(() => {
                    frame.remove();
                }, 30000);
            };

            frameWindow.addEventListener("load", runPrint, { once: true });
            setTimeout(runPrint, 500);
        } catch (error) {
            reportStatus(error.message, true);
        }
    }

    async function downloadInvoice() {
        if (exporting) return;

        try {
            setExportBusy(true);
            reportStatus("Đang tạo tệp PDF...");

            if (typeof window.html2pdf !== "function") {
                throw new Error(
                    "Không tải được thư viện PDF. Hãy kiểm tra Internet hoặc sử dụng nút In hóa đơn để lưu PDF."
                );
            }

            const sheet = makeReport();
            const stage = document.createElement("div");

            stage.className = "invoice-pdf-stage";
            stage.style.cssText = `
                position:fixed;
                left:0;
                top:0;
                width:794px;
                padding:28px;
                background:#ffffff;
                z-index:-1;
                pointer-events:none;
            `;

            sheet.style.width = "738px";

            const style = document.createElement("style");
            style.textContent = printStyles;

            stage.append(style, sheet);
            document.body.appendChild(stage);

            try {
                const options = {
                    margin: [10, 10, 10, 10],
                    filename: `KS-Hotel-Hoa-Don-${invoiceNumber()}.pdf`,
                    image: {
                        type: "jpeg",
                        quality: 0.98
                    },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: "#FFFFFF",
                        scrollY: 0
                    },
                    jsPDF: {
                        unit: "mm",
                        format: "a4",
                        orientation: "portrait"
                    },
                    pagebreak: {
                        mode: ["css", "legacy"],
                        avoid: ["tr", ".invoice-print-header"]
                    }
                };

                await window.html2pdf()
                    .set(options)
                    .from(sheet)
                    .save();

                reportStatus("Đã yêu cầu tải tệp PDF.");
            } finally {
                stage.remove();
            }
        } catch (error) {
            reportStatus(
                error.message || "Không thể tạo PDF. Hãy thử in và lưu dưới dạng PDF.",
                true
            );
        } finally {
            setExportBusy(false);
        }
    }

    function enhanceSections() {
        if (!invoiceReady()) return;

        const sections = currentBody.querySelectorAll(".admin-panel");

        sections.forEach((section, index) => {
            section.classList.add("invoice-detail-section");
            section.classList.toggle("invoice-detail-money", index === 2);
        });

        currentModal.querySelectorAll(
            ".invoice-export-button"
        ).forEach(button => {
            button.disabled = exporting;
        });
    }

    function createToolbar() {
        if (currentModal.querySelector(".invoice-export-toolbar")) {
            return;
        }

        const toolbar = element("div", "invoice-export-toolbar");
        const status = element("span", "invoice-export-status");
        status.hidden = true;
        status.setAttribute("role", "status");

        const actions = element("div", "invoice-export-actions");

        const download = element(
            "button",
            "invoice-export-button invoice-download-button",
            "↓ Tải PDF"
        );

        const print = element(
            "button",
            "invoice-export-button invoice-print-button",
            "▤ In hóa đơn"
        );

        download.type = "button";
        print.type = "button";

        download.addEventListener("click", downloadInvoice);
        print.addEventListener("click", printInvoice);

        actions.append(download, print);
        toolbar.append(status, actions);

        currentModal.appendChild(toolbar);
    }

    function observeDetail() {
        if (!currentBody) return;

        detailObserver?.disconnect();

        detailObserver = new MutationObserver(() => {
            if (invoiceReady()) {
                enhanceSections();
                reportStatus("");
            }
        });

        detailObserver.observe(currentBody, {
            childList: true,
            subtree: false
        });

        enhanceSections();
    }

    function attachModal(modal) {
        if (currentModal === modal) return;

        currentModal = modal;
        currentBody = modal.querySelector(
            ".invoice-modal-header + div"
        );

        if (!currentBody) return;

        modal.classList.add("invoice-premium-modal");

        const header = modal.querySelector(".invoice-modal-header");
        const close = header?.querySelector("button");

        if (header) {
            header.classList.add("invoice-premium-header");
        }

        if (close) {
            close.classList.add("invoice-premium-close");
            close.setAttribute("aria-label", "Đóng chi tiết hóa đơn");
        }

        currentBody.classList.add("invoice-premium-body");

        createToolbar();
        observeDetail();
    }

    function initialize() {
        const root = document.getElementById("adminApp");
        if (!root) return;

        const existing = root.querySelector(".invoice-modal");

        if (existing) {
            attachModal(existing);
        }

        const observer = new MutationObserver(() => {
            const modal = root.querySelector(".invoice-modal");

            if (modal && modal !== currentModal) {
                attachModal(modal);
            }
        });

        observer.observe(root, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }
})();
