/**
 * Web Worker for browser-side AI image analysis using Transformers.js
 * Runs entirely in the browser - no API calls, no server, no cost.
 * Models are downloaded from Hugging Face CDN and cached locally.
 */

// Static import is required here: a dynamic import() inside an ESM worker
// makes Vite split the worker bundle into chunks, which fails the production
// build (worker format "iife" does not support code-splitting).
import { pipeline as loadPipeline } from "@huggingface/transformers";

let pipeline: any = null;
let classifier: any = null;

// Model to use - lightweight ViT model that works well in browsers
const MODEL = "Xenova/vit-base-patch16-224";

async function loadModel() {
  if (classifier) return classifier;
  
  pipeline = loadPipeline;
  
  // Load the image classification model
  classifier = await pipeline("image-classification", MODEL, {
    device: "webgpu",  // Will fall back to WASM if WebGPU not available
    progress_callback: (progress: any) => {
      self.postMessage({
        type: "progress",
        status: "loading",
        progress: progress,
      });
    },
  });
  
  return classifier;
}

// Known property-related labels and their scores
// These map ImageNet labels to property features we can extract
const PROPERTY_LABEL_MAP: Record<string, { feature: string; type: string }> = {
  "palace": { feature: "luxury_finish", type: "luxury" },
  "castle": { feature: "luxury_finish", type: "luxury" },
  "lakeside": { feature: "has_water_view", type: "feature" },
  "seashore": { feature: "has_water_view", type: "feature" },
  "patio": { feature: "has_terrace", type: "feature" },
  "terrace": { feature: "has_terrace", type: "feature" },
  "fountain": { feature: "has_garden_feature", type: "feature" },
  "window": { feature: "modern_windows", type: "construction" },
  "library": { feature: "has_library", type: "feature" },
  "restaurant": { feature: "commercial", type: "usage" },
  "shop": { feature: "commercial", type: "usage" },
  "bakery": { feature: "commercial", type: "usage" },
  "office": { feature: "commercial", type: "usage" },
  "barn": { feature: "rural", type: "usage" },
  "farmhouse": { feature: "rural", type: "usage" },
  "mobile_home": { feature: "modular", type: "construction" },
  "apartment_building": { feature: "multi_unit", type: "construction" },
  "skyscraper": { feature: "high_rise", type: "construction" },
  "school_bus": { feature: "near_school", type: "location" },
  "traffic_light": { feature: "urban_area", type: "location" },
  "street_sign": { feature: "urban_area", type: "location" },
  "parking_meter": { feature: "urban_parking", type: "feature" },
  "construction_site": { feature: "ongoing_construction", type: "feature" },
};

// Quality estimation based on ImageNet label categories
const QUALITY_LABELS: Record<string, number> = {
  "palace": 0.95,
  "castle": 0.9,
  "manor": 0.85,
  "villa": 0.8,
  "bungalow": 0.7,
  "mobile_home": 0.4,
};

self.onmessage = async (event: MessageEvent) => {
  const { type, imageUrls } = event.data;
  
  if (type === "analyze") {
    try {
      self.postMessage({ type: "status", status: "loading_model" });
      
      const clf = await loadModel();
      
      self.postMessage({ type: "status", status: "analyzing" });
      
      const results: any[] = [];
      
      for (const url of imageUrls) {
        // Classify the image
        const predictions = await clf(url);
        
        // Extract top predictions
        const top5 = predictions.slice(0, 5);
        
        // Map predictions to property features
        const features: string[] = [];
        let qualityScore = 0.5; // Default medium quality
        let detectedScore = 0;
        
        for (const pred of top5) {
          const label = pred.label.toLowerCase().replace(/\s+/g, "_");
          const mapped = PROPERTY_LABEL_MAP[label];
          
          if (mapped) {
            features.push(mapped.feature);
          }
          
          // Check if this is a quality indicator
          for (const [qualityLabel, score] of Object.entries(QUALITY_LABELS)) {
            if (label.includes(qualityLabel)) {
              qualityScore = (qualityScore + score * pred.score) / (1 + 1);
              detectedScore += pred.score;
            }
          }
        }
        
        results.push({
          url,
          topPredictions: top5.map((p: any) => ({
            label: p.label,
            score: p.score,
          })),
          features,
          qualityScore,
          hasSignificantDetection: detectedScore > 0.3,
        });
      }
      
      // Aggregate results across all images
      const allFeatures = [...new Set(results.flatMap((r) => r.features))];
      const avgQuality = results.reduce((s, r) => s + r.qualityScore, 0) / Math.max(results.length, 1);
      const detectedCount = results.filter((r) => r.hasSignificantDetection).length;
      
      // Estimate property condition from images
      let imageBasedState: string;
      if (avgQuality > 0.8) imageBasedState = "luxe";
      else if (avgQuality > 0.65) imageBasedState = "excellent_etat";
      else if (avgQuality > 0.45) imageBasedState = "bon_etat";
      else imageBasedState = "a_renover";
      
      self.postMessage({
        type: "result",
        results,
        aggregated: {
          features: allFeatures,
          qualityScore: Math.round(avgQuality * 100) / 100,
          imageBasedState,
          imageCount: imageUrls.length,
          detectedCount,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // Check for WebGPU-related errors specifically
      const isWebGPUError = errorMessage.includes("WebGPU") || errorMessage.includes("webgpu");
      
      self.postMessage({
        type: "error",
        message: errorMessage,
        isWebGPUError,
        fallbackAvailable: true,
      });
    }
  }
};

export {};
