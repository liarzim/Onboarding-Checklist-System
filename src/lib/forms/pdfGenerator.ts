import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Renders an HTML element into a high-resolution A4 PDF File.
 * Handles multi-page pagination automatically.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  fileName: string
): Promise<File> {
  const canvas = await html2canvas(element, {
    scale: 2, // High resolution for crystal clear text
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const imgWidth = 210; // Standard A4 width in mm
  const pageHeight = 297; // Standard A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 5) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const pdfBlob = pdf.output("blob");
  return new File([pdfBlob], fileName, { type: "application/pdf" });
}
