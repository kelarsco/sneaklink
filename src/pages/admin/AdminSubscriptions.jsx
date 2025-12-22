import { useState, useEffect } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { 
  CreditCard, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Calendar as CalendarIcon,
  Download,
  Filter,
  Loader2,
  Coins,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getAdminSubscriptions, getAdminDisputes, getSubscriptionTransaction, refundSubscription } from "@/services/api";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";


// Exchange rate: 1 USD = 1500 NGN (update as needed)
const USD_TO_NGN_RATE = 1500;

export default function AdminSubscriptions() {
  const { toast: toastNotification } = useToast();
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDisputes, setLoadingDisputes] = useState(true);
  const [currency, setCurrency] = useState('NGN'); // Default to NGN
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [loadingTransaction, setLoadingTransaction] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundData, setRefundData] = useState({
    amount: '',
    customerNote: '',
    merchantNote: '',
  });
  const [processingRefund, setProcessingRefund] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSubscribers: 0,
    mrr: 0,
    planBreakdown: {},
  });

  // Convert amount based on selected currency
  // Note: Amounts from API are in kobo (NGN cents), so divide by 100 to get NGN
  const convertAmount = (amountInKobo) => {
    const amountInNGN = amountInKobo / 100; // Convert kobo to NGN
    if (currency === 'USD') {
      return amountInNGN / USD_TO_NGN_RATE;
    }
    return amountInNGN;
  };

  // Format currency
  const formatCurrency = (amount) => {
    const converted = convertAmount(amount);
    if (currency === 'USD') {
      return `$${converted.toFixed(2)}`;
    }
    return `₦${converted.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Show toast notification if staff member doesn't have access
  useEffect(() => {
    if (!hasPermission('subscriptions.view')) {
      toastNotification({
        title: "Limited Access",
        description: "You don't have permission to view subscriptions. Please contact an administrator for access.",
        variant: "default",
      });
    }
  }, [toastNotification]);

  // Fetch subscriptions data
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const params = {
          status: 'all', // Get all statuses
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        };
        
        const data = await getAdminSubscriptions(params);
        
        if (data.permissionError) {
          toast.info("You don't have permission to view subscriptions. Some features may be limited.");
          setSubscriptions([]);
          setStats({
            totalRevenue: 0,
            totalSubscribers: 0,
            mrr: 0,
            planBreakdown: {},
          });
        } else {
          setSubscriptions(data.subscriptions || []);
          setStats(data.stats || {
            totalRevenue: 0,
            totalSubscribers: 0,
            mrr: 0,
            planBreakdown: {},
          });
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        toast.error(error.message || 'Failed to load subscriptions');
        setSubscriptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
    
    // Refresh subscriptions every 30 seconds to catch new subscriptions
    const refreshInterval = setInterval(fetchSubscriptions, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [dateFrom, dateTo]);

  // Use stats from API
  const { totalRevenue, totalSubscribers, mrr, planBreakdown } = stats;

  // Fetch disputes data
  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        setLoadingDisputes(true);
        const params = {
          status: 'all',
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        };
        
        const data = await getAdminDisputes(params);
        
        if (data.permissionError) {
          setDisputes([]);
        } else {
          setDisputes(data.disputes || []);
        }
      } catch (error) {
        console.error('Error fetching disputes:', error);
        toast.error(error.message || 'Failed to load disputes');
        setDisputes([]);
      } finally {
        setLoadingDisputes(false);
      }
    };

    fetchDisputes();
    
    // Refresh disputes every 60 seconds
    const refreshInterval = setInterval(fetchDisputes, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [dateFrom, dateTo]);

  // Handle view transaction details
  const handleViewTransaction = async (subscription) => {
    try {
      setLoadingTransaction(true);
      setSelectedSubscription(subscription);
      const details = await getSubscriptionTransaction(subscription.id);
      setTransactionDetails(details);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      toast.error(error.message || 'Failed to load transaction details');
      setSelectedSubscription(null);
    } finally {
      setLoadingTransaction(false);
    }
  };

  // Handle refund
  const handleRefund = () => {
    if (transactionDetails && transactionDetails.transaction) {
      setRefundData({
        amount: transactionDetails.transaction.amount.toString(),
        customerNote: '',
        merchantNote: '',
      });
      setShowRefundDialog(true);
    }
  };

  // Process refund
  const handleProcessRefund = async () => {
    if (!selectedSubscription) return;

    try {
      setProcessingRefund(true);
      const result = await refundSubscription(selectedSubscription.id, refundData);
      
      toast.success(result.message || 'Refund processed successfully');
      setShowRefundDialog(false);
      setRefundData({ amount: '', customerNote: '', merchantNote: '' });
      
      // Refresh subscriptions
      const params = {
        status: 'all',
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };
      const data = await getAdminSubscriptions(params);
      if (!data.permissionError) {
        setSubscriptions(data.subscriptions || []);
        setStats(data.stats || { totalRevenue: 0, totalSubscribers: 0, mrr: 0, planBreakdown: {} });
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error(error.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  // Calculate dispute stats
  const totalDisputes = disputes.length;
  const pendingDisputes = disputes.filter(d => 
    d.status === 'pending' || 
    d.status === 'awaiting-merchant-feedback' ||
    d.status === 'awaiting_bank_feedback'
  ).length;

  const planColors = {
    free: "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700/50",
    pro: "bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50",
    enterprise: "bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50",
  };

  const statusColors = {
    active: "bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50",
    cancelled: "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50",
    pending: "bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/50",
    resolved: "bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50",
  };

  const handleDateRangeChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
    setShowDatePicker(false);
    // Filter data based on date range
    // This would call your API with the date filters
    toast.success(`Filtered from ${from} to ${to}`);
  };

  const handleDateRangeCancel = () => {
    setShowDatePicker(false);
  };

  // Export subscriptions as invoice-style PDF
  const handleExport = () => {
    try {
      // Filter subscriptions based on date range
      let filteredSubs = subscriptions;
      if (dateFrom || dateTo) {
        filteredSubs = subscriptions.filter(sub => {
          const subDate = new Date(sub.createdAt || sub.startDate || sub.nextBilling);
          if (dateFrom && subDate < new Date(dateFrom)) return false;
          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (subDate > toDate) return false;
          }
          return true;
        });
      }

      // Separate active and canceled subscriptions
      const activeSubs = filteredSubs.filter(sub => sub.status !== 'cancelled' && sub.status !== 'canceled');
      const canceledSubs = filteredSubs.filter(sub => sub.status === 'cancelled' || sub.status === 'canceled');

      // Calculate revenue: active subscriptions are positive, canceled are negative
      const activeRevenue = activeSubs.reduce((sum, sub) => sum + (sub.amount || 0), 0);
      const canceledRevenue = canceledSubs.reduce((sum, sub) => sum + (sub.amount || 0), 0);
      const netRevenue = activeRevenue - canceledRevenue;

      // Create PDF using jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const sidebarWidth = 45;
      const contentX = sidebarWidth + margin;
      let yPosition = margin;

      // Color constants
      const colors = {
        darkGreen: [26, 71, 42],
        yellow: [251, 191, 36],
        red: [220, 38, 38],
        lightGray: [243, 244, 246],
        borderGray: [229, 231, 235],
        textGray: [107, 114, 128],
        textDark: [17, 24, 39]
      };

      // Helper function to add text with styling
      const addText = (text, x, y, options = {}) => {
        const { fontSize = 11, fontStyle = 'normal', color = colors.darkGreen, align = 'left' } = options;
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, x, y, { align });
      };

      // Helper function to format currency
      const formatCurrencyForPDF = (amount) => {
        const converted = convertAmount(amount);
        if (currency === 'USD') {
          return `$${converted.toFixed(2)}`;
        }
        return `₦${converted.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      // Helper function to draw table row with background
      const drawTableRow = (x, y, widths, data, bgColor = null, textColor = colors.textDark) => {
        let xPos = x;
        if (bgColor) {
          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          doc.rect(x - 1, y - 5, widths.reduce((a, b) => a + b, 0) + 2, 8, 'F');
        }
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        data.forEach((cell, idx) => {
          doc.text(cell, xPos, y);
          xPos += widths[idx];
        });
      };

      // Draw sidebar background (dark green)
      doc.setFillColor(colors.darkGreen[0], colors.darkGreen[1], colors.darkGreen[2]);
      doc.rect(0, 0, sidebarWidth, pageHeight, 'F');

      // Draw logo circle (yellow)
      doc.setFillColor(colors.yellow[0], colors.yellow[1], colors.yellow[2]);
      doc.circle(sidebarWidth / 2, margin + 12, 7, 'F');
      
      // Add "C" in logo
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('C', sidebarWidth / 2, margin + 15.5, { align: 'center' });

      // Company name
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('SNEAKLINK', sidebarWidth / 2, margin + 30, { align: 'center' });
      doc.text('PARTNERS', sidebarWidth / 2, margin + 36, { align: 'center' });

      // Main content area
      
      // Title "REPORT"
      addText('REPORT', contentX, yPosition + 20, { fontSize: 42, fontStyle: 'bold', color: colors.darkGreen });
      
      // Report info (right aligned)
      const reportNo = Math.floor(Math.random() * 10000);
      const reportDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      addText(`REPORT NO: ${reportNo}`, pageWidth - margin, yPosition + 12, { fontSize: 9, fontStyle: 'bold', align: 'right', color: colors.textGray });
      addText(reportDate, pageWidth - margin, yPosition + 17, { fontSize: 9, fontStyle: 'bold', align: 'right', color: colors.textGray });
      if (dateFrom || dateTo) {
        addText(`Period: ${dateFrom || 'All'} - ${dateTo || 'All'}`, pageWidth - margin, yPosition + 22, { fontSize: 9, fontStyle: 'normal', align: 'right', color: colors.textGray });
      }

      yPosition += 35;

      // Report to section
      addText('REPORT TO:', contentX, yPosition, { fontSize: 9, fontStyle: 'bold', color: colors.textGray });
      yPosition += 7;
      addText('ADMIN', contentX, yPosition, { fontSize: 11, fontStyle: 'bold', color: colors.textDark });
      yPosition += 6;
      addText('SNEAKLINK DASHBOARD', contentX, yPosition, { fontSize: 11, fontStyle: 'bold', color: colors.textDark });

      yPosition += 12;

      // Divider line
      doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2]);
      doc.setLineWidth(0.3);
      doc.line(contentX, yPosition, pageWidth - margin, yPosition);
      yPosition += 12;

      // Active Subscriptions Section
      addText('Active Subscriptions', contentX, yPosition, { fontSize: 13, fontStyle: 'bold', color: colors.textDark });
      yPosition += 10;

      // Table header with background
      const colWidths = [35, 55, 35, 40];
      const headers = ['Plan', 'Customer', 'Billing Cycle', 'Amount'];
      drawTableRow(contentX, yPosition, colWidths, headers, colors.lightGray, colors.textDark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      yPosition += 8;

      // Table border top
      doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2]);
      doc.setLineWidth(0.2);
      doc.line(contentX - 1, yPosition - 9, pageWidth - margin + 1, yPosition - 9);

      // Active subscriptions rows
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      activeSubs.forEach((sub, index) => {
        if (yPosition > pageHeight - 70) {
          doc.addPage();
          yPosition = margin + 20;
          // Redraw sidebar on new page
          doc.setFillColor(colors.darkGreen[0], colors.darkGreen[1], colors.darkGreen[2]);
          doc.rect(0, 0, sidebarWidth, pageHeight, 'F');
        }
        
        const plan = sub.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : 'N/A';
        const customer = sub.user || sub.email || 'N/A';
        const billingCycle = sub.billingCycle ? sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1) : 'Monthly';
        const amount = formatCurrencyForPDF(sub.amount || 0);
        
        // Alternate row background
        const bgColor = index % 2 === 0 ? [255, 255, 255] : [249, 250, 251];
        drawTableRow(contentX, yPosition, colWidths, [plan, customer.length > 25 ? customer.substring(0, 22) + '...' : customer, billingCycle, amount], bgColor, colors.textDark);
        
        // Row border
        doc.line(contentX - 1, yPosition + 3, pageWidth - margin + 1, yPosition + 3);
        yPosition += 8;
      });

      // Table border bottom
      doc.line(contentX - 1, yPosition - 5, pageWidth - margin + 1, yPosition - 5);
      yPosition += 12;

      // Canceled Subscriptions Section
      if (canceledSubs.length > 0) {
        addText('Canceled Subscriptions (Refunds)', contentX, yPosition, { fontSize: 13, fontStyle: 'bold', color: colors.red });
        yPosition += 10;

        // Table header with red background
        const redBg = [254, 242, 242];
        drawTableRow(contentX, yPosition, colWidths, headers, redBg, colors.red);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        yPosition += 8;

        // Table border top (red)
        doc.setDrawColor(colors.red[0], colors.red[1], colors.red[2]);
        doc.setLineWidth(0.3);
        doc.line(contentX - 1, yPosition - 9, pageWidth - margin + 1, yPosition - 9);

        // Canceled subscriptions rows (negative amounts)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        canceledSubs.forEach((sub, index) => {
          if (yPosition > pageHeight - 70) {
            doc.addPage();
            yPosition = margin + 20;
            // Redraw sidebar on new page
            doc.setFillColor(colors.darkGreen[0], colors.darkGreen[1], colors.darkGreen[2]);
            doc.rect(0, 0, sidebarWidth, pageHeight, 'F');
          }
          
          const plan = sub.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : 'N/A';
          const customer = sub.user || sub.email || 'N/A';
          const billingCycle = sub.billingCycle ? sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1) : 'Monthly';
          const amount = '-' + formatCurrencyForPDF(sub.amount || 0); // Negative amount
          
          // Alternate row background (light red)
          const bgColor = index % 2 === 0 ? [255, 255, 255] : [254, 242, 242];
          drawTableRow(contentX, yPosition, colWidths, [plan, customer.length > 25 ? customer.substring(0, 22) + '...' : customer, billingCycle, amount], bgColor, colors.red);
          
          // Row border (red)
          doc.line(contentX - 1, yPosition + 3, pageWidth - margin + 1, yPosition + 3);
          yPosition += 8;
        });

        // Table border bottom (red)
        doc.line(contentX - 1, yPosition - 5, pageWidth - margin + 1, yPosition - 5);
        doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2]); // Reset border color
        yPosition += 12;
      }

      // Summary section
      yPosition += 8;
      doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2]);
      doc.setLineWidth(0.5);
      doc.line(contentX, yPosition, pageWidth - margin, yPosition);
      yPosition += 12;

      const summaryX = pageWidth - margin - 50;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);

      doc.text('Total Active Subscriptions:', summaryX, yPosition, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(activeSubs.length.toString(), pageWidth - margin, yPosition, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      yPosition += 8;

      if (canceledSubs.length > 0) {
        doc.text('Total Canceled Subscriptions:', summaryX, yPosition, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(canceledSubs.length.toString(), pageWidth - margin, yPosition, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        yPosition += 8;
      }

      doc.text('Sub-Total (Active):', summaryX, yPosition, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrencyForPDF(activeRevenue), pageWidth - margin, yPosition, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      yPosition += 8;

      if (canceledSubs.length > 0) {
        doc.setTextColor(colors.red[0], colors.red[1], colors.red[2]);
        doc.text('Refunds (Canceled):', summaryX, yPosition, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text('-' + formatCurrencyForPDF(canceledRevenue), pageWidth - margin, yPosition, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        yPosition += 8;
      }

      doc.text('Tax:', summaryX, yPosition, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrencyForPDF(0), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 10;

      // Total Revenue line
      doc.setDrawColor(colors.darkGreen[0], colors.darkGreen[1], colors.darkGreen[2]);
      doc.setLineWidth(0.5);
      doc.line(summaryX, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.darkGreen[0], colors.darkGreen[1], colors.darkGreen[2]);
      doc.text('Net Revenue:', summaryX, yPosition, { align: 'right' });
      doc.text(formatCurrencyForPDF(netRevenue), pageWidth - margin, yPosition, { align: 'right' });

      // Footer
      yPosition = pageHeight - 25;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
      doc.text('Terms and Conditions', contentX, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.textGray[0], colors.textGray[1], colors.textGray[2]);
      const footerText = `This is an automated report generated from the Sneaklink admin dashboard. All amounts are displayed in ${currency === 'NGN' ? 'Nigerian Naira (NGN)' : 'US Dollars (USD)'}.${dateFrom || dateTo ? ` Data filtered for the period: ${dateFrom || 'All'} to ${dateTo || 'All'}.` : ''}`;
      doc.text(footerText, contentX, yPosition, { maxWidth: pageWidth - sidebarWidth - margin * 2 });

      // Save PDF
      const fileName = `subscriptions-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success(`Exported ${filteredSubs.length} subscriptions (${activeSubs.length} active, ${canceledSubs.length} canceled) to PDF`);
    } catch (error) {
      console.error('Error exporting subscriptions:', error);
      toast.error('Failed to export subscriptions');
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Subscriptions"
      />

      {/* Currency Switcher */}
      <div className="mb-4 flex justify-end">
        <div className={cn(
          "flex items-center gap-2 rounded-lg border p-2 backdrop-blur-xl",
          "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
        )}>
          <span className="text-sm text-gray-600 dark:text-gray-400">Currency:</span>
          <button
            onClick={() => setCurrency('NGN')}
            className={cn(
              "px-3 py-1 rounded-md text-sm font-light transition-colors",
              currency === 'NGN'
                ? "bg-primary text-primary-foreground"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Coins className="w-4 h-4 inline mr-1" />
            NGN
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={cn(
              "px-3 py-1 rounded-md text-sm font-light transition-colors",
              currency === 'USD'
                ? "bg-primary text-primary-foreground"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <DollarSign className="w-4 h-4 inline mr-1" />
            USD
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={cn(
          "rounded-2xl p-6 shadow-sm border backdrop-blur-xl transition-all",
          "bg-white/80 dark:bg-gray-900/60 border-gray-100 dark:border-gray-700/50"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-light text-gray-600 dark:text-gray-400">Total Revenue</span>
            {currency === 'NGN' ? (
              <Coins className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            ) : (
              <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <p className="text-3xl font-light text-gray-900 dark:text-white">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : formatCurrency(totalRevenue)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time</p>
        </div>

        <div className={cn(
          "rounded-2xl p-6 shadow-sm border backdrop-blur-xl transition-all",
          "bg-white/80 dark:bg-gray-900/60 border-gray-100 dark:border-gray-700/50"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-light text-gray-600 dark:text-gray-400">Total Subscribers</span>
            <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-3xl font-light text-gray-900 dark:text-white">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : totalSubscribers}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active subscriptions</p>
        </div>

        <div className={cn(
          "rounded-2xl p-6 shadow-sm border backdrop-blur-xl transition-all",
          "bg-white/80 dark:bg-gray-900/60 border-gray-100 dark:border-gray-700/50"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-light text-gray-600 dark:text-gray-400">Total Disputes</span>
            <AlertCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-3xl font-light text-gray-900 dark:text-white">{totalDisputes}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{pendingDisputes} pending</p>
        </div>

        <div className={cn(
          "rounded-2xl p-6 shadow-sm border backdrop-blur-xl transition-all",
          "bg-white/80 dark:bg-gray-900/60 border-gray-100 dark:border-gray-700/50"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-light text-gray-600 dark:text-gray-400">Monthly Recurring</span>
            {currency === 'NGN' ? (
              <Coins className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            ) : (
              <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <p className="text-3xl font-light text-gray-900 dark:text-white">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : formatCurrency(mrr)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">MRR</p>
        </div>
      </div>

      {/* Plan Breakdown */}
      <div className={cn(
        "rounded-2xl p-6 shadow-sm border mb-6 backdrop-blur-xl transition-all",
        "bg-white/80 dark:bg-gray-900/60 border-gray-100 dark:border-gray-700/50"
      )}>
        <h3 className="text-lg font-light text-gray-900 dark:text-white mb-4">Plan Breakdown</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : Object.keys(planBreakdown).length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {Object.entries(planBreakdown).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-2">
                <Badge className={planColors[plan] || planColors.free}>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </Badge>
                <span className="text-sm font-light text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No active subscriptions</p>
        )}
      </div>

      {/* Date Range Picker */}
      <div className="mb-6 flex items-center gap-4">
        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "gap-2 backdrop-blur-xl",
                "bg-white/80 dark:bg-gray-900/60",
                "border-gray-200 dark:border-gray-700/50",
                "text-gray-700 dark:text-gray-300"
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              {dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : "Select Date Range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl" align="start">
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateChange={handleDateRangeChange}
              onCancel={handleDateRangeCancel}
              onApply={handleDateRangeChange}
            />
          </PopoverContent>
        </Popover>

        {(dateFrom || dateTo) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className={cn(
              "backdrop-blur-xl",
              "bg-white/80 dark:bg-gray-900/60",
              "border-gray-200 dark:border-gray-700/50"
            )}
          >
            Clear Filter
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className={cn(
            "gap-2 backdrop-blur-xl transition-colors",
            "bg-white/80 dark:bg-gray-900/60",
            "border-gray-200 dark:border-gray-700/50",
            "hover:bg-[#1a472a] hover:text-white hover:border-[#1a472a]",
            "dark:hover:bg-[#1a472a] dark:hover:text-white dark:hover:border-[#1a472a]"
          )}
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn(
          "mb-6 h-auto p-1 flex-wrap rounded-lg backdrop-blur-xl transition-all",
          "bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/50"
        )}>
          <TabsTrigger
            value="subscriptions"
            className={cn(
              "px-4 py-2 rounded-md transition-all",
              "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600",
              "dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-300"
            )}
          >
            Subscriptions
            <span className={cn(
              "ml-2 text-xs px-2 py-0.5 rounded-full",
              "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400"
            )}>
              {subscriptions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="disputes"
            className={cn(
              "px-4 py-2 rounded-md transition-all",
              "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600",
              "dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-300"
            )}
          >
            Disputes
            <span className={cn(
              "ml-2 text-xs px-2 py-0.5 rounded-full",
              "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400"
            )}>
              {disputes.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="mt-0">
          <div className={cn(
            "rounded-xl border shadow-sm overflow-hidden backdrop-blur-xl transition-all",
            "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
          )}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn(
                    "border-b",
                    "border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50"
                  )}>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>User</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Plan</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Amount</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Status</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Start Date</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Next Billing</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Auto-Renew</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      className={cn(
                        "border-b transition-colors",
                        "border-gray-100 dark:border-gray-700/30",
                        "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-light text-gray-900 dark:text-white">{sub.user}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{sub.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={planColors[sub.plan] || planColors.free}>
                          {sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-light text-gray-900 dark:text-white">
                          {formatCurrency(sub.amount)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          /{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[sub.status] || statusColors.active}>
                          {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(sub.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {sub.nextBilling ? new Date(sub.nextBilling).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={sub.autoRenew ? statusColors.active : statusColors.cancelled}>
                          {sub.autoRenew ? (
                            <>
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 inline mr-1" />
                              Disabled
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTransaction(sub)}
                            className={cn(
                              "text-xs backdrop-blur-xl",
                              "bg-white/80 dark:bg-gray-800/50",
                              "border-gray-200 dark:border-gray-700/50"
                            )}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="mt-0">
          <div className={cn(
            "rounded-xl border shadow-sm overflow-hidden backdrop-blur-xl transition-all",
            "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
          )}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn(
                    "border-b",
                    "border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50"
                  )}>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>User</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Transaction ID</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Amount</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Reason</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Status</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Date</th>
                    <th className={cn(
                      "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                      "text-gray-600 dark:text-gray-400"
                    )}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDisputes ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                      </td>
                    </tr>
                  ) : disputes.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No disputes found
                      </td>
                    </tr>
                  ) : (
                    disputes.map((dispute) => (
                    <tr
                      key={dispute.id}
                      className={cn(
                        "border-b transition-colors",
                        "border-gray-100 dark:border-gray-700/30",
                        "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-light text-gray-900 dark:text-white">{dispute.user}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{dispute.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          {dispute.transactionId || dispute.transactionReference || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-light text-gray-900 dark:text-white">
                          {formatCurrency((dispute.amount || 0) * 100)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {dispute.reason || 'Not specified'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[dispute.status] || statusColors.pending}>
                          {dispute.status ? dispute.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {dispute.createdAt ? new Date(dispute.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "text-xs backdrop-blur-xl",
                              "bg-white/80 dark:bg-gray-800/50",
                              "border-gray-200 dark:border-gray-700/50"
                            )}
                          >
                            Resolve
                          </Button>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedSubscription} onOpenChange={(open) => !open && setSelectedSubscription(null)}>
        <DialogContent className={cn(
          "max-w-3xl max-h-[90vh] overflow-y-auto backdrop-blur-xl",
          "bg-white/95 dark:bg-gray-900/95",
          "border-gray-200 dark:border-gray-700/50"
        )}>
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-gray-900 dark:text-white">
              Transaction Details
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {selectedSubscription && `${selectedSubscription.user} - ${selectedSubscription.plan} Plan`}
            </DialogDescription>
          </DialogHeader>

          {loadingTransaction ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : transactionDetails ? (
            <div className="space-y-6 mt-4">
              {/* Stats Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={cn(
                  "p-4 rounded-lg border",
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50"
                )}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Time</p>
                  <p className="text-2xl font-light text-gray-900 dark:text-white">
                    {transactionDetails.stats?.totalTime || '00:00'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">minutes</p>
                </div>

                <div className={cn(
                  "p-4 rounded-lg border",
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50"
                )}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Device Type</p>
                  <p className="text-xl font-light text-gray-900 dark:text-white">
                    {transactionDetails.stats?.deviceType || 'Desktop'}
                  </p>
                </div>

                <div className={cn(
                  "p-4 rounded-lg border",
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50"
                )}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Attempts</p>
                  <p className="text-2xl font-light text-gray-900 dark:text-white">
                    {transactionDetails.stats?.attempts || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">attempts</p>
                </div>

                <div className={cn(
                  "p-4 rounded-lg border",
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50"
                )}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Errors</p>
                  <p className="text-2xl font-light text-red-600 dark:text-red-400">
                    {transactionDetails.stats?.errors || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">error{transactionDetails.stats?.errors !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Timeline Section */}
              <div>
                <h3 className="text-lg font-light text-gray-900 dark:text-white mb-4">Transaction Timeline</h3>
                <div className={cn(
                  "space-y-3 p-4 rounded-lg border",
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50"
                )}>
                  {transactionDetails.timeline && transactionDetails.timeline.length > 0 ? (
                    transactionDetails.timeline.map((event, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={cn(
                          "text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[50px]",
                          "font-light"
                        )}>
                          {event.time}
                        </div>
                        <div className={cn(
                          "flex-1 text-sm",
                          event.type === 'error' ? "text-red-600 dark:text-red-400" :
                          event.type === 'success' ? "text-green-600 dark:text-green-400" :
                          "text-gray-700 dark:text-gray-300"
                        )}>
                          {event.message}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No timeline data available</p>
                  )}
                </div>
              </div>

              {/* Transaction Info */}
              {transactionDetails.transaction && (
                <div className={cn(
                  "p-4 rounded-lg border",
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50"
                )}>
                  <h3 className="text-lg font-light text-gray-900 dark:text-white mb-3">Transaction Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Reference</p>
                      <p className="font-mono text-gray-900 dark:text-white">{transactionDetails.transaction.reference}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Amount</p>
                      <p className="font-light text-gray-900 dark:text-white">
                        {formatCurrency(transactionDetails.transaction.amount * 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Status</p>
                      <Badge className={transactionDetails.transaction.status === 'success' ? statusColors.active : statusColors.cancelled}>
                        {transactionDetails.transaction.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Channel</p>
                      <p className="text-gray-900 dark:text-white capitalize">{transactionDetails.transaction.channel || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {transactionDetails.transaction && transactionDetails.transaction.status === 'success' && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSubscription(null)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleRefund}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Refund
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No transaction details available
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent className={cn(
          "max-w-md backdrop-blur-xl",
          "bg-white/95 dark:bg-gray-900/95",
          "border-gray-200 dark:border-gray-700/50"
        )}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-light text-gray-900 dark:text-white">
              Refund Customer
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Process a refund for this transaction
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 mt-4">
            {/* Transaction Amount */}
            {transactionDetails && transactionDetails.transaction && (
              <div>
                <label className="block text-sm font-light text-gray-700 dark:text-gray-300 mb-2">
                  Transaction Amount
                </label>
                <div className={cn(
                  "px-3 py-2 rounded-lg border",
                  "bg-gray-50 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50",
                  "text-lg font-light text-gray-900 dark:text-white"
                )}>
                  {formatCurrency(transactionDetails.transaction.amount * 100)}
                </div>
              </div>
            )}

            {/* Refund Amount */}
            <div>
              <label htmlFor="refund-amount" className="block text-sm font-light text-gray-700 dark:text-gray-300 mb-2">
                Refund amount
              </label>
              <Input
                id="refund-amount"
                type="number"
                value={refundData.amount}
                onChange={(e) => setRefundData({ ...refundData, amount: e.target.value })}
                placeholder="Enter refund amount"
                className={cn(
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50"
                )}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty to refund full amount
              </p>
            </div>

            {/* Customer Note */}
            <div>
              <label htmlFor="customer-note" className="block text-sm font-light text-gray-700 dark:text-gray-300 mb-2">
                Customer note
              </label>
              <Textarea
                id="customer-note"
                value={refundData.customerNote}
                onChange={(e) => setRefundData({ ...refundData, customerNote: e.target.value })}
                placeholder="Enter a note to send to the customer (optional)"
                rows={3}
                className={cn(
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50"
                )}
              />
            </div>

            {/* Merchant Note */}
            <div>
              <label htmlFor="merchant-note" className="block text-sm font-light text-gray-700 dark:text-gray-300 mb-2">
                Merchant note
              </label>
              <Textarea
                id="merchant-note"
                value={refundData.merchantNote}
                onChange={(e) => setRefundData({ ...refundData, merchantNote: e.target.value })}
                placeholder="Enter a note for your records (optional)"
                rows={3}
                className={cn(
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50"
                )}
              />
            </div>
          </div>

          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel
              onClick={() => setShowRefundDialog(false)}
              className={cn(
                "bg-white/80 dark:bg-gray-800/50",
                "border-gray-200 dark:border-gray-700/50"
              )}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProcessRefund}
              disabled={processingRefund}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {processingRefund ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
