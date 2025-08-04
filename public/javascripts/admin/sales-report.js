document.addEventListener('DOMContentLoaded', function () {
    // Set default dates (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('startDate').valueAsDate = startDate;
    document.getElementById('endDate').valueAsDate = endDate;

    // Apply filter button click handler
    document.getElementById('applyFilter').addEventListener('click', function () {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            Swal.fire('Error', 'Please select both start and end dates', 'error');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            Swal.fire('Error', 'Start date cannot be after end date', 'error');
            return;
        }

        // Redirect with filter parameters
        window.location.href = `/admin/salesReport?startDate=${startDate}&endDate=${endDate}`;
    });

    // Export to PDF
    document.getElementById('exportPdf').addEventListener('click', exportToPdf);

    // Export to Excel
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);

    function exportToPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Get table data
        const table = document.getElementById('salesTable');
        const title = "Sales Report";
        const dateRange = `From ${document.getElementById('startDate').value} to ${document.getElementById('endDate').value}`;

        // Add title and date range
        doc.setFontSize(18);
        doc.text(title, 14, 15);
        doc.setFontSize(12);
        doc.text(dateRange, 14, 22);

        // Generate table
        doc.autoTable({
            html: table,
            startY: 30,
            styles: {
                fontSize: 8,
                cellPadding: 2,
                valign: 'middle'
            },
            headStyles: {
                fillColor: [78, 115, 223],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 45 },
                2: { cellWidth: 20 },
                3: { cellWidth: 30 },
                4: { cellWidth: 45 },
                5: { cellWidth: 20 },
                6: { cellWidth: 25 }
            }
        });

        // Save the PDF
        doc.save(`sales_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    function exportToExcel() {
        const table = document.getElementById('salesTable');
        const workbook = XLSX.utils.table_to_book(table);
        XLSX.writeFile(workbook, `sales_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
});