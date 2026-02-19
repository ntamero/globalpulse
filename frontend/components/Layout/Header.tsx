'use client';

import { useState } from 'react';
import {
  Search,
  Globe,
  Monitor,
  MapPin,
  Radio,
  Clock,
  Map,
  Info,
  Menu,
  X,
  Crown,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react';

const navLinks = [
  { label: 'Monitor', href: '#top', icon: Monitor },
  { label: 'Regions', href: '#headlines', icon: MapPin },
  { label: 'Live TV', href: '#live-media', icon: Radio },
  { label: 'Timeline', href: '#timeline', icon: Clock },
  { label: 'Maps', href: '#world-map', icon: Map },
  { label: 'About', href: '#briefing', icon: Info },
];

const languages = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'tr', label: 'Turkce', flag: 'TR' },
  { code: 'ar', label: 'Arabic', flag: 'AR' },
  { code: 'fr', label: 'Francais', flag: 'FR' },
  { code: 'de', label: 'Deutsch', flag: 'DE' },
  { code: 'es', label: 'Espanol', flag: 'ES' },
  { code: 'zh', label: 'Chinese', flag: 'ZH' },
  { code: 'ru', label: 'Russian', flag: 'RU' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const [darkMode, setDarkMode] = useState(true);

  return (
    <header className="bg-dark-900/95 backdrop-blur-md border-b border-dark-700 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto">
        {/* Main Header Row */}
        <div className="flex items-center justify-between h-12 px-3 lg:px-4">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-dark-400 hover:text-dark-200 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Logo */}
            <a href="/" className="flex items-center gap-2 flex-shrink-0">
              <Globe className="w-6 h-6 text-brand-500" />
              <span className="text-lg font-extrabold tracking-tight">
                <span className="text-dark-100">GLOBAL</span>
                <span className="text-brand-500">PULSE</span>
              </span>
              <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 rounded px-1.5 py-0.5 ml-1">
                <span className="live-dot" />
                <span className="text-red-400 text-2xs font-bold uppercase tracking-wider ml-1">
                  Live
                </span>
              </span>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded transition-colors"
                >
                  <link.icon size={14} />
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Right: Search + Controls */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="hidden sm:flex items-center relative">
              {searchOpen ? (
                <div className="flex items-center bg-dark-800 border border-dark-600 rounded-lg overflow-hidden">
                  <Search size={14} className="ml-2.5 text-dark-500" />
                  <input
                    type="text"
                    placeholder="Search events, news..."
                    autoFocus
                    onBlur={() => setSearchOpen(false)}
                    className="bg-transparent border-none outline-none text-sm text-dark-100 placeholder-dark-500 px-2 py-1.5 w-48 lg:w-64"
                  />
                  <kbd className="hidden lg:inline text-2xs text-dark-500 bg-dark-700 rounded px-1.5 py-0.5 mr-2 font-mono">
                    ESC
                  </kbd>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-dark-500 bg-dark-800 border border-dark-700 rounded-lg hover:border-dark-600 transition-colors"
                >
                  <Search size={14} />
                  <span className="hidden lg:inline">Search...</span>
                  <kbd className="hidden lg:inline text-2xs bg-dark-700 rounded px-1 py-0.5 font-mono">
                    /
                  </kbd>
                </button>
              )}
            </div>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-dark-400 hover:text-dark-200 bg-dark-800 border border-dark-700 rounded-lg transition-colors"
              >
                <Globe size={13} />
                <span className="font-medium uppercase">{currentLang}</span>
                <ChevronDown size={12} />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-xl py-1 min-w-[140px] z-50 animate-fade-in">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setCurrentLang(lang.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-dark-700 transition-colors ${
                        currentLang === lang.code ? 'text-brand-400' : 'text-dark-300'
                      }`}
                    >
                      <span className="font-mono text-2xs w-5">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Premium Button */}
            <button className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/20 transition-colors">
              <Crown size={13} />
              <span>Premium</span>
            </button>

            {/* Dark/Light Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-dark-700 bg-dark-900/98 backdrop-blur-md animate-fade-in">
            <nav className="px-3 py-2 space-y-0.5">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-dark-300 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-colors"
                >
                  <link.icon size={16} />
                  {link.label}
                </a>
              ))}
              <div className="pt-2 px-3">
                <div className="flex items-center bg-dark-800 border border-dark-700 rounded-lg overflow-hidden">
                  <Search size={14} className="ml-2.5 text-dark-500" />
                  <input
                    type="text"
                    placeholder="Search events, news..."
                    className="bg-transparent border-none outline-none text-sm text-dark-100 placeholder-dark-500 px-2 py-2 w-full"
                  />
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
