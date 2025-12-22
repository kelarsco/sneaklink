import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { acceptStaffInvitation } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function StaffAcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (token && status === 'idle') {
      handleAcceptInvitation();
    }
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid invitation link. No token provided.');
      return;
    }

    try {
      setLoading(true);
      const response = await acceptStaffInvitation(token);
      
      if (response.success) {
        setStatus('success');
        toast.success('Invitation accepted successfully! You can now login.');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/manager/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
      setErrorMessage(error?.message || 'Failed to accept invitation. The link may be invalid or expired.');
      toast.error(error?.message || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fafafa] via-[#f5f5f5] to-[#fef9e7] dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className={cn(
          "rounded-2xl border shadow-lg overflow-hidden backdrop-blur-xl transition-all",
          "bg-white/80 dark:bg-gray-900/60",
          "border-gray-200 dark:border-gray-700/50",
          "p-8"
        )}>
          {loading && (
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-2">
                Accepting Invitation...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we process your invitation.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-2">
                Invitation Accepted!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your invitation has been accepted successfully. You can now login to access the admin dashboard.
              </p>
              <Button
                onClick={() => navigate('/admin/login')}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-2">
                Invitation Error
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {errorMessage}
              </p>
              <Button
                onClick={() => navigate('/manager/login')}
                variant="outline"
                className="border-gray-300 dark:border-gray-700"
              >
                Go to Login
              </Button>
            </div>
          )}

          {!loading && status === 'idle' && !token && (
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-2">
                Invalid Invitation Link
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This invitation link is invalid. Please contact the admin for a new invitation.
              </p>
              <Button
                onClick={() => navigate('/manager/login')}
                variant="outline"
                className="border-gray-300 dark:border-gray-700"
              >
                Go to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
