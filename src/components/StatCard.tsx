import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  delay?: number;
  color?: 'primary' | 'red' | 'green' | 'blue';
}

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  delay = 0,
  color = 'primary'
}: StatCardProps) {
  const colorVariants = {
    primary: 'from-red-500/20 to-orange-500/20',
    red: 'from-red-500/20 to-red-600/20',
    green: 'from-green-500/20 to-green-600/20',
    blue: 'from-primary/20 to-red-700/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="group"
    >
      <Card className="glass-card-hover h-full relative overflow-hidden border border-white/5 hover:border-primary/30 transition-all">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
        </div>

        <CardContent className="pt-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${colorVariants[color]} group-hover:shadow-lg group-hover:shadow-primary/20 transition-all`}>
              <Icon className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="text-3xl font-black mb-2 group-hover:text-primary transition-colors">{value}</div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
