document.addEventListener('DOMContentLoaded', () => { // Wait for the DOM to load
    const dateElements = document.querySelectorAll('[id^="createdAt-"]'); // Select all elements with IDs starting with "createdAt-"

    dateElements.forEach(element => {
        const isoDateString = element.textContent; // Get the ISODate string from the element
        if (isoDateString) {
            const jsDate = new Date(isoDateString); // Convert to JavaScript Date object
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = jsDate.toLocaleDateString(undefined, options);
            element.textContent = formattedDate; // Update the element's text with formatted date
        }
    });
  });