export function PageHeader({ title, description, actions }) {
  // Get current date (only show if description is provided)
  const currentDate = description ? new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : null;

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-light text-gray-900 dark:text-white">{title}</h1>
          {currentDate && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">{currentDate}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm">{description}</p>
      )}
    </div>
  );
}
