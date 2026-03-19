import React from 'react';
import { Download, Upload, FileText, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useUserLists } from '@/contexts/UserListsContext';
import { UserMediaItem } from '@/types/media';

export function ExportImportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const { watchlist, watched, addToWatchlist, addToWatched } = useUserLists();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const exportToJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      watchlist,
      watched,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinetrekker-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Export successful!', {
      description: 'Your data has been exported to a JSON file.',
    });
  };

  const exportToCSV = (type: 'watchlist' | 'watched') => {
    const data = type === 'watchlist' ? watchlist : watched;
    
    const headers = ['Title ID', 'Media Type', 'Added Date', 'Status', 'Rating', 'Note'];
    const rows = data.map((item) => [
      item.mediaId,
      item.mediaType,
      item.addedAt || '',
      item.status || '',
      item.rating || '',
      item.note ? `"${item.note.replace(/"/g, '""')}"` : '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinetrekker-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Export successful!', {
      description: `Your ${type} has been exported to a CSV file.`,
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data.watchlist && !data.watched) {
          throw new Error('Invalid file format');
        }

        let imported = 0;
        
        // Import watchlist
        if (data.watchlist) {
          data.watchlist.forEach((item: UserMediaItem) => {
            addToWatchlist(item.mediaId, item.mediaType);
            imported++;
          });
        }

        // Import watched
        if (data.watched) {
          data.watched.forEach((item: UserMediaItem) => {
            addToWatched(item.mediaId, item.mediaType, item.rating, item.note, item.status);
            imported++;
          });
        }

        toast.success('Import successful!', {
          description: `Imported ${imported} items from backup.`,
        });
      } catch (error) {
        toast.error('Import failed', {
          description: 'Could not parse the file. Please check the format.',
        });
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  return (
    <>
      <div className="relative inline-block text-left" ref={menuRef}>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
          <Download className="h-4 w-4 mr-2" />
          Export/Import
        </Button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1" role="menu" aria-orientation="vertical">
              <div className="px-4 py-2 text-sm font-semibold text-popover-foreground border-b border-border">
                Export Data
              </div>
              
              <button
                onClick={() => { setIsOpen(false); exportToJSON(); }}
                className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground flex items-center"
              >
                <FileJson className="h-4 w-4 mr-2" />
                Export all (JSON)
              </button>

              <button
                onClick={() => { setIsOpen(false); exportToCSV('watchlist'); }}
                className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground flex items-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export Watchlist (CSV)
              </button>

              <button
                onClick={() => { setIsOpen(false); exportToCSV('watched'); }}
                className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground flex items-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export Watched (CSV)
              </button>

              <div className="border-b border-border my-1" />
              <div className="px-4 py-2 text-sm font-semibold text-popover-foreground border-b border-border shadow-sm">
                Import Data
              </div>

              <button
                onClick={() => { setIsOpen(false); fileInputRef.current?.click(); }}
                className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import from JSON
              </button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </>
  );
}
