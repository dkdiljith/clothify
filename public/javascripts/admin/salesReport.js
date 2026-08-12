document.addEventListener('DOMContentLoaded', function () {

    // Set default dates (last 30 days)
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');

    if (!startInput.value || !endInput.value) {

        const endDate = new Date();
        const startDate = new Date();

        startDate.setDate(startDate.getDate() - 30);

        startInput.valueAsDate = startDate;
        endInput.valueAsDate = endDate;
    }

    // Apply filter button click handler
    document.getElementById('applyFilter').addEventListener('click', function () {

        const startDate = startInput.value;
        const endDate = endInput.value;

        if (!startDate || !endDate) {
            showPopupMessage('Please select both start and end dates' , `error`)
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
             showPopupMessage('Start date cannot be after end date' , `error`)
            return;
        }

        // Redirect with filter parameters
        window.location.href =
            `/admin/salesReport?startDate=${startDate}&endDate=${endDate}`;
    });

    // Export PDF 
    document.getElementById('exportPdf').addEventListener('click', () => {

        const startDate = startInput.value;
        const endDate = endInput.value;

        window.location.href =
            `/admin/salesReport/pdf?startDate=${startDate}&endDate=${endDate}`;
    });

    // Export Excel
    document.getElementById('exportExcel').addEventListener('click', () => {

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        window.location.href =
            `/admin/salesReport/excel?startDate=${startDate}&endDate=${endDate}`;
    });

     // Export CSV
    document.getElementById('exportCsv').addEventListener('click', () => {

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        window.location.href =
            `/admin/salesReport/csv?startDate=${startDate}&endDate=${endDate}`;
    });
});