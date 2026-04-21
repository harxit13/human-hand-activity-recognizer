/**
 * Shape Recognition Engine
 * Analyzes drawn strokes and detects/auto-completes geometric shapes
 */

export class ShapeRecognizer {
  /**
   * Recognize a shape from drawn points
   * @param {Array} points - Array of {x, y} points
   * @returns {Object|null} - { type, points } or null if no shape detected
   */
  static recognize(points) {
    if (!points || points.length < 4) return null;

    // Try to detect different shapes
    const circle = ShapeRecognizer._detectCircle(points);
    if (circle) return circle;

    const rectangle = ShapeRecognizer._detectRectangle(points);
    if (rectangle) return rectangle;

    const triangle = ShapeRecognizer._detectTriangle(points);
    if (triangle) return triangle;

    const line = ShapeRecognizer._detectLine(points);
    if (line) return line;

    return null;
  }

  /**
   * Detect if points form a circle
   */
  static _detectCircle(points) {
    if (points.length < 8) return null;

    // Calculate center and radius using least squares fit
    const { centerX, centerY, radius, error } = ShapeRecognizer._fitCircle(points);

    // Check if it's a valid circle (low error relative to radius)
    if (error / radius < 0.15) {
      // Generate perfect circle points
      const perfectPoints = ShapeRecognizer._generateCirclePoints(centerX, centerY, radius);
      return { type: 'CIRCLE', points: perfectPoints, center: { x: centerX, y: centerY }, radius };
    }

    return null;
  }

  /**
   * Detect if points form a rectangle
   */
  static _detectRectangle(points) {
    if (points.length < 6) return null;

    // Get bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    points.forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    const width = maxX - minX;
    const height = maxY - minY;

    // Check if most points are near the rectangle edges
    let edgePoints = 0;
    const threshold = Math.max(width, height) * 0.1;

    points.forEach(p => {
      const distToEdge = Math.min(
        Math.abs(p.x - minX),
        Math.abs(p.x - maxX),
        Math.abs(p.y - minY),
        Math.abs(p.y - maxY)
      );
      if (distToEdge < threshold) edgePoints++;
    });

    if (edgePoints / points.length > 0.7) {
      // Generate perfect rectangle
      const perfectPoints = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
        { x: minX, y: minY }, // Close the shape
      ];
      return { type: 'RECTANGLE', points: perfectPoints };
    }

    return null;
  }

  /**
   * Detect if points form a triangle
   */
  static _detectTriangle(points) {
    if (points.length < 5) return null;

    // Find approximate vertices (corners with high curvature)
    const vertices = ShapeRecognizer._findVertices(points, 3);

    if (vertices.length >= 3) {
      // Refine to 3 vertices
      const top3 = vertices.slice(0, 3);

      // Generate perfect triangle
      const perfectPoints = [
        top3[0],
        top3[1],
        top3[2],
        top3[0], // Close the shape
      ];
      return { type: 'TRIANGLE', points: perfectPoints };
    }

    return null;
  }

  /**
   * Detect if points form a line
   */
  static _detectLine(points) {
    if (points.length < 3) return null;

    // Check if all points are approximately collinear
    const { error } = ShapeRecognizer._fitLine(points);
    
    // If error is small relative to line length
    const start = points[0];
    const end = points[points.length - 1];
    const lineLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    if (error / lineLength < 0.1) {
      return { type: 'LINE', points: [start, end] };
    }

    return null;
  }

  /**
   * Fit a circle to points using least squares
   */
  static _fitCircle(points) {
    let sumX = 0, sumY = 0;
    let sumX2 = 0, sumY2 = 0;
    let sumXY = 0;
    let sumX3 = 0, sumY3 = 0;
    let sumX2Y = 0, sumXY2 = 0;

    const n = points.length;

    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumX2 += p.x * p.x;
      sumY2 += p.y * p.y;
      sumXY += p.x * p.y;
      sumX3 += p.x * p.x * p.x;
      sumY3 += p.y * p.y * p.y;
      sumX2Y += p.x * p.x * p.y;
      sumXY2 += p.x * p.y * p.y;
    }

    const A = n * sumX2 - sumX * sumX;
    const B = n * sumXY - sumX * sumY;
    const C = n * sumY2 - sumY * sumY;
    const D = 0.5 * (n * (sumX3 + sumXY2) - sumX * (sumX2 + sumY2));
    const E = 0.5 * (n * (sumX2Y + sumY3) - sumY * (sumX2 + sumY2));

    const denom = A * C - B * B;
    if (Math.abs(denom) < 1e-6) {
      return { centerX: sumX / n, centerY: sumY / n, radius: 0, error: Infinity };
    }

    const centerX = (D * C - B * E) / denom;
    const centerY = (A * E - B * D) / denom;

    let sumError = 0;
    for (const p of points) {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      sumError += Math.abs(dist - Math.sqrt(
        Math.pow(points[0].x - centerX, 2) + Math.pow(points[0].y - centerY, 2)
      ));
    }

    const radius = Math.sqrt(
      Math.pow(points[0].x - centerX, 2) + Math.pow(points[0].y - centerY, 2)
    );
    const error = sumError / n;

    return { centerX, centerY, radius, error };
  }

  /**
   * Fit a line to points
   */
  static _fitLine(points) {
    let sumX = 0, sumY = 0;
    const n = points.length;

    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    let sumXX = 0, sumXY = 0, sumYY = 0;

    for (const p of points) {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      sumXX += dx * dx;
      sumXY += dx * dy;
      sumYY += dy * dy;
    }

    // Compute line through least squares
    const slope = (sumXY) / (sumXX || 1);
    const intercept = meanY - slope * meanX;

    let error = 0;
    for (const p of points) {
      const predicted = slope * p.x + intercept;
      error += Math.abs(p.y - predicted);
    }

    return { slope, intercept, error };
  }

  /**
   * Find vertices (corners) in a set of points
   */
  static _findVertices(points, count = 3) {
    if (points.length < 3) return [];

    const curvatures = [];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };

      const cross = Math.abs(v1.x * v2.y - v1.y * v2.x);
      const dot = Math.max(0.001, v1.x * v2.x + v1.y * v2.y);

      const curvature = cross / dot;
      curvatures.push({ index: i, point: curr, curvature });
    }

    // Sort by curvature (highest first) and take top vertices
    curvatures.sort((a, b) => b.curvature - a.curvature);
    return curvatures.slice(0, count).map(c => c.point);
  }

  /**
   * Generate perfect circle points
   */
  static _generateCirclePoints(centerX, centerY, radius, segments = 32) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }
    return points;
  }
}
