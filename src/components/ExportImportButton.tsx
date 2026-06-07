import React from 'react';
import { Download, Upload, FileText, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useUserLists } from '@/contexts/user-lists-context';
import { UserMediaItem } from '@/types/media';

export function ExportImportButton() {
  const { toast } = useToast();
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

    toast({
      title: 'Export successful!',
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

    toast({
      title: 'Export successful!',
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

        toast({
          title: 'Import successful!',
          description: `Imported ${imported} items from backup.`,
        });
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Could not parse the file. Please check the format.',
          variant: 'destructive',
        });
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export/Import
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Export Data</DropdownMenuLabel>
          <DropdownMenuItem onClick={exportToJSON}>
            <FileJson className="h-4 w-4 mr-2" />
            Export all (JSON)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportToCSV('watchlist')}>
            <FileText className="h-4 w-4 mr-2" />
            Export Watchlist (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportToCSV('watched')}>
            <FileText className="h-4 w-4 mr-2" />
            Export Watched (CSV)
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Import Data</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import from JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
