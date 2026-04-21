/**
 * Object Detection Engine using ML (TensorFlow + COCO-SSD)
 * Detects objects in camera feed and returns their locations and labels
 */
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export class ObjectDetector {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.detections = [];
  }

  /**
   * Initialize the COCO-SSD model
   */
  async initialize() {
    if (this.model) return this.model;
    
    this.isLoading = true;
    try {
      console.log('Loading COCO-SSD object detection model...');
      this.model = await cocoSsd.load();
      console.log('Object detection model loaded successfully');
      this.isLoading = false;
    } catch (error) {
      console.error('Failed to load object detection model:', error);
      this.isLoading = false;
      throw error;
    }
  }

  /**
   * Detect objects in a video/image
   * @param {HTMLVideoElement|HTMLCanvasElement} source - Video or canvas element
   * @returns {Array} Array of detected objects with {class, score, bbox}
   */
  async detect(source) {
    if (!this.model || this.isLoading) {
      return [];
    }

    try {
      const predictions = await this.model.estimateObjects(source);
      this.detections = predictions;
      return predictions;
    } catch (error) {
      console.error('Object detection error:', error);
      return [];
    }
  }

  /**
   * Get detections from last detection call
   */
  getDetections() {
    return this.detections;
  }

  /**
   * Find nearest object to a point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} - Nearest detected object or null
   */
  getNearestObject(x, y) {
    if (this.detections.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const detection of this.detections) {
      const [left, top, width, height] = detection.bbox;
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const distance = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = { ...detection, distance, centerX, centerY };
      }
    }

    return nearest;
  }

  /**
   * Check if a point is inside any detected object
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} - Detected object containing point or null
   */
  getObjectAtPoint(x, y) {
    if (this.detections.length === 0) return null;

    for (const detection of this.detections) {
      const [left, top, width, height] = detection.bbox;
      if (x >= left && x <= left + width && y >= top && y <= top + height) {
        return detection;
      }
    }

    return null;
  }

  /**
   * Get all objects of a specific class
   * @param {string} className - Class name to filter by
   * @returns {Array} - Detected objects matching the class
   */
  getObjectsByClass(className) {
    return this.detections.filter(d => d.class.toLowerCase() === className.toLowerCase());
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.model) {
      tf.disposeVariables();
    }
  }
}

/**
 * Renders bounding boxes and labels on canvas
 */
export class ObjectDetectionRenderer {
  static drawDetections(ctx, detections, scale = 1) {
    detections.forEach((detection) => {
      const [left, top, width, height] = detection.bbox;
      const score = Math.round(detection.score * 100);

      // Draw bounding box
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(left * scale, top * scale, width * scale, height * scale);

      // Draw label background
      const labelText = `${detection.class} (${score}%)`;
      ctx.font = '14px Arial';
      ctx.fillStyle = '#00ff00';
      const metrics = ctx.measureText(labelText);
      const labelHeight = 20;

      ctx.fillRect(
        left * scale,
        top * scale - labelHeight,
        metrics.width + 8,
        labelHeight
      );

      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.fillText(labelText, left * scale + 4, top * scale - 6);
    });
  }
}
