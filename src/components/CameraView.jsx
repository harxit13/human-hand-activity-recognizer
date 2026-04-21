import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { HandTracker } from '../modules/handTracking';

const CameraView = forwardRef(({ onResults }, ref) => {
  const videoRef = useRef(null);
  const trackerRef = useRef(null);

  // Expose videoRef to parent
  useImperativeHandle(ref, () => videoRef.current);

  useEffect(() => {
    const video = videoRef.current;

    const startCamera = async () => {
      try {
        console.log('Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });
        console.log('Camera stream obtained:', stream.getTracks());
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded, starting playback and tracking');
          video.play();
          startTracking();
        };
      } catch (err) {
        console.error('Error accessing camera:', err.name, err.message);
        alert(`Camera error: ${err.name}. Make sure to grant camera permissions.`);
      }
    };

    const startTracking = () => {
      try {
        trackerRef.current = new HandTracker(onResults);
        console.log('Hand tracker initialized');
        
        let frameCount = 0;
        const processFrame = async () => {
          if (video.readyState === 4) {
            frameCount++;
            if (frameCount % 30 === 0) console.log('Processing frames...', frameCount);
            await trackerRef.current.send(video);
          }
          requestAnimationFrame(processFrame);
        };
        
        processFrame();
      } catch (err) {
        console.error('Error initializing hand tracker:', err.message);
        alert(`Tracker error: ${err.message}`);
      }
    };

    startCamera();

    return () => {
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [onResults]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      zIndex: -1,
      backgroundColor: '#000',
    }}>
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)', // Mirror effect
          filter: 'brightness(1)', // Clear camera view
        }}
        playsInline
      />
    </div>
  );
});

CameraView.displayName = 'CameraView';

export default CameraView;
