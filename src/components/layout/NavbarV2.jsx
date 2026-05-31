import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap, Shield, ChevronDown } from 'lucide-react';
import OmniLogo from '@/components/ui/OmniLogo';
import { useAuth } from '@/lib/AuthContext';

const ADMIN_EMAILS = ['rthati1@asu.edu', 'thatirithikroy@gmail.com'];

const NAV_SECTIONS = [
  {
    label: 'Home',
    path: '/',
    single: true,
  },
  {
    label: 'Data Studio',
    path: '/v2/data-studio',
    single: true,
  },
  {
    label: 'SQL / Python Lab',
    path: '/v2/sql-lab',
    single: true,
  },
  {
    label: 'AI Analyst Team',
    path: '/v2/ai-analysts',
    single: true,
  },
  {
    label: 'Role Workspaces',
    children: [
      { label: '🎯 Choose Role', path: '/role-select' },
      { label: 'Business Analyst', path: '/workspace/business-analyst' },
      { label: 'Marketing Analyst', path: '/workspace/marketing-analyst' },
      { label: 'Data Analyst', path: '/workspace/data-analyst' },
      { label: 'Data Scientist', path: '/workspace/data-scientist' },
    ],
  },
  {
    label: 'Analytics',
    children: [
      { label: 'Marketing Studio', path: '/v2/marketing-studio' },
      { label: 'Supply Chain & Ops', path: '/v2/supply-chain' },
      { label: 'Advanced Analytics Lab', path: '/v2/analytics-lab' },
      { label: 'BI Dashboards', path: '/dashboards' },
      { label: 'Visual Builder', path: '/visual-builder' },
    ],
  },
  {
    label: 'Reports & Governance',
    children: [
      { label: 'Decision Reports', path: '/decision-reports' },
      { label: 'Agent Studio', path: '/agent-studio' },
      { label: 'Data Governance', path: '/data-governance' },
      { label: 'Observability', path: '/observability' },
      { label: 'Platform QA', path: '/readiness-score' },
    ],
  },
];

export default function NavbarV2() {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const isAdmin = user && (
    (user.role || '').toLowerCase() === 'admin' ||
    ADMIN_EMAILS.includes((user.email || '').toLowerCase())
  );

  // Hide navbar on workspace/app pages
  const hideOnPaths = [
    '/workspace/business-analyst', '/workspace/marketing-analyst',
    '/workspace/data-analyst', '/workspace/data-scientist',
    '/story-builder', '/alerts', '/integrations', '/data-mapping',
    '/collaboration', '/predictive', '/forecast-hub', '/governance',
    '/workbench', '/ml-workbench', '/policy-center',
    '/ai-command-center', '/data-intelligence', '/ml-intelligence',
    '/strategic-kpi', '/analytics-lab', '/data-engineering',
    '/semantic-metrics', '/sql-workbench', '/handover',
    '/senior-workbench', '/api-connector', '/pipeline-studio',
    '/observability', '/demo-mode', '/sample-dashboards', '/product-pitch',
  ];
  const isHidden = hideOnPaths.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  if (isHidden) return null;

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
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-white">OmniData <span className="text-gradient">AI</span></span>
              <span className="text-xs text-white/30">Analytics Studio v2.0</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_SECTIONS.map(section => (
              section.single ? (
                <Link key={section.path} to={section.path}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    location.pathname === section.path
                      ? 'text-cyan-400 bg-cyan-400/8'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}>
                  {section.label}
                </Link>
              ) : (
                <div key={section.label} className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === section.label ? null : section.label)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      section.children?.some(c => location.pathname === c.path)
                        ? 'text-cyan-400 bg-cyan-400/8'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }`}>
                    {section.label}
                    <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === section.label ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {openDropdown === section.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="absolute top-full left-0 mt-1 w-52 rounded-xl border border-white/8 bg-navy-800/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
                      >
                        {section.children.map(child => (
                          <Link key={child.path} to={child.path}
                            className={`flex items-center px-4 py-2.5 text-xs font-medium transition-all hover:bg-white/5 ${
                              location.pathname === child.path ? 'text-cyan-400 bg-cyan-400/5' : 'text-white/60'
                            }`}>
                            {child.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-2">
            <Link to="/readiness-score"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-green-400/60 hover:text-green-400 hover:bg-green-400/8 transition-all">
              ✓ QA 98/100
            </Link>
            {isAdmin && (
              <Link to="/admin"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400/60 hover:text-red-400 hover:bg-red-400/8 transition-all">
                <Shield className="w-3 h-3" /> Admin
              </Link>
            )}
            <Link to="/v2/data-studio"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-400 text-xs font-bold rounded-xl hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              <Zap className="w-3.5 h-3.5" /> Open Studio
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(o => !o)} className="lg:hidden p-2 text-white/60 hover:text-white">
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
            className="lg:hidden nav-blur border-t border-white/5 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 space-y-1">
              {NAV_SECTIONS.map(section => (
                section.single ? (
                  <Link key={section.path} to={section.path}
                    className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      location.pathname === section.path ? 'text-cyan-400 bg-cyan-400/8' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }`}>
                    {section.label}
                  </Link>
                ) : (
                  <div key={section.label}>
                    <div className="px-4 py-1.5 text-xs font-bold text-white/30 uppercase tracking-wider">{section.label}</div>
                    {section.children?.map(child => (
                      <Link key={child.path} to={child.path}
                        className={`flex items-center pl-7 pr-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          location.pathname === child.path ? 'text-cyan-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                        }`}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )
              ))}
              <div className="pt-3 border-t border-white/5">
                <Link to="/v2/data-studio"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-cyan-400 rounded-xl text-sm font-bold"
                  style={{ color: 'hsl(222,47%,6%)' }}>
                  <Zap className="w-4 h-4" /> Open Studio
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close dropdown */}
      {openDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
      )}
    </motion.header>
  );
}