import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, CreditCard, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export function UserModal({ user, open, onClose }) {
  if (!user) return null;

  const planColors = {
    free: "bg-gray-100 text-gray-700 border border-gray-200",
    basic: "bg-blue-50 text-blue-700 border border-blue-200",
    premium: "bg-purple-50 text-purple-700 border border-purple-200",
    enterprise: "bg-green-50 text-green-700 border border-green-200",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-gray-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900">User Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-xl font-light text-white">
                {user.name.split(" ").map(n => n[0]).join("")}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-light text-gray-900">{user.name}</h3>
              <Badge className={planColors[user.plan] || planColors.free}>
                {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Info Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Email:</span>
              <span className="text-gray-900">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Joined:</span>
              <span className="text-gray-900">{user.signupDate}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Status:</span>
              <span className="text-gray-900 capitalize">{user.status}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" size="sm" className="flex-1 gap-2 border-gray-200 hover:bg-gray-50">
              <ArrowUpCircle className="w-4 h-4" />
              Upgrade
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2 border-gray-200 hover:bg-gray-50">
              <ArrowDownCircle className="w-4 h-4" />
              Downgrade
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
