import React from 'react';
import { Share2, Copy, Download, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { trackEngagementEvent } from '@/lib/engagement';

interface ShareButtonProps {
  title: string;
  url: string;
  text?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ShareButton({ title, url, text, variant = 'ghost', size = 'sm' }: ShareButtonProps) {
  const { t } = useTranslation();
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      trackEngagementEvent("share_copy_link", { source: "share_button" });
      toast.success(t('share.copySuccess', 'Link copied!'), {
        description: t('share.copySuccessDesc', 'The link has been copied to your clipboard.'),
      });
    } catch (error) {
      toast.error(t('share.copyError', 'Failed to copy'), {
        description: t('share.copyErrorDesc', 'Could not copy link to clipboard.'),
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        trackEngagementEvent("share_open", { mode: "native_share" });
        await navigator.share({
          title,
          text: text || title,
          url,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareTo = (platform: string) => {
    let shareUrl = '';
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text || title);

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'reddit':
        shareUrl = `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
    trackEngagementEvent("share_open", { mode: platform });
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button variant={variant} size={size} onClick={() => { setIsOpen(!isOpen); trackEngagementEvent("share_open", { mode: "menu" }); }}>
        <Share2 className="h-4 w-4 mr-2" />
        {t('share.button', 'Share')}
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <div className="px-4 py-2 text-sm font-semibold text-popover-foreground border-b border-border">
              {t('share.title', 'Share this')}
            </div>
            
            {typeof navigator.share === 'function' && (
              <>
                <button
                  onClick={() => { setIsOpen(false); handleShare(); }}
                  className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground flex items-center"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('share.via', 'Share via...')}
                </button>
                <div className="border-b border-border my-1" />
              </>
            )}

            <button
              onClick={() => { setIsOpen(false); handleCopyLink(); }}
              className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground flex items-center"
            >
              <Copy className="h-4 w-4 mr-2" />
              {t('share.copyLink', 'Copy link')}
            </button>

            <button
              onClick={() => { setIsOpen(false); handleShareTo('twitter'); }}
              className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground flex items-center"
            >
              <Twitter className="h-4 w-4 mr-2" />
              {t('share.twitter', 'Share on Twitter')}
            </button>

            <button
              onClick={() => { setIsOpen(false); handleShareTo('facebook'); }}
              className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground flex items-center"
            >
              <Facebook className="h-4 w-4 mr-2" />
              {t('share.facebook', 'Share on Facebook')}
            </button>

            <button
              onClick={() => { setIsOpen(false); handleShareTo('whatsapp'); }}
              className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground flex items-center"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {t('share.whatsapp', 'Share on WhatsApp')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
