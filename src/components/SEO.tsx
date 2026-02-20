import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  canonical?: string;
  jsonLd?: object | null;
  keywords?: string;
}

const SITE_NAME = 'Cinetrekker';
const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;
const DEFAULT_TITLE = TITLE_TEMPLATE.replace('%s', 'Discover & Track Movies & TV Shows');
const DEFAULT_DESCRIPTION = 'Track your favorite movies and TV shows. Discover trending content, manage your watchlist, and get personalized recommendations.';
const DEFAULT_IMAGE = 'https://cinetrekker.vercel.app/og-image.png';

export function SEO({ 
  title, 
  description, 
  image, 
  url, 
  canonical, 
  jsonLd,
  keywords 
}: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    // Set page title using the template 'Cinetrekker | %s'
    const fullTitle = title ? TITLE_TEMPLATE.replace('%s', title) : DEFAULT_TITLE;
    document.title = fullTitle;

    // Helper function to set meta tags
    const setMeta = (name: string, content: string) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const setProp = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Set meta tags
    setMeta('description', description || DEFAULT_DESCRIPTION);
    if (keywords) setMeta('keywords', keywords);
    
    // Open Graph (for Discord, Twitter, etc.)
    setProp('og:site_name', SITE_NAME);
    setProp('og:type', 'website');
    setProp('og:title', fullTitle);
    setProp('og:description', description || DEFAULT_DESCRIPTION);
    setProp('og:image', image || DEFAULT_IMAGE);
    setProp('og:url', url || window.location.href);
    
    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description || DEFAULT_DESCRIPTION);
    setMeta('twitter:image', image || DEFAULT_IMAGE);

    // Canonical URL
    if (canonical) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    // JSON-LD Structured Data
    if (jsonLd) {
      const id = 'cinetrekker-jsonld';
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }
  }, [title, description, image, url, canonical, jsonLd, keywords, location]);

  return null;
}

export default SEO;
