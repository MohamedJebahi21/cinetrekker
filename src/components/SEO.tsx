import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteMetadata } from '@/lib/metadata';

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  canonical?: string;
  jsonLd?: object | null;
  keywords?: string;
  type?: "website" | "article" | "video.movie" | "video.tv_show";
  releaseDate?: string;
  rating?: number;
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
  imageAlt,
  url, 
  canonical, 
  jsonLd,
  keywords,
  type,
  releaseDate,
  rating,
}: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    const fullTitle = formatTitle(title);
    const descriptionText = description || DEFAULT_DESCRIPTION;
    const urlValue =
      canonical ||
      url ||
      `${siteMetadata.canonical}${location.pathname}${location.search}`;
    const imageValue = image || DEFAULT_IMAGE;
    const imageAltValue = imageAlt || siteMetadata.twitter.imageAlt;

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

    const removeMeta = (name: string) => {
      const element = document.querySelector(`meta[name="${name}"]`);
      if (element) {
        element.remove();
      }
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
    if (keywords) {
      setMeta('keywords', keywords);
    } else {
      removeMeta('keywords');
    }
    
    // Open Graph (for Discord, Twitter, etc.)
    setProp('og:site_name', SITE_NAME);
    setProp('og:type', type || siteMetadata.openGraph.type);
    setProp('og:locale', siteMetadata.openGraph.locale);
    setProp('og:title', fullTitle);
    setProp('og:description', descriptionText);
    setProp('og:image', imageValue);
    setProp('og:image:alt', imageAltValue);
    setProp('og:url', urlValue);
    
    // Twitter Card
    setMeta('twitter:card', siteMetadata.twitter.card);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', descriptionText);
    setMeta('twitter:image', imageValue);
    setMeta('twitter:image:alt', imageAltValue);
    setMeta('twitter:url', urlValue);

    if (releaseDate) {
      setMeta('release_date', releaseDate);
      setProp('movie:release_date', releaseDate);
      setProp('video:release_date', releaseDate);
    } else {
      removeMeta('release_date');
    }

    if (typeof rating === 'number' && Number.isFinite(rating)) {
      const normalizedRating = rating.toFixed(1);
      setMeta('rating', normalizedRating);
      setMeta('movie:rating', normalizedRating);
    } else {
      removeMeta('rating');
      removeMeta('movie:rating');
    }

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
      const id = 'cinetrekker-jsonld';
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else {
      const script = document.getElementById('cinetrekker-jsonld');
      if (script) {
        script.remove();
      }
    }
  }, [title, description, image, imageAlt, url, canonical, jsonLd, keywords, type, releaseDate, rating, location]);

  return null;
}

export default SEO;
