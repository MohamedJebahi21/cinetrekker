import Auth from './Auth';
import SEO from '@/components/SEO';

export default function Login() {
  return (
    <>
      <SEO
        title="Login - CineTrekker"
        description="Sign in to CineTrekker to manage your watchlist and recommendations."
        canonical="https://cinetrekker.vercel.app/login"
      />
      <Auth initialTab="signin" />
    </>
  );
}
