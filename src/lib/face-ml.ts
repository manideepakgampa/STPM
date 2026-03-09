// face-ml.ts
// Browser face recognition engine using face-api.js (FaceNet-based 128-dim embeddings)

import * as faceapi from "face-api.js";

export type FaceDescriptor = Float32Array;

const MODEL_URL = "/models";

class FaceMLEngine {
  private initPromise: Promise<void> | null = null;
  private initialized = false;

  public THRESHOLD = 0.6; // Euclidean distance threshold for face-api.js 128-dim embeddings

  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);
      this.initialized = true;
    })();

    return this.initPromise;
  }

  get isReady() {
    return this.initialized;
  }

  /**
   * Extract a 128-dimensional face descriptor from a video or canvas element.
   */
  async getDescriptor(
    source: HTMLVideoElement | HTMLCanvasElement
  ): Promise<FaceDescriptor | null> {
    const detection = await faceapi
      .detectSingleFace(source, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;

    return detection.descriptor;
  }

  /**
   * Euclidean distance between two descriptors
   */
  distance(a: FaceDescriptor, b: FaceDescriptor): number {
    return faceapi.euclideanDistance(Array.from(a), Array.from(b));
  }

  /**
   * Cosine similarity between two descriptors
   */
  cosineSimilarity(a: FaceDescriptor, b: FaceDescriptor): number {
    let dot = 0,
      magA = 0,
      magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Verify two face descriptors and return match result
   */
  verify(a: FaceDescriptor, b: FaceDescriptor) {
    const dist = this.distance(a, b);
    const similarity = this.cosineSimilarity(a, b);
    const match = dist < this.THRESHOLD;
    const confidence = Math.max(
      0,
      Math.round((1 - dist / (this.THRESHOLD * 2)) * 100)
    );

    return { match, distance: dist, similarity, confidence };
  }

  /**
   * Full pipeline: detect face in video, extract descriptor, compare with stored.
   */
  async matchFace(
    video: HTMLVideoElement,
    storedDescriptor: FaceDescriptor
  ): Promise<{
    isMatch: boolean;
    confidence: number;
    distance: number;
    noFace: boolean;
  }> {
    const liveDescriptor = await this.getDescriptor(video);

    if (!liveDescriptor) {
      return { isMatch: false, confidence: 0, distance: Infinity, noFace: true };
    }

    const result = this.verify(liveDescriptor, storedDescriptor);
    return {
      isMatch: result.match,
      confidence: result.confidence,
      distance: result.distance,
      noFace: false,
    };
  }

  /**
   * Average multiple descriptors for more robust enrollment
   */
  average(descriptors: FaceDescriptor[]): FaceDescriptor {
    const len = descriptors[0].length;
    const avg = new Float32Array(len);
    for (const desc of descriptors) {
      for (let i = 0; i < len; i++) avg[i] += desc[i];
    }
    for (let i = 0; i < len; i++) avg[i] /= descriptors.length;
    return avg;
  }
}

export const FaceML = new FaceMLEngine();
