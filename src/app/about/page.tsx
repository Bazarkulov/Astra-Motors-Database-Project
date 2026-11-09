import Link from "next/link";
import { ArrowUpRight, MoveUpRight } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function AboutPage() {
  return <><SiteHeader /><main className="page-main"><section className="page-hero about-hero"><div className="page-hero-inner"><span className="eyebrow light">A POINT OF VIEW</span><h1>For the feeling<br /><em>that stays.</em></h1><p>Motors & Heritage is a fictional working name for an independent classic and performance automobile dealership.</p></div></section>
    <section className="about-statement"><span className="eyebrow">OUR PHILOSOPHY</span><div><h2>We believe every remarkable car deserves more than a quick look.</h2><p>It deserves careful consideration, honest information and a conversation with someone who understands why it matters. Our aim is to make room for that experience, from first enquiry to the moment the road opens up.</p></div></section>
    <section className="standards-section"><span className="eyebrow">THE STANDARD WE’RE BUILDING</span><div className="standards-grid"><article><span>01</span><h3>Chosen with intent</h3><p>A thoughtful collection spanning classic, vintage, muscle, sports, performance and expertly modified automobiles.</p></article><article><span>02</span><h3>Clear by nature</h3><p>Vehicle details, condition, records and availability should be shared plainly and verified before a decision.</p></article><article><span>03</span><h3>Personal throughout</h3><p>Buying a special automobile should feel considered. We make time for questions, visits and the right next step.</p></article></div></section>
    <section className="about-placeholder"><div><span className="eyebrow">DEALERSHIP DETAILS</span><h2>Real-world details<br /><em>to be confirmed.</em></h2><p>Company history, address, telephone, opening hours and inspection standards will be updated when the dealership information is provided.</p></div><Link className="button button-dark" href="/contact">Get in touch <MoveUpRight size={15} /></Link></section>
    <section className="contact-callout compact"><span className="eyebrow">START A CONVERSATION</span><h2>Tell us what<br /><em>you’re looking for.</em></h2><Link className="text-link" href="/contact">Contact our team <ArrowUpRight size={15} /></Link></section>
  </main><SiteFooter /></>;
}
