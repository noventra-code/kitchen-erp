import React from 'react';

const ProcessingModal = ({ isOpen, progress, stage, onClose }) => {
  if (!isOpen) return null;

  const getStageText = (stage) => {
    switch (stage) {
      case 'uploading': return 'Uploading file...';
      case 'recognizing': return 'Processing with OCR...';
      case 'parsing': return 'Parsing invoice data...';
      case 'complete': return 'Processing complete!';
      default: return 'Processing...';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-4">Processing Invoice</h3>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          {/* Percentage */}
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {Math.round(progress)}%
          </div>
          
          {/* Stage Text */}
          <p className="text-gray-600 mb-4">{getStageText(stage)}</p>
          
          {/* Loading Spinner for active processing */}
          {stage !== 'complete' && (
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          )}
          
          {/* Close button - only show when complete */}
          {stage === 'complete' && (
            <button
              onClick={onClose}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessingModal;
