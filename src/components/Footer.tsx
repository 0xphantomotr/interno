'use client';

import {useTranslations} from 'next-intl';
import {FormEvent, useState} from 'react';
import {FiFacebook, FiInstagram, FiMail} from 'react-icons/fi';
import {SiTiktok} from 'react-icons/si';

import {Link} from '@/i18n/navigation';
import type {Category} from '@/sanity/lib/queries';

import styles from './Footer.module.css';

type FooterProps = {
  categories: Category[];
};

const Footer = ({categories}: FooterProps) => {
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const t = useTranslations('Footer');
  const headerT = useTranslations('Header');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setSubscribeStatus('error');
      setSubscribeError(headerT('errors.emptyEmail'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setSubscribeStatus('error');
      setSubscribeError(headerT('errors.invalidEmail'));
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
        body: JSON.stringify({email: trimmedEmail}),
      });

      if (!response.ok) {
        let message = headerT('errors.serverMessage');
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
        return;
      }

      setSubscribeStatus('success');
      setSubscribeError(null);
      setEmail('');
    } catch (error) {
      console.error('[Footer] Subscribe failed:', error);
      setSubscribeStatus('error');
      setSubscribeError(headerT('errors.unknown'));
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.newsletterContainer}>
          <h2 className={styles.newsletterTitle}>{t('newsletterTitle')}</h2>
          <p className={styles.newsletterText}>{t('newsletterDescription')}</p>
          
          <form className={styles.newsletterForm} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')} 
                className={styles.emailInput}
                required 
                aria-label={headerT('emailAriaLabel')}
                disabled={subscribeStatus === 'loading'}
              />
              <button
                type="submit"
                className={styles.submitButton}
                disabled={subscribeStatus === 'loading'}
              >
                 {subscribeStatus === 'loading' ? headerT('submitting') : t('subscribe')}
              </button>
            </div>
            {subscribeStatus === 'success' ? (
              <p className={styles.newsletterMessage} aria-live="polite">
                {headerT('successMessage')}
              </p>
            ) : null}
            {subscribeStatus === 'error' && subscribeError ? (
              <p className={styles.newsletterError} aria-live="assertive">
                {subscribeError}
              </p>
            ) : null}
          </form>
        </div>
        
        <div className={styles.footerGrid}>
          <div className={styles.categoriesSection}>
            <h3 className={styles.columnTitle}>{t('navigationTitle')}</h3>
            <nav className={styles.categoryColumns} aria-label={t('navigationTitle')}>
              {categories.length > 0 ? (
                (() => {
                  const columns = 2;
                  const perColumn = Math.ceil(categories.length / columns);
                  return Array.from({length: columns}).map((_, columnIndex) => (
                    <ul key={`category-column-${columnIndex}`} className={styles.linkList}>
                      {categories
                        .slice(columnIndex * perColumn, columnIndex * perColumn + perColumn)
                        .map((category) => (
                          <li key={category._id}>
                            <Link
                              href={{
                                pathname: '/category/[slug]',
                                params: {slug: category.slug.current},
                              }}
                              className={styles.footerLink}
                            >
                              {category.title || category.slug.current}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  ));
                })()
              ) : (
                <ul className={styles.linkList}>
                  <li className={styles.footerLinkFallback}>{t('links.fallback')}</li>
                </ul>
              )}
            </nav>
          </div>

          <div className={styles.contactSection}>
            <h3 className={styles.columnTitle}>{t('contactTitle')}</h3>
            <div className={styles.socialLinks}>
              <a
                href="https://www.instagram.com/internomagazine/"
                className={styles.socialLink}
                aria-label={t('social.instagram')}
                target="_blank"
                rel="noreferrer"
              >
                <FiInstagram />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61578182804754"
                className={styles.socialLink}
                aria-label={t('social.facebook')}
                target="_blank"
                rel="noreferrer"
              >
                <FiFacebook />
              </a>
              <a
                href="https://www.tiktok.com/@internomagazine/"
                className={styles.socialLink}
                aria-label={t('social.tiktok')}
                target="_blank"
                rel="noreferrer"
              >
                <SiTiktok />
              </a>
              <a
                href="mailto:internomagazine@gmail.com"
                className={styles.socialLink}
                aria-label={t('social.email')}
              >
                <FiMail />
              </a>
            </div>
          </div>
        </div>
        
        <div className={styles.footerBottom}>
          <p>{t('copyright', {year: new Date().getFullYear()})}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 
