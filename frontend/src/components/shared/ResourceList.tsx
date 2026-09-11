import { cn } from '@/lib/utils'

interface Resource {
  id: string
  url: string
  title?: string
  type: 'GOODREADS' | 'EXTERNAL' | 'INTERNAL'
}

interface ResourceListProps {
  resources: Resource[]
  className?: string
}

function ResourceList({ resources, className }: ResourceListProps) {
  if (resources.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {resources.map((resource) => (
        <a
          key={resource.id}
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-sm text-accent hover:text-accent-dark transition-colors"
        >
          <svg
            className="mr-2 h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
          </svg>
          <span className="truncate">
            {resource.title || new URL(resource.url).hostname}
          </span>
        </a>
      ))}
    </div>
  )
}

export { ResourceList }
