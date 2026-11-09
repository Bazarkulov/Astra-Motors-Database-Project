import Link from "next/link";
import { Suspense } from "react";
import { ArrowDown, ArrowUpRight, MoveUpRight } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { HomepageCollection, HomepageCollectionFallback } from "@/components/vehicles/homepage-collection";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-index"><span>INDEPENDENT AUTOMOTIVE COLLECTION</span><span>01 / 04 — THE COLLECTION</span></div>
          <div className="hero-copy"><p className="eyebrow light">FOR THE LOVE OF THE DRIVE</p><h1>Machines with<br /><em>meaning.</em></h1><p className="hero-description">A considered collection of classic, vintage and performance automobiles. Each one chosen for the story it carries and the road ahead.</p><Link className="button button-light" href="/inventory">Explore the collection <MoveUpRight size={16} /></Link></div>
          <div className="hero-art" aria-hidden="true"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-car"><span>M&H</span></div><div className="hero-art-note">FORM FOLLOWS<br />FEELING</div><span className="hero-art-caption">A NEW PERSPECTIVE ON THE AUTOMOBILE</span></div>
          <a className="hero-scroll" href="#collection"><ArrowDown size={15} /> SCROLL TO DISCOVER</a>
          <div className="hero-rail">CLASSIC <span>·</span> PERFORMANCE <span>·</span> COLLECTOR</div>
        </section>

        <section className="intro-band"><span className="eyebrow">THE ART OF THE AUTOMOBILE</span><p>Not simply what a car is.<br /><em>What it makes you feel.</em></p><Link href="/about" className="text-link">Our point of view <ArrowUpRight size={15} /></Link></section>

        <Suspense fallback={<HomepageCollectionFallback />}><HomepageCollection /></Suspense>

        <section className="manifesto"><div className="manifesto-number">02</div><div><span className="eyebrow light">A DIFFERENT KIND OF DEALERSHIP</span><h2>Some things are<br />better <em>in motion.</em></h2></div><div className="manifesto-bottom"><p>We bring together remarkable automobiles with thoughtful guidance, clear provenance and the time to make the right connection.</p><Link className="button button-outline-light" href="/about">What we believe <MoveUpRight size={16} /></Link></div><div className="manifesto-ring" aria-hidden="true" /></section>

        <section className="contact-callout"><span className="eyebrow">THE NEXT CHAPTER IS YOURS</span><h2>Looking for<br /><em>something specific?</em></h2><p>Tell us what moves you. We would be glad to help you find it.</p><Link className="button button-dark" href="/contact">Talk with our team <MoveUpRight size={16} /></Link></section>
      </main>
      <SiteFooter />
    </>
  );
}
