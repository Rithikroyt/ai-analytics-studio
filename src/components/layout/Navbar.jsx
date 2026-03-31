import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import OmniLogo from '../ui/OmniLogo';
import { Menu, X, ChevronRight } from 'lucide-react';

const navLinks = [
  { label: 'Platform', to: '/platform' },
  { label: 'Workflows', to: '/workflows' },
  { label: 'Universal Data', to: '/universal-data' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isWorkspace = location.pathname.startsWith('/workspace');
  
  if (isWorkspace) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 nav-blur">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex-shrink-0">
          <OmniLogo size="sm" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.to 
                  ? 'text-cyan-400' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/workspace"
            className="flex items-center gap-2 px-4 py-2 bg-cyan-400 text-navy-900 rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors"
            style={{ color: 'hsl(222, 47%, 6%)' }}
          >
            Launch Workspace
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden border-t border-border/50 bg-navy-800 px-6 py-4 space-y-3"
          >
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="block text-sm text-muted-foreground hover:text-foreground py-2"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/workspace"
              className="block w-full text-center px-4 py-2 bg-cyan-400 text-navy-900 rounded-lg text-sm font-semibold mt-4"
              style={{ color: 'hsl(222, 47%, 6%)' }}
              onClick={() => setMobileOpen(false)}
            >
              Launch Workspace
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}