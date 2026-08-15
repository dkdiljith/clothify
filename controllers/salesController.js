const salesReportService = require("../services/salesService");

exports.salesReportRender = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const query = salesReportService.buildOrderQuery(startDate, endDate);
        const { orders, reportSummary, currentPage, totalPages } = await salesReportService.getSalesReportData(query, page, limit);

        return res.render("admin/salesReport", {
            admin: true,
            orders,
            summary: reportSummary,
            pagination: {
                page: currentPage,
                limit,
                totalPages,
                nextPage: currentPage + 1,
                prevPage: currentPage - 1,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
                serialNumberStart: (currentPage - 1) * limit,
            },
            startDate: startDate || "",
            endDate: endDate || "",
        });

    } catch (error) {
        return res.render("admin/salesReport", {
            admin: true,
            orders: [],
            summary: { totalOrders: 0, grossSales: 0, totalRefunds: 0, netRevenue: 0 },
            pagination: { page: 1, limit: 5, totalPages: 1, hasNextPage: false, hasPrevPage: false, serialNumberStart: 0 },
            startDate: "",
            endDate: "",
            errorMessage: "Error fetching sales report. Please try again later.",
        });
    }
};

exports.downloadSalesReportPdf = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const pdfBuffer = await salesReportService.generatePdfBuffer(startDate, endDate);

        res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=sales-report.pdf",
            "Content-Length": pdfBuffer.length,
        });
        return res.end(pdfBuffer);
    } catch (error) {
        return res.status(500).send("Failed to generate PDF");
    }
};

exports.downloadSalesReportExcel = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const workbook = await salesReportService.generateExcelWorkbook(startDate, endDate);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Clothify_Sales_Report.xlsx"
        );
        
        await workbook.xlsx.write(res);
        return res.end();
    } catch (error) {
        return res.status(500).send("Error generating report");
    }
};

exports.downloadSalesReportCsv = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const workbook = await salesReportService.generateCsvWorkbook(startDate, endDate);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Clothify_Sales_Report.csv"
        );

        await workbook.csv.write(res);
        return res.end();
    } catch (error) {
        return res.status(500).send("Error generating CSV report");
    }
};