// src/features/landing/components/LandingFooter.tsx
// Brutalist footer - minimal, raw text, no decorative elements

import { Link } from '@tanstack/react-router';
import type { LandingPageTheme } from '../types';

interface LandingFooterProps {
  theme: LandingPageTheme;
}

export function LandingFooter({ theme }: LandingFooterProps) {
  const hasSocialLinks =
    theme.social_links &&
    Object.values(theme.social_links).some((link) => link);

  const hasContactInfo =
    theme.contact_email || theme.contact_phone || theme.contact_address;

  return (
    <footer className="relative py-16 md:py-24 bg-[#030303]">
      {/* Top harsh line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: `${theme.primary_color}40` }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-4 gap-12 md:gap-8 mb-16">
          {/* Brand */}
          <div className="md:col-span-2">
            {theme.logo_light_url ? (
              <img
                src={theme.logo_light_url}
                alt="The Standard"
                className="h-8 w-auto object-contain mb-6"
              />
            ) : (
              <span
                className="text-2xl font-black tracking-tighter uppercase block mb-6"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: theme.primary_color,
                }}
              >
                THE STANDARD
              </span>
            )}
            <p className="text-white/40 text-sm max-w-xs leading-relaxed">
              Building the next generation of insurance professionals through
              world-class training and support.
            </p>
          </div>

          {/* Contact */}
          {hasContactInfo && (
            <div>
              <h4 className="text-xs font-mono text-white/30 uppercase tracking-widest mb-6">
                Contact
              </h4>
              <div className="space-y-3">
                {theme.contact_email && (
                  <a
                    href={`mailto:${theme.contact_email}`}
                    className="block text-white/50 hover:text-white transition-colors text-sm"
                  >
                    {theme.contact_email}
                  </a>
                )}
                {theme.contact_phone && (
                  <a
                    href={`tel:${theme.contact_phone}`}
                    className="block text-white/50 hover:text-white transition-colors text-sm"
                  >
                    {theme.contact_phone}
                  </a>
                )}
                {theme.contact_address && (
                  <span className="block text-white/50 text-sm">
                    {theme.contact_address}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Links */}
          <div>
            <h4 className="text-xs font-mono text-white/30 uppercase tracking-widest mb-6">
              Links
            </h4>
            <div className="space-y-3">
              {/* Social links as text */}
              {hasSocialLinks && (
                <>
                  {theme.social_links.instagram && (
                    <a
                      href={theme.social_links.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-white/50 hover:text-white transition-colors text-sm"
                    >
                      Instagram →
                    </a>
                  )}
                  {theme.social_links.linkedin && (
                    <a
                      href={theme.social_links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-white/50 hover:text-white transition-colors text-sm"
                    >
                      LinkedIn →
                    </a>
                  )}
                  {theme.social_links.tiktok && (
                    <a
                      href={theme.social_links.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-white/50 hover:text-white transition-colors text-sm"
                    >
                      TikTok →
                    </a>
                  )}
                  {theme.social_links.youtube && (
                    <a
                      href={theme.social_links.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-white/50 hover:text-white transition-colors text-sm"
                    >
                      YouTube →
                    </a>
                  )}
                </>
              )}
              <Link
                to="/terms"
                className="block text-white/30 hover:text-white/60 transition-colors text-sm"
              >
                Terms
              </Link>
              <Link
                to="/privacy"
                className="block text-white/30 hover:text-white/60 transition-colors text-sm"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-white/20 text-xs font-mono">
            © {new Date().getFullYear()} THE STANDARD. ALL RIGHTS RESERVED.
          </p>

          {/* Secondary login link */}
          {(theme.login_access_type === 'footer_link' ||
            theme.login_access_type === 'both') && (
            <Link
              to="/login"
              className="text-white/30 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest"
            >
              Agent Portal →
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
