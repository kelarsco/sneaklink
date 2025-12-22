import { cn } from "@/lib/utils";

export function DataTable({ columns, data, onRowClick }) {
  return (
    <div className={cn(
      "rounded-xl border shadow-sm overflow-hidden backdrop-blur-xl transition-all",
      "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
    )}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead>
            <tr className={cn(
              "border-b",
              "border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50"
            )}>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-light uppercase tracking-wider",
                    "text-gray-600 dark:text-gray-400"
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b cursor-pointer transition-colors",
                  "border-gray-100 dark:border-gray-700/30",
                  "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, index) => (
                  <td key={index} className={cn(
                    "px-4 py-3 text-sm",
                    "text-gray-900 dark:text-white",
                    column.className || ""
                  )}>
                    {typeof column.accessor === "function"
                      ? column.accessor(row)
                      : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
