import type { Metadata } from 'next';
import { Suspense } from 'react';
import Script from 'next/script';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { Toaster } from 'sonner';
import { NavigationProgress } from '@/components/layout/navigation-progress';

export const metadata: Metadata = {
  title: {
    default: 'DocSignerHub — eSign Platform',
    template: '%s | DocSignerHub',
  },
  description:
    'Legally binding electronic signature platform. eIDAS compliant. API-first multi-tenant SaaS.',
  keywords: ['e-signature', 'document signing', 'eIDAS', 'API', 'SaaS'],
};

const GA_ID = 'G-JZ6BZLYTVF';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            {children}
            <Toaster position="top-right" richColors duration={3000} />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
