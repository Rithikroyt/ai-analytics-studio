export default function OmniLogo({ size = 'md', showText = true }) {
  const sizes = { sm: 24, md: 32, lg: 48 };
  const px = sizes[size] || 32;
  
  return (
    <div className="flex items-center gap-2.5">
      <svg width={px} height={px} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f5ff" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        {/* Hexagon outline */}
        <polygon points="24,2 44,13 44,35 24,46 4,35 4,13" 
          stroke="url(#logoGrad)" strokeWidth="2" fill="none" />
        {/* Inner data pattern */}
        <circle cx="24" cy="24" r="6" fill="url(#logoGrad)" opacity="0.9" />
        <line x1="24" y1="10" x2="24" y2="18" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.7" />
        <line x1="24" y1="30" x2="24" y2="38" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.7" />
        <line x1="11" y1="17" x2="18" y2="21" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.7" />
        <line x1="30" y1="27" x2="37" y2="31" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.7" />
        <line x1="11" y1="31" x2="18" y2="27" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.7" />
        <line x1="30" y1="21" x2="37" y2="17" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.7" />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-inter font-bold text-white" style={{ fontSize: px * 0.45 }}>
            OmniData<span className="text-gradient"> AI</span>
          </span>
          {size !== 'sm' && (
            <span className="font-inter font-normal text-muted-foreground" style={{ fontSize: px * 0.25 }}>
              Analytics Studio
            </span>
          )}
        </div>
      )}
    </div>
  );
}