import type { Metadata } from 'next';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>
            <NavigationProgress />
            {children}
            <Toaster position="top-right" richColors duration={3000} />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
