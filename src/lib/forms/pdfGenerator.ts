import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Renders an HTML element into a high-resolution A4 PDF File.
 * Smart pagination ensures smooth section-aware page breaks without cutting lines or elements.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  fileName: string
): Promise<File> {
  // Capture the element bounding rect before generating canvas to map sub-elements
  const elementRect = element.getBoundingClientRect();

  // Find candidate split elements (.pdf-section, [data-pdf-section], h2, h3, .border-b-2, fieldset, tr)
  const candidateElements = Array.from(
    element.querySelectorAll(
      ".pdf-section, [data-pdf-section], h2, h3, .border-b-2, fieldset, tr"
    )
  );

  const canvas = await html2canvas(element, {
    scale: 2, // High resolution for crystal-clear vector-like rendering
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
  });

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Conversion: 1mm in canvas pixels
  const pxPerMm = canvasWidth / 210;
  const pageHeightMm = 297;
  const maxPageHeightMm = 282; // Safe height leaving margin at bottom
  const minPageHeightMm = 170; // Don't break too early if not needed

  const maxPagePx = maxPageHeightMm * pxPerMm;
  const minPagePx = minPageHeightMm * pxPerMm;
  const fullPagePx = pageHeightMm * pxPerMm;

  // Map DOM relative Y to canvas pixels
  const relativeTops: number[] = [];
  const heightRatio = canvasHeight / elementRect.height;

  candidateElements.forEach((el) => {
    const elRect = el.getBoundingClientRect();
    const topPx = (elRect.top - elementRect.top) * heightRatio;
    if (topPx > 20 && topPx < canvasHeight - 20) {
      relativeTops.push(Math.round(topPx));
    }
  });

  // Sort unique candidate break points
  const sortedBreakPoints = Array.from(new Set(relativeTops)).sort(
    (a, b) => a - b
  );

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let currentTopPx = 0;
  let pageIndex = 0;

  while (currentTopPx < canvasHeight) {
    const remainingPx = canvasHeight - currentTopPx;

    let sliceHeightPx: number;

    if (remainingPx <= fullPagePx) {
      // Remaining content fits completely on the last page
      sliceHeightPx = remainingPx;
    } else {
      // Find candidate break points within the window [currentTopPx + minPagePx, currentTopPx + maxPagePx]
      const windowStart = currentTopPx + minPagePx;
      const windowEnd = currentTopPx + maxPagePx;

      const validBreakPoints = sortedBreakPoints.filter(
        (bp) => bp >= windowStart && bp <= windowEnd
      );

      if (validBreakPoints.length > 0) {
        // Choose the latest break point in the window to maximize page content
        const chosenBreakPoint = validBreakPoints[validBreakPoints.length - 1];
        sliceHeightPx = chosenBreakPoint - currentTopPx;
      } else {
        // Fallback: use maxPagePx if no section boundary found in window
        sliceHeightPx = Math.min(maxPagePx, remainingPx);
      }
    }

    // Create a temporary canvas for this specific page slice
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvasWidth;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, sliceHeightPx);
      ctx.drawImage(
        canvas,
        0,
        currentTopPx,
        canvasWidth,
        sliceHeightPx,
        0,
        0,
        canvasWidth,
        sliceHeightPx
      );
    }

    const sliceHeightMm = sliceHeightPx / pxPerMm;
    const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);

    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(pageImgData, "JPEG", 0, 0, 210, sliceHeightMm);

    currentTopPx += sliceHeightPx;
    pageIndex++;
  }

  const pdfBlob = pdf.output("blob");
  return new File([pdfBlob], fileName, { type: "application/pdf" });
}
