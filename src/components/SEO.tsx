import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  canonical?: string;
  jsonLd?: object | null;
}

export function SEO({ title, description, image, url, canonical, jsonLd }: SEOProps) {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (name: string, value?: string) => {
      if (!value) return;
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    const setProp = (prop: string, value?: string) => {
      if (!value) return;
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', prop);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('description', description || '');
    setProp('og:title', title || '');
    setProp('og:description', description || '');
    setProp('og:image', image || '');
    setProp('og:url', url || window.location.href);
    setMeta('twitter:title', title || '');
    setMeta('twitter:description', description || '');
    setMeta('twitter:image', image || '');

    if (canonical) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    // Inject JSON-LD
    if (jsonLd) {
      const id = 'cinetrekker-jsonld';
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        document.head.appendChild(script);
      }
      script.text = JSON.stringify(jsonLd);
    }
  }, [title, description, image, url, canonical, jsonLd]);

  return null;
}

export default SEO;
