import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Showcase from '@/components/landing/Showcase';
import Services from '@/components/landing/Services';
import Network from '@/components/landing/Network';
import Contact from '@/components/landing/Contact';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <Navbar />
      <Hero />
      <Showcase />
      <Services />
      <Network />
      <Contact />
      <Footer />
    </div>
  );
}
