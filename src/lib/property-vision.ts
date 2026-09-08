/**
 * Property Vision Service
 * 
 * Manages the Web Worker that runs Transformers.js for browser-side
 * AI image analysis. No API keys needed - runs entirely in-browser.
 */

export interface ImageAnalysisResult {
  url: string;
  topPredictions: Array<{ label: string; score: number }>;
  features: string[];
  qualityScore: number;
  hasSignificantDetection: boolean;
}

export interface AggregatedAnalysis {
  features: string[];
  qualityScore: number;
  imageBasedState: string;
  imageCount: number;
  detectedCount: number;
}

export interface AnalysisProgress {
  status: "idle" | "loading_model" | "analyzing" | "complete" | "error";
  progress?: any;
  error?: string;
  results?: ImageAnalysisResult[];
  aggregated?: AggregatedAnalysis;
  isWebGPUError?: boolean;
}

type ProgressCallback = (progress: AnalysisProgress) => void;

export class PropertyVisionService {
  private worker: Worker | null = null;
  private onProgress: ProgressCallback | null = null;
  private isRunning = false;

  /**
   * Start analyzing property images using browser-side AI.
   * @param imageUrls Array of image URLs or data URLs to analyze
   * @param onProgress Callback for progress updates
   */
  async analyze(
    imageUrls: string[],
    onProgress: ProgressCallback,
  ): Promise<{ results: ImageAnalysisResult[]; aggregated: AggregatedAnalysis } | null> {
    if (this.isRunning) {
      console.warn("Analysis already in progress");
      return null;
    }

    if (imageUrls.length === 0) {
      onProgress({
        status: "complete",
        results: [],
        aggregated: {
          features: [],
          qualityScore: 0.5,
          imageBasedState: "bon_etat",
          imageCount: 0,
          detectedCount: 0,
        },
      });
      return null;
    }

    this.isRunning = true;
    this.onProgress = onProgress;

    try {
      // Create the Web Worker
      this.worker = new Worker(
        new URL("./property-vision.worker.ts", import.meta.url),
        { type: "module" },
      );

      return new Promise((resolve, reject) => {
        if (!this.worker) return reject("Worker not created");

        this.worker.onmessage = (event) => {
          const data = event.data;

          switch (data.type) {
            case "status":
              onProgress({ status: data.status });
              break;

            case "progress":
              onProgress({
                status: "loading_model",
                progress: data.progress,
              });
              break;

            case "result":
              onProgress({
                status: "complete",
                results: data.results,
                aggregated: data.aggregated,
              });
              this.isRunning = false;
              resolve({
                results: data.results,
                aggregated: data.aggregated,
              });
              break;

            case "error":
              onProgress({
                status: "error",
                error: data.message,
                isWebGPUError: data.isWebGPUError,
                aggregated: {
                  features: [],
                  qualityScore: 0.5,
                  imageBasedState: "bon_etat",
                  imageCount: imageUrls.length,
                  detectedCount: 0,
                },
              });
              this.isRunning = false;
              // Resolve with fallback (graceful degradation)
              resolve({
                results: [],
                aggregated: {
                  features: [],
                  qualityScore: 0.5,
                  imageBasedState: "bon_etat",
                  imageCount: imageUrls.length,
                  detectedCount: 0,
                },
              });
              break;
          }
        };

        this.worker.onerror = (error) => {
          onProgress({
            status: "error",
            error: error.message,
          });
          this.isRunning = false;
          reject(error);
        };

        // Start analysis
        this.worker.postMessage({
          type: "analyze",
          imageUrls,
        });
      });
    } catch (error) {
      this.isRunning = false;
      onProgress({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to start analysis",
      });
      return null;
    }
  }

  /**
   * Convert uploaded File objects to data URLs for the worker.
   */
  static async filesToDataUrls(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        urls.push(url);
      }
    }
    return urls;
  }

  /**
   * Cleanup the worker.
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isRunning = false;
  }
}

/**
 * Singleton instance
 */
let instance: PropertyVisionService | null = null;

export function getPropertyVisionService(): PropertyVisionService {
  if (!instance) {
    instance = new PropertyVisionService();
  }
  return instance;
}
