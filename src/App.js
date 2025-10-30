import React, { useState, useRef, useCallback } from 'react';
import { Image, Upload, Download, Package, Check } from 'lucide-react';

function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSize, setSelectedSize] = useState(600);
  const [selectedFormat, setSelectedFormat] = useState('PNG');
  const [threshold, setThreshold] = useState(128);
  const fileInputRef = useRef(null);

  const sizes = [
    { label: '300px', value: 300 },
    { label: '600px', value: 600 },
    { label: '1200px', value: 1200 }
  ];
  const formats = ['PNG', 'SVG'];

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processImage = useCallback((imageSrc, thresholdValue) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Process pixels: convert white background to transparent, darken lines
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate brightness
        const brightness = (r + g + b) / 3;

        // If pixel is brighter than threshold, make it transparent
        if (brightness > thresholdValue) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        } else {
          // Make lines black
          data[i] = 0;     // R
          data[i + 1] = 0; // G
          data[i + 2] = 0; // B
          data[i + 3] = 255; // Full opacity
        }
      }

      // Put processed data back
      ctx.putImageData(imageData, 0, 0);

      // Convert to data URL and store
      setProcessedImage(canvas.toDataURL('image/png'));
    };
    img.src = imageSrc;
  }, []);

  const handleFile = useCallback((file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        processImage(e.target.result, threshold);
      };
      reader.readAsDataURL(file);
    }
  }, [threshold, processImage]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  // Re-process image when threshold changes
  const handleThresholdChange = (e) => {
    const newThreshold = parseInt(e.target.value);
    setThreshold(newThreshold);
    if (uploadedImage) {
      processImage(uploadedImage, newThreshold);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const resizeImage = (imageSrc, targetWidth) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const aspectRatio = img.height / img.width;
        const targetHeight = targetWidth * aspectRatio;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageSrc;
    });
  };

  const convertToSVG = (imageSrc, targetWidth) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const aspectRatio = img.height / img.width;
        const targetHeight = targetWidth * aspectRatio;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Create SVG with embedded image
        const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}">
  <image width="${targetWidth}" height="${targetHeight}" xlink:href="${canvas.toDataURL('image/png')}"/>
</svg>`;

        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        resolve(url);
      };
      img.src = imageSrc;
    });
  };

  const handleDownload = async () => {
    if (!processedImage) return;

    let downloadUrl;
    let filename;

    if (selectedFormat === 'PNG') {
      const resizedImage = await resizeImage(processedImage, selectedSize);
      downloadUrl = resizedImage;
      filename = `sketch-${selectedSize}px.png`;
    } else if (selectedFormat === 'SVG') {
      downloadUrl = await convertToSVG(processedImage, selectedSize);
      filename = `sketch-${selectedSize}px.svg`;
    }

    // Create download link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up SVG blob URL
    if (selectedFormat === 'SVG') {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
    }
  };

  const handleBatchExport = async () => {
    if (!processedImage) return;

    for (const size of sizes) {
      if (selectedFormat === 'PNG') {
        const resizedImage = await resizeImage(processedImage, size.value);
        const link = document.createElement('a');
        link.href = resizedImage;
        link.download = `sketch-${size.value}px.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      } else if (selectedFormat === 'SVG') {
        const svgUrl = await convertToSVG(processedImage, size.value);
        const link = document.createElement('a');
        link.href = svgUrl;
        link.download = `sketch-${size.value}px.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up and delay
        setTimeout(() => URL.revokeObjectURL(svgUrl), 100);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  const checkeredBg = {
    backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
    backgroundSize: '10px 10px',
    backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image className="w-12 h-12 text-gray-700" />
          </div>
          <h1 className="text-2xl font-medium text-gray-900 mb-2">
            Sketch to PNG Converter
          </h1>
          <p className="text-sm text-gray-600">
            Upload your sketch and export in various sizes and formats
          </p>
        </div>

        {/* Full Width Drop Zone */}
        <div className="mb-8">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 bg-white ${
              isDragging
                ? 'border-gray-400 bg-gray-100'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <Upload className="w-8 h-8 text-gray-400 mb-4" />
              <p className="text-sm text-gray-700 mb-2">
                Drag and drop your image here
              </p>
              <p className="text-xs text-gray-500 mb-4">or</p>
              <button
                onClick={handleUploadClick}
                className="bg-gray-900 text-white px-6 py-2 rounded-xl hover:bg-gray-800 transition-colors duration-200"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Two Column Layout - Preview and Settings */}
        {uploadedImage && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Preview Section */}
            <div className="space-y-6">
              {/* Original Preview */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Original</h3>
                <div
                  className="bg-gray-100 rounded-lg p-4"
                  style={checkeredBg}
                >
                  <img
                    src={uploadedImage}
                    alt="Original"
                    className="max-w-full h-auto mx-auto"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
              </div>

              {/* Processed Preview */}
              {processedImage && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Processed (Transparent Background)</h3>
                  <div
                    className="bg-gray-100 rounded-lg p-4"
                    style={checkeredBg}
                  >
                    <img
                      src={processedImage}
                      alt="Processed"
                      className="max-w-full h-auto mx-auto"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Export Settings */}
            <div className="space-y-6">
              {/* Threshold Slider */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-medium mb-4 text-gray-900">Threshold</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Adjust to get clean lines</span>
                    <span className="font-medium text-gray-900">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={threshold}
                    onChange={handleThresholdChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(threshold / 255) * 100}%, #e5e7eb ${(threshold / 255) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>More detail</span>
                    <span>Cleaner lines</span>
                  </div>
                </div>
              </div>

            {/* Size Options */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-medium mb-4 text-gray-900">Export Size</h2>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setSelectedSize(size.value)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200 ${
                      selectedSize === size.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Options */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-medium mb-4 text-gray-900">Format</h2>
              <div className="flex flex-wrap gap-2">
                {formats.map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200 ${
                      selectedFormat === format
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-medium mb-4 text-gray-900">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  disabled={!processedImage}
                  className="w-full flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </button>
                <button
                  onClick={handleBatchExport}
                  disabled={!processedImage}
                  className="w-full flex items-center justify-center bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Batch Export All Sizes
                </button>
              </div>
            </div>

            {/* Current Settings Display */}
            {processedImage && (
              <div className="bg-gray-100 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Current Settings</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    Size: {selectedSize}px wide
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    Format: {selectedFormat}
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    Background: Transparent
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    Threshold: {threshold}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
