import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Download, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

const Receipt = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const reference = searchParams.get('reference');

  useEffect(() => {
    if (!reference) {
      navigate('/dashboard');
      return;
    }

    fetchReceiptData();
  }, [reference]);

  const fetchReceiptData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      const response = await fetch(`${API_BASE_URL}/subscriptions/receipt/${reference}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch receipt data');
      }

      const data = await response.json();
      setReceiptData(data);
    } catch (error) {
      console.error('Error fetching receipt:', error);
      toast({
        title: "Error",
        description: "Failed to load receipt. Redirecting to dashboard...",
        variant: "destructive",
      });
      setTimeout(() => navigate('/dashboard'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 300);
  };

  // Helper functions for formatting
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatAmount = (amount) => {
    // Amount is in NGN kobo, convert to USD
    const ngnAmount = amount / 100;
    const usdAmount = ngnAmount / 1500; // Exchange rate
    return `$${usdAmount.toFixed(2)}`;
  };

  // Generate PDF matching the receipt UI design
  const generatePDF = async (isInvoice = false) => {
    if (!receiptData) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const cardWidth = pageWidth - (margin * 2);
    const cardX = margin;
    let yPos = margin;

    // Helper function to load and add image (for logo)
    const addImageToPDF = (src, x, y, width, height) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            doc.addImage(img, 'PNG', x, y, width, height);
            resolve(true);
          } catch (error) {
            console.warn('Could not add image to PDF:', error);
            resolve(false);
          }
        };
        
        img.onerror = () => {
          console.warn('Could not load image:', src);
          resolve(false);
        };
        
        img.src = src;
        
        // Timeout after 2 seconds
        setTimeout(() => resolve(false), 2000);
      });
    };

    // Draw white card background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, yPos, cardWidth, 180, 3, 3, 'F');

    // Add logo (top left) - try to add it, but continue if it fails
    const logoY = yPos + 8;
    const logoAdded = await addImageToPDF('/images/logo-black-text.png', cardX + 10, logoY, 35, 8.75);
    
    // If logo didn't load, add text logo
    if (!logoAdded) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text('SneakLink', cardX + 10, logoY + 6);
    }

    yPos += 25;

    // Header with icon and "Invoice paid" text
    doc.setFillColor(243, 244, 246); // gray-100
    doc.roundedRect(cardX + 10, yPos, 12, 12, 2, 2, 'F');
    
    // Checkmark circle (green)
    doc.setFillColor(16, 185, 129); // green-500
    doc.circle(cardX + 16, yPos + 6, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.text('✓', cardX + 16, yPos + 7.5, { align: 'center' });

    // "Invoice paid" text
    doc.setTextColor(17, 24, 39); // gray-900
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice paid', cardX + 27, yPos + 8);

    yPos += 30;

    // Amount (large)
    const amount = formatAmount(receiptData.amount);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text(amount, cardX + 10, yPos);

    yPos += 20;

    // Invoice number, date, payment method section
    yPos += 10;

    // Invoice number
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFont('helvetica', 'normal');
    doc.text('Invoice number', cardX + 10, yPos);
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39); // gray-900
    doc.setFont('helvetica', 'medium');
    doc.text(receiptData.invoiceNumber, cardX + 10, yPos + 7);

    // Payment date
    const formattedDate = formatDate(receiptData.paymentDate);
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment date', cardX + 100, yPos);
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'medium');
    doc.text(formattedDate, cardX + 100, yPos + 7);

    yPos += 20;

    // Payment method
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment method', cardX + 10, yPos);
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'medium');
    doc.text(receiptData.paymentMethod, cardX + 10, yPos + 7);

    yPos += 20;

    // Divider line
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setLineWidth(0.5);
    doc.line(cardX + 10, yPos, cardX + cardWidth - 10, yPos);

    yPos += 15;

    // Additional info for invoice
    if (isInvoice) {
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text(`Customer: ${receiptData.customerName}`, cardX + 10, yPos);
      yPos += 6;
      doc.text(`Email: ${receiptData.customerEmail}`, cardX + 10, yPos);
      yPos += 6;
      doc.text(`Plan: ${receiptData.plan.charAt(0).toUpperCase() + receiptData.plan.slice(1)} Plan`, cardX + 10, yPos);
      yPos += 6;
      doc.text(`Billing: ${receiptData.billingCycle.charAt(0).toUpperCase() + receiptData.billingCycle.slice(1)}`, cardX + 10, yPos);
      yPos += 6;
      doc.text(`Transaction ID: ${receiptData.transactionId || receiptData.reference}`, cardX + 10, yPos);
      yPos += 10;
    }

    // Footer - Powered by Paystack
    const footerY = pageHeight - 30;
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.setFont('helvetica', 'normal');
    doc.text('Powered by Paystack', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Terms | Privacy', pageWidth / 2, footerY + 5, { align: 'center' });

    // Save PDF
    const filename = isInvoice 
      ? `invoice-${receiptData.invoiceNumber}.pdf`
      : `receipt-${receiptData.invoiceNumber}.pdf`;
    doc.save(filename);
  };

  const downloadInvoice = async () => {
    if (!receiptData) return;
    
    setDownloadingInvoice(true);
    try {
      // Generate PDF client-side
      await generatePDF(true);
      
      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const downloadReceipt = async () => {
    if (!receiptData) return;
    
    setDownloadingReceipt(true);
    try {
      // Generate PDF client-side
      await generatePDF(false);
      
      toast({
        title: "Success",
        description: "Receipt downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate receipt PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Auto-redirect after 30 seconds if user doesn't interact
  useEffect(() => {
    if (!receiptData) return;
    
    const timer = setTimeout(() => {
      handleClose();
    }, 30000);

    return () => clearTimeout(timer);
  }, [receiptData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading receipt...</div>
      </div>
    );
  }

  if (!receiptData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative p-4">
      {/* Logo in top left */}
      <div className="absolute top-8 left-8 flex items-center gap-2 z-10">
        <img 
          src="/images/logo-white-text.png" 
          alt="SneakLink Logo" 
          className="h-8"
        />
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-8 right-8 text-white/70 hover:text-white transition-colors z-10"
        aria-label="Close receipt"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Receipt Card */}
      <div 
        className={cn(
          "bg-white rounded-lg p-8 max-w-md w-full shadow-2xl transition-all duration-300 relative",
          isClosing && "opacity-0 scale-95"
        )}
      >
        {/* Success Icon with checkmark */}
        <div className="flex items-center gap-3 mb-6 relative">
          <div className="relative w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-gray-600" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Invoice paid</h1>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <p className="text-5xl font-bold text-gray-900">{formatAmount(receiptData.amount)}</p>
        </div>

        {/* View Details Link */}
        <div className="mb-8">
          <button 
            onClick={() => {
              // Scroll to payment details section or expand
            }}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            View invoice and payment details &gt;
          </button>
        </div>

        {/* Payment Information - Two Columns */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 pb-6 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-500 mb-2">Invoice number</p>
            <p className="text-sm font-medium text-gray-900">{receiptData.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Payment date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(receiptData.paymentDate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Payment method</p>
            <p className="text-sm font-medium text-gray-900">{receiptData.paymentMethod}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={downloadInvoice}
            disabled={downloadingInvoice}
            variant="outline"
            className="flex-1 border-gray-300 text-gray-900 hover:bg-gray-50"
          >
            {downloadingInvoice ? (
              <Download className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download invoice
          </Button>
          <Button
            onClick={downloadReceipt}
            disabled={downloadingReceipt}
            className="flex-1 bg-black text-white hover:bg-gray-900"
          >
            {downloadingReceipt ? (
              <Download className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download receipt
          </Button>
        </div>
      </div>

      {/* Powered by Paystack */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-xs text-white/60 mb-2">Powered by Paystack</p>
        <div className="flex gap-4 justify-center text-xs">
          <a href="/terms" className="text-white/60 hover:text-white/80">Terms</a>
          <a href="/privacy" className="text-white/60 hover:text-white/80">Privacy</a>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
