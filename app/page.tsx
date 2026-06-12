import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { DsgvoTrust } from "@/components/DsgvoTrust";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <HeroSection />
        <FeaturesSection />
        <DsgvoTrust />
      </main>
      <Footer />
    </>
  );
}
