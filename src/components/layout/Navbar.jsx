import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap, Shield } from 'lucide-react';
import OmniLogo from '@/components/ui/OmniLogo';
import { useAuth } from '@/lib/AuthContext';

const ADMIN_EMAILS = ['rthati1@asu.edu', 'thatirithikroy@gmail.com'];

const navLinks = [
  { label: 'Platform', path: '/platform' },
  { label: 'Workflows', path: '/workflows' },
  { label: 'Universal Data', path: '/universal-data' },
  { label: 'Dashboards', path: '/dashboards' },
  { label: 'Governance', path: '/governance' },
  { label: 'ML Workbench', path: '/ml-workbench' },
  { label: 'Policy Center', path: '/policy-center' },
  { label: 'Agent Studio', path: '/agent-studio' },
];

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAdmin = user && (
    (user.role || '').toLowerCase() === 'admin' ||
    ADMIN_EMAILS.includes((user.email || '').toLowerCase())
  );

  // Hide navbar on workspace/app pages
  const appPages = ['/workspace', '/dashboards', '/story-builder', '/alerts', '/integrations', '/data-mapping', '/reports', '/collaboration', '/predictive', '/forecast-hub', '/governance', '/workbench', '/ml-workbench', '/policy-center', '/agent-studio'];
  const isWorkspace = appPages.some(p => location.pathname.startsWith(p));
  
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (isWorkspace) return null;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'nav-blur shadow-lg' : 'bg-transparent'}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
           <Link to="/" className="flex items-center gap-2.5">
             <OmniLogo size="sm" showText={false} />
             <span className="text-sm font-semibold text-white">AI Analytics Tool</span>
           </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.label}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === link.path
                    ? 'text-cyan-400 bg-cyan-400/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAdmin && (
              <Link to="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${location.pathname === '/admin' ? 'bg-red-400/15 text-red-400 border border-red-400/25' : 'text-white/40 hover:text-red-400 hover:bg-red-400/8 border border-transparent'}`}>
                <Shield className="w-3.5 h-3.5" /> Admin
              </Link>
            )}
            <Link
              to="/workspace"
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-400 text-xs font-bold rounded-xl hover:bg-cyan-300 transition-all hover:scale-105"
              style={{ color: 'hsl(222,47%,6%)' }}
            >
              <Zap className="w-3.5 h-3.5" /> Launch Workspace
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(o => !o)} className="md:hidden p-2 text-white/60 hover:text-white transition-colors">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden nav-blur border-t border-white/5 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.label}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === link.path ? 'text-cyan-400 bg-cyan-400/8' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-white/5 mt-3">
                <Link
                  to="/workspace"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-cyan-400 rounded-xl text-sm font-bold"
                  style={{ color: 'hsl(222,47%,6%)' }}
                >
                  <Zap className="w-4 h-4" /> Launch Workspace
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}