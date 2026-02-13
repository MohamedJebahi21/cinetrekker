import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from './skeleton';

export default function MovieSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-3"
    >
      <Skeleton className="w-full h-56 rounded-lg" />
      <div className="px-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/6" />
        </div>
      </div>
    </motion.div>
  );
}
