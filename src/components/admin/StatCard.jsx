import { cn } from "@/lib/utils";

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-sm text-gray-600 font-light">{title}</p>
          <p className="text-3xl font-light text-gray-900">{value}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {change && (
        <p
          className={cn(
            "text-xs font-light mt-4",
            changeType === "positive" && "text-green-600",
            changeType === "negative" && "text-red-600",
            changeType === "neutral" && "text-gray-500"
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}
