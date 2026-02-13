import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0.9 }}
      animate={{ opacity: [0.9, 1, 0.9] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      className={cn("rounded-md bg-muted relative overflow-hidden", className)}
      {...props}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 100%)',
          mixBlendMode: 'overlay',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

export { Skeleton };
