import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Showcase from '@/components/Showcase';
import Services from '@/components/Services';
import Network from '@/components/Network';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

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
