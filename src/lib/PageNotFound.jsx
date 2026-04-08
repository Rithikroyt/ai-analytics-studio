import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, Zap } from 'lucide-react';

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg"
      >
        {/* Glowing 404 */}
        <div className="relative mb-8 inline-block">
          <div className="text-[9rem] font-black font-mono text-gradient leading-none select-none">404</div>
          <div className="absolute inset-0 bg-cyan-400/10 blur-3xl rounded-full pointer-events-none" />
        </div>

        <h1 className="text-2xl font-black mb-3">Page not found</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you're looking for doesn't exist, or has been moved. Try navigating back to the workspace or homepage.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-400 rounded-xl font-bold text-sm hover:bg-cyan-300 transition-all hover:scale-105"
            style={{ color: 'hsl(222,47%,6%)' }}
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link
            to="/workspace"
            className="inline-flex items-center gap-2 px-6 py-3 glass border border-white/10 rounded-xl text-sm font-medium hover:border-cyan-400/30 transition-all"
          >
            <Zap className="w-4 h-4 text-cyan-400" /> Launch Workspace
          </Link>
        </div>
      </motion.div>
    </div>
  );
}