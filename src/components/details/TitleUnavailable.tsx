import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface TitleUnavailableProps {
  title: string;
  description: string;
  homeLabel: string;
}

export function TitleUnavailable({ title, description, homeLabel }: TitleUnavailableProps) {
  return (
    <div className="page-container text-center py-16">
      <h1 className="text-3xl font-bold mb-3">{title}</h1>
      <p className="text-muted-foreground mb-6">{description}</p>
      <Button asChild>
        <Link to="/">{homeLabel}</Link>
      </Button>
    </div>
  );
}