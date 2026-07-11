import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <FileQuestion className="h-16 w-16 text-claude-600" />
      <h2 className="mt-4 text-xl font-bold text-gray-100">Page not found</h2>
      <p className="mt-1 text-sm text-gray-500">
        The page you're looking for doesn't exist.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
