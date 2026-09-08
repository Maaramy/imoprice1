import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

/**
 * Génère un PDF à partir d'un HTML et propose le partage natif.
 * Retourne l'URI du fichier généré (null si échec).
 */
export async function exportPdf(html: string, filename: string): Promise<string | null> {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    const dest = FileSystem.documentDirectory + filename;
    if (uri !== dest) {
      await FileSystem.copyAsync({ from: uri, to: dest }).catch(() => {
        // si la copie échoue, on garde l'URI temporaire
      });
    }
    return dest ?? uri;
  } catch (e) {
    console.warn("[pdf] échec export:", e);
    return null;
  }
}

/** Ouvre la feuille de partage Android (PDF, images, texte…). */
export async function shareFile(uri: string, mimeType = "application/pdf"): Promise<void> {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType, dialogTitle: "Partager le rapport" });
    }
  } catch (e) {
    console.warn("[share] échec:", e);
  }
}

export async function exportAndShare(html: string, filename: string): Promise<boolean> {
  const uri = await exportPdf(html, filename);
  if (!uri) return false;
  await shareFile(uri);
  return true;
}
