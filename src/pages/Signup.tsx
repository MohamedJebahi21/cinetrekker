import Auth from './Auth';
import SEO from '@/components/SEO';

export default function Signup() {
  return (
    <>
      <SEO
        title="Sign Up - CineTrekker"
        description="Create a CineTrekker account to track movies and TV shows and get personalized recommendations."
        canonical="https://cinetrekker.vercel.app/signup"
      />
      <Auth initialTab="signup" />
    </>
  );
}
