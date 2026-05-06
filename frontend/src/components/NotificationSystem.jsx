import React, { useState, useEffect } from 'react';

// Custom hook for ribbon notifications
export const useNotification = () => {
  const [notification, setNotification] = useState(null);
  
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return [notification, setNotification];
};

// Custom hook for modal dialogs
export const useModal = () => {
  const [modal, setModal] = useState({ show: false, type: 'error', message: '', onConfirm: null });
  
  const showError = (message) => {
    setModal({ show: true, type: 'error', message, onConfirm: null });
  };

  const showConfirm = (message, onConfirm) => {
    setModal({ show: true, type: 'confirm', message, onConfirm });
  };

  const closeModal = () => {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    setModal({ show: false, type: 'error', message: '', onConfirm: null });
  };

  const hideModal = () => {
    setModal({ show: false, type: 'error', message: '', onConfirm: null });
  };

  return { modal, showError, showConfirm, closeModal, hideModal, setModal };
};

// Ribbon Notification Component
export const RibbonNotification = ({ notification, onClose }) => {
  if (!notification) return null;
  
  return (
    <div className={`fixed top-4 right-4 z-60 p-3 rounded-lg shadow-lg flex items-center justify-between max-w-md ${
      notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}>
      <div className="flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
        <span className="font-medium">{notification.message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-white hover:text-gray-200 ml-2"
      >
        ✕
      </button>
    </div>
  );
};

// Modal Component
export const Modal = ({ modal, onClose, onCancel }) => {
  if (!modal.show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center mb-4">
          {modal.type === 'error' ? (
            <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <h3 className="text-lg font-semibold text-gray-900">
            {modal.type === 'error' ? 'Error' : 'Confirm'}
          </h3>
        </div>
        <p className="text-gray-700 mb-6">{modal.message}</p>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {modal.type === 'confirm' ? 'Cancel' : 'Close'}
          </button>
          {modal.type === 'confirm' && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Confirm
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
