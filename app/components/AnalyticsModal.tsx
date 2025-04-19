import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PropertyAnalytics from './PropertyAnalytics';
import { Transaction } from '@/app/services/hdbData';
import { useClickOutside } from '@/app/hooks/useClickOutside';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  streetName: string;
  flatType?: string;
}

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  streetName,
  flatType
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Use the click outside hook
  useClickOutside(modalRef, onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-xl w-[95vw] max-w-6xl max-h-[90vh] m-4 flex flex-col shadow-xl"
      >
        <div className="flex justify-between items-center p-6 sticky top-0 bg-white dark:bg-gray-900 z-10 border-b rounded-t-xl">
          <div>
            <h2 className="text-xl font-semibold">Property Market Analytics</h2>
            <p className="text-sm text-gray-500">
              Comprehensive analysis of property transactions in your area
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <PropertyAnalytics 
            transactions={transactions}
            streetName={streetName}
            flatType={flatType}
          />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal; 