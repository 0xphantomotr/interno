'use client';

import {AnimatePresence, Variants, motion} from 'framer-motion';
import {useTranslations} from 'next-intl';
import {useCallback, useEffect, useRef, useState} from 'react';
import {FiMenu, FiX} from 'react-icons/fi';

import {Link} from '@/i18n/navigation';

import styles from './Header.module.css';
import {HeaderSearch} from './HeaderSearch';
import {LocaleSwitcher} from './LocaleSwitcher';

export type NavHref =
  | {pathname: '/category/[slug]'; params: {slug: string}}
  | {pathname: '/category/[slug]/[subcategory]'; params: {slug: string; subcategory: string}};

export interface NavLink {
  key: string;
  name: string;
  href: NavHref;
  subcategories?: Array<{
    key: string;
    name: string;
    href: NavHref;
  }>;
}

interface HeaderClientProps {
  navLinks: NavLink[];
}

export const HeaderClient = ({ navLinks }: HeaderClientProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const subscribeInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('Header');
  const closeSubscribe = useCallback(() => {
    setIsSubscribeOpen(false);
    setSubscribeStatus('idle');
    setSubscribeEmail('');
    setSubscribeError(null);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isSubscribeOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSubscribe();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimeout = window.setTimeout(() => {
      subscribeInputRef.current?.focus();
    }, 10);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimeout);
    };
  }, [isSubscribeOpen, closeSubscribe]);

  const sidebarVariants: Variants = {
    closed: { 
      x: "-100%",
      transition: {
        type: "tween",
        duration: 0.3
      }
    },
    open: { 
      x: "0%",
      transition: {
        type: "tween",
        duration: 0.3,
        staggerChildren: 0.07,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    closed: { opacity: 0, x: -20 },
    open: { opacity: 1, x: 0 }
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.topHeader}>
        <div className={styles.container}>
          <div className={styles.leftActions}>
            <button
              onClick={() => setIsMenuOpen(true)}
              className={styles.menuButton}
              aria-label={t('menuButtonLabel')}
            >
              <FiMenu size={24} />
            </button>
          </div>

          <div className={styles.logoContainer}>
            <Link href="/" className={`${styles.logo} font-serif`}>
              INTERNO
            </Link>
          </div>

          <div className={styles.actions}>
            <HeaderSearch />
            <div className={styles.actionButtons}>
              <button
                type="button"
                className={styles.subscribeButton}
                onClick={() => {
                  setIsSubscribeOpen(true);
                  setSubscribeStatus('idle');
                  setSubscribeEmail('');
                  setSubscribeError(null);
                }}
                aria-haspopup="dialog"
                aria-expanded={isSubscribeOpen}
              >
                {t('subscribe')}
              </button>
              <LocaleSwitcher className={styles.localeSwitcherControl} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.navContainer}>
        <nav className={styles.mainNav}>
          <ul className={styles.navList}>
            {navLinks.map((link) => {
              const hasSubcategories = Boolean(link.subcategories && link.subcategories.length > 0);
              return (
                <li
                  key={link.key}
                  className={`${styles.navItem} ${hasSubcategories ? styles.navItemWithDropdown : ''}`}
                >
                  <Link
                    href={link.href}
                    className={styles.navLink}
                    aria-haspopup={hasSubcategories ? 'true' : undefined}
                  >
                    {link.name}
                  </Link>
                  {hasSubcategories ? (
                    <div className={styles.navDropdown}>
                      <ul className={styles.navDropdownList}>
                        {link.subcategories!.map((subcategory) => (
                          <li key={subcategory.key} className={styles.navDropdownItem}>
                            <Link href={subcategory.href} className={styles.navDropdownLink}>
                              {subcategory.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
            />
            
            <motion.div 
              className={styles.sidebar}
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <div className={styles.sidebarHeader}>
                <button
                  aria-label={t('closeMenuLabel')}
                  onClick={() => setIsMenuOpen(false)}
                  className={styles.closeSidebar}
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <nav className={styles.sidebarNav}>
                <ul className={styles.sidebarList}>
                  {navLinks.map((link) => (
                    <motion.li
                      key={link.key}
                      variants={itemVariants}
                      className={styles.sidebarItem}
                    >
                      <Link
                        href={link.href}
                        className={styles.sidebarLink}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.name}
                      </Link>
                      {link.subcategories && link.subcategories.length > 0 ? (
                        <ul className={styles.sidebarSubList}>
                          {link.subcategories.map((subcategory) => (
                            <li key={subcategory.key} className={styles.sidebarSubListItem}>
                      <Link
                        href={subcategory.href}
                        className={styles.sidebarSubLink}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {subcategory.name}
                      </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </motion.li>
                  ))}
                </ul>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSubscribeOpen && (
          <>
            <motion.div
              className={styles.modalBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSubscribe}
            />
            <motion.div
              className={styles.subscribeModalWrapper}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className={styles.subscribeModal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="subscribe-dialog-title"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className={styles.subscribeModalHeader}>
                  <h2 id="subscribe-dialog-title" className={`${styles.subscribeTitle} font-serif`}>
                    {t('subscribeModalTitle')}
                  </h2>
                  <button
                    type="button"
                    className={styles.closeSubscribe}
                    onClick={closeSubscribe}
                    aria-label={t('closeSubscribeLabel')}
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <p className={styles.subscribeSubtitle}>{t('subscribeModalSubtitle')}</p>
                <form
                  className={styles.subscribeForm}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const trimmedEmail = subscribeEmail.trim();
                    if (!trimmedEmail) {
                      setSubscribeError(t('errors.emptyEmail'));
                      setSubscribeStatus('error');
                      subscribeInputRef.current?.focus();
                      return;
                    }
                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailPattern.test(trimmedEmail)) {
                      setSubscribeError(t('errors.invalidEmail'));
                      setSubscribeStatus('error');
                      subscribeInputRef.current?.focus();
                      return;
                    }

                    try {
                      setSubscribeStatus('loading');
                      setSubscribeError(null);
                      const response = await fetch('/api/subscribe', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: trimmedEmail }),
                      });

                      if (!response.ok) {
                        let message = t('errors.serverMessage');
                        try {
                          const data = await response.json();
                          if (typeof data?.message === 'string') {
                            message = data.message;
                          }
                        } catch {
                          // ignore JSON parse errors
                        }
                        setSubscribeStatus('error');
                        setSubscribeError(message);
                        subscribeInputRef.current?.focus();
                        return;
                      }

                      setSubscribeStatus('success');
                      setSubscribeEmail('');
                    } catch (error) {
                      console.error('[HeaderClient] Subscribe failed:', error);
                      setSubscribeStatus('error');
                      setSubscribeError(t('errors.unknown'));
                      subscribeInputRef.current?.focus();
                    }
                  }}
                >
                  <div className={styles.subscribeField}>
                    <input
                      ref={subscribeInputRef}
                      type="email"
                      required
                      value={subscribeEmail}
                      onChange={(event) => {
                        setSubscribeEmail(event.target.value);
                        if (subscribeStatus !== 'idle') {
                          setSubscribeStatus('idle');
                        }
                        if (subscribeError) {
                          setSubscribeError(null);
                        }
                      }}
                      placeholder={t('emailPlaceholder')}
                      aria-label={t('emailAriaLabel')}
                      disabled={subscribeStatus === 'loading'}
                    />
                    <button type="submit" disabled={subscribeStatus === 'loading'}>
                      {subscribeStatus === 'loading' ? t('submitting') : t('submit')}
                    </button>
                  </div>
                  {subscribeStatus === 'success' && (
                    <p className={styles.subscribeMessage} aria-live="polite">
                      {t('successMessage')}
                    </p>
                  )}
                  {subscribeStatus === 'error' && subscribeError && (
                    <p className={styles.subscribeError} aria-live="assertive">
                      {subscribeError}
                    </p>
                  )}
                </form>
                <p className={styles.subscribeFooterText}>{t('privacyNotice')}</p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
