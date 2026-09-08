import { useRef, useCallback, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface UsePdfExportOptions {
  filename?: string;
  scale?: number;
  quality?: number;
  margin?: number;
}

interface PdfExportResult {
  generatePdf: (elementRef: React.RefObject<HTMLDivElement | null>) => Promise<void>;
  isExporting: boolean;
  exportProgress: string;
}

export function usePdfExport(options: UsePdfExportOptions = {}): PdfExportResult {
  const {
    filename = "estimation-report.pdf",
    scale = 2,
    quality = 1,
    margin = 10,
  } = options;

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const generatePdf = useCallback(async (elementRef: React.RefObject<HTMLDivElement | null>): Promise<void> => {
    const el = elementRef.current;
    if (!el) {
      console.error("Element ref is not available");
      return;
    }

    setIsExporting(true);
    setExportProgress("Préparation du document...");

    try {
      // Get the full report content area (exclude toolbar)
      const reportContent = el.querySelector(".report-content") as HTMLElement || el;

      // Temporarily add print class for PDF capture
      document.body.classList.add("pdf-capture");

      setExportProgress("Capture du contenu...");

      const canvas = await html2canvas(reportContent, {
        scale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (doc) => {
          // Ensure all elements are visible in the cloned document
          doc.querySelectorAll('[hidden], [data-state="inactive"]').forEach((el) => {
            if (el.getAttribute("data-state") === "inactive") {
              (el as HTMLElement).style.display = "block";
              (el as HTMLElement).style.opacity = "1";
              (el as HTMLElement).style.visibility = "visible";
            }
          });
        },
      });

      document.body.classList.remove("pdf-capture");

      setExportProgress("Génération du PDF...");

      const imgData = canvas.toDataURL("image/jpeg", quality);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate PDF dimensions
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

      // Use portrait A4
      const orientation = pdfHeight > pdfWidth ? "portrait" : "landscape";
      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: "a4",
      });

      const pdfW = orientation === "portrait" ? 210 : 297;
      const pdfH = orientation === "portrait" ? 297 : 210;

      // Calculate how many pages we need
      const pageHeight = pdfH - margin * 2;
      const ratio = pdfW / imgWidth;
      const scaledHeight = imgHeight * ratio;
      let heightLeft = scaledHeight;
      let position = margin;

      // First page
      pdf.addImage(imgData, "JPEG", margin, position, pdfW - margin * 2, scaledHeight);
      heightLeft -= pageHeight;

      // Additional pages if content overflows
      while (heightLeft > 0) {
        position = margin - (scaledHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, position, pdfW - margin * 2, scaledHeight);
        heightLeft -= pageHeight;
      }

      // Add metadata
      pdf.setProperties({
        title: "Rapport d'estimation immobilière - baticost AI",
        subject: "Estimation de valeur immobilière",
        author: "baticost AI",
        keywords: "estimation, immobilier, tunisie, rapport",
        creator: "baticost AI",
      });

      setExportProgress("Téléchargement...");

      // Save the PDF
      pdf.save(filename);

      setExportProgress("");
      setIsExporting(false);

    } catch (error) {
      console.error("PDF generation error:", error);
      document.body.classList.remove("pdf-capture");
      setExportProgress("");
      setIsExporting(false);
      throw error;
    }
  }, [filename, scale, quality, margin]);

  return { generatePdf, isExporting, exportProgress };
}
