import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { VideoExplainer } from '@/components/home/video-explainer';
import { Features } from '@/components/home/features';
import { SignatureInstructions } from '@/components/home/signature-instructions';
import { ApiIntegration } from '@/components/home/api-integration';
import { Architecture } from '@/components/home/architecture';
import { EidasSection } from '@/components/home/eidas';
import { CtaSection } from '@/components/home/cta';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <VideoExplainer />
        <Features />
        <SignatureInstructions />
        <ApiIntegration />
        <Architecture />
        <EidasSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
