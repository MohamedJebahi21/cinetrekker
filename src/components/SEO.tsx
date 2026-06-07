import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteMetadata } from '@/lib/metadata';
import { sanitizeJsonLd } from '@/lib/seo';

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  canonical?: string;
  jsonLd?: object | null;
  keywords?: string;
}

const SITE_NAME = siteMetadata.siteName;
const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;
const DEFAULT_TITLE = siteMetadata.title;
const DEFAULT_DESCRIPTION = siteMetadata.description;
const DEFAULT_IMAGE = siteMetadata.openGraph.images[0];

const formatTitle = (title?: string) => {
  if (!title) return DEFAULT_TITLE;
  return title.toLowerCase().includes(SITE_NAME.toLowerCase())
    ? title
    : TITLE_TEMPLATE.replace('%s', title);
};

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
    const fullTitle = formatTitle(title);
    const descriptionText = description || DEFAULT_DESCRIPTION;
    const urlValue = canonical || url || `${siteMetadata.canonical}${location.pathname}`;
    const imageValue = image || DEFAULT_IMAGE;

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
    setMeta('description', descriptionText);
    if (keywords) setMeta('keywords', keywords);
    
    // Open Graph (for Discord, Twitter, etc.)
    setProp('og:site_name', SITE_NAME);
    setProp('og:type', siteMetadata.openGraph.type);
    setProp('og:locale', siteMetadata.openGraph.locale);
    setProp('og:title', fullTitle);
    setProp('og:description', descriptionText);
    setProp('og:image', imageValue);
    setProp('og:url', urlValue);
    
    // Twitter Card
    setMeta('twitter:card', siteMetadata.twitter.card);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', descriptionText);
    setMeta('twitter:image', imageValue);
    setMeta('twitter:image:alt', siteMetadata.twitter.imageAlt);

    // Canonical URL
    if (urlValue) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', urlValue);
    }

    // JSON-LD Structured Data
    if (jsonLd) {
      const payloads = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      payloads
        .filter(Boolean)
        .map((item) => sanitizeJsonLd(item))
        .forEach((payload, index) => {
          const script = document.createElement("script");
          script.type = "application/ld+json";
          script.dataset.cinetrekkerJsonld = "true";
          script.id = `cinetrekker-jsonld-${index}`;
          const safeJson = JSON.stringify(payload).replace(/</g, "\\u003c");
          script.text = safeJson;
          document.head.appendChild(script);
        });
    }
  }, [title, description, image, url, canonical, jsonLd, keywords, location]);

  return null;
}

export default SEO;
