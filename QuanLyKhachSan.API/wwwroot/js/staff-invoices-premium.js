
"use strict";

(() => {
    if (document.body.dataset.page !== "invoices") return;

    const downloadButton = document.getElementById(
        "downloadInvoicePdfButton"
    );

    const status = document.getElementById(
        "staffInvoiceExportStatus"
    );

    const modal = document.getElementById(
        "invoiceDetailModal"
    );

    const printArea = document.getElementById(
        "invoicePrintArea"
    );

    if (!downloadButton || !modal || !printArea) return;

    let busy = false;

    function notify(message, error = false) {
        if (!status) return;

        status.textContent = message;
        status.classList.toggle("is-error", error);
    }

    function makeElement(tag, className, text) {
        const node = document.createElement(tag);
        node.className = className;

        if (text !== undefined) {
            node.textContent = String(text);
        }

        return node;
    }

    function invoiceId() {
        const text = document.getElementById(
            "detailInvoiceId"
        )?.textContent.trim() || "";

        return text.replace(/^#/, "");
    }

    function invoiceLoaded() {
        const id = invoiceId();

        return (
            !modal.hidden &&
            !!id &&
            id !== "—" &&
            !!document.getElementById("detailCustomer") &&
            document.getElementById("detailCustomer")
                .textContent.trim() !== "—"
        );
    }

    function buildDocument() {
        const sheet = makeElement(
            "article",
            "staff-invoice-pdf-document"
        );

        const header = makeElement(
            "header",
            "staff-invoice-pdf-header"
        );

        header.append(
            makeElement(
                "div",
                "staff-invoice-pdf-brand",
                "✦ KS HOTEL"
            ),
            makeElement(
                "div",
                "staff-invoice-pdf-label",
                "HÓA ĐƠN THANH TOÁN"
            ),
            makeElement(
                "h1",
                "",
                `HÓA ĐƠN #${invoiceId()}`
            )
        );

        sheet.appendChild(header);

        const sections = printArea.querySelectorAll(
            ".invoice-detail-section"
        );

        sections.forEach(source => {
            const section = source.cloneNode(true);
            section.removeAttribute("style");

            section.querySelectorAll("[style]").forEach(node => {
                node.removeAttribute("style");
            });

            sheet.appendChild(section);
        });

        const footer = makeElement(
            "footer",
            "staff-invoice-pdf-footer"
        );

        footer.append(
            makeElement(
                "p",
                "",
                "Thông tin hóa đơn được xuất từ hệ thống quản lý KS Hotel."
            ),
            makeElement(
                "p",
                "",
                `Mã tham chiếu: #${invoiceId()}`
            )
        );

        sheet.appendChild(footer);

        return sheet;
    }

    async function downloadPDF() {
        if (busy) return;

        if (!invoiceLoaded()) {
            notify(
                "Vui lòng mở hóa đơn và tải đầy đủ thông tin trước.",
                true
            );
            return;
        }

        if (typeof window.html2pdf !== "function") {
            notify(
                "Không tải được thư viện PDF. Hãy chọn In hóa đơn và lưu dưới dạng PDF.",
                true
            );
            return;
        }

        busy = true;
        downloadButton.disabled = true;
        notify("Đang tạo tệp PDF...");

        let stage = null;

        try {
            stage = makeElement(
                "div",
                "staff-invoice-pdf-stage"
            );

            stage.appendChild(buildDocument());
            document.body.appendChild(stage);

            await document.fonts.ready;

            const options = {
                margin: [10, 10, 10, 10],
                filename: `KS-Hotel-Hoa-Don-${invoiceId()}.pdf`,
                image: {
                    type: "jpeg",
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#FFFFFF",
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                },
                pagebreak: {
                    mode: ["css", "legacy"],
                    avoid: [
                        ".staff-invoice-pdf-header",
                        ".invoice-detail-grid > div",
                        ".invoice-payment-table tr"
                    ]
                }
            };

            await window.html2pdf()
                .set(options)
                .from(stage.firstElementChild)
                .save();

            notify("Đã yêu cầu tải hóa đơn PDF.");
        } catch (error) {
            console.error("Lỗi xuất hóa đơn PDF:", error);

            notify(
                "Xuất PDF thất bại. Hãy thử In hóa đơn và chọn Lưu dưới dạng PDF.",
                true
            );
        } finally {
            stage?.remove();
            downloadButton.disabled = false;
            busy = false;
        }
    }

    downloadButton.addEventListener("click", downloadPDF);

    document.getElementById(
        "closeInvoiceModal"
    )?.addEventListener("click", () => notify(""));

    document.getElementById(
        "closeInvoiceModalFooter"
    )?.addEventListener("click", () => notify(""));
})();
