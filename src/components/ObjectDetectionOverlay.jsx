import React, { useRef, useEffect, useState } from 'react';
import { ObjectDetector, ObjectDetectionRenderer } from '../modules/objectDetector';

const ObjectDetectionOverlay = ({ videoRef }) => {
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const [detections, setDetections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeDetector = async () => {
      try {
        detectorRef.current = new ObjectDetector();
        await detectorRef.current.initialize();
        setIsLoading(false);
        console.log('Object detector initialized');
      } catch (error) {
        console.error('Failed to initialize object detector:', error);
        setIsLoading(false);
      }
    };

    initializeDetector();

    return () => {
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef?.current || !canvasRef?.current || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    // Set canvas size to match video
    const updateCanvasSize = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };

    updateCanvasSize();

    let frameCount = 0;
    let detectionInterval = null;

    const detectObjects = async () => {
      if (video.readyState !== 4) {
        requestAnimationFrame(detectObjects);
        return;
      }

      frameCount++;

      // Run detection every 5 frames for performance
      if (frameCount % 5 === 0) {
        try {
          const newDetections = await detectorRef.current.detect(video);
          setDetections(newDetections);
        } catch (error) {
          console.error('Detection error:', error);
        }
      }

      // Clear and redraw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw detections
      if (detections.length > 0) {
        ObjectDetectionRenderer.drawDetections(ctx, detections);
      }

      requestAnimationFrame(detectObjects);
    };

    window.addEventListener('resize', updateCanvasSize);
    const animId = requestAnimationFrame(detectObjects);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      cancelAnimationFrame(animId);
      if (detectionInterval) clearInterval(detectionInterval);
    };
  }, [videoRef, isLoading, detections]);

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff00',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        zIndex: 99,
        textAlign: 'center',
      }}>
        <p>Loading Object Detection Model...</p>
        <p style={{ fontSize: '12px', marginTop: '10px' }}>This may take 10-30 seconds on first load</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 5,
        pointerEvents: 'none',
      }}
    />
  );
};

export default ObjectDetectionOverlay;
