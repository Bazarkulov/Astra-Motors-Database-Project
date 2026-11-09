import Link from "next/link";
import { ArrowUpRight, MoveUpRight } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const vehicleId = typeof params.vehicle === "string" ? params.vehicle : undefined;
  const testDrive = params.type === "test-drive" && Boolean(vehicleId);
  return <><SiteHeader /><main className="page-main"><section className="page-hero contact-hero"><div className="page-hero-inner"><span className="eyebrow light">A GOOD CONVERSATION STARTS HERE</span><h1>Let’s talk<br /><em>about what moves you.</em></h1><p>Ask a question, arrange a visit or tell us about the automobile you have in mind.</p></div></section>
    <section className="contact-layout"><div className="contact-sidebar"><span className="eyebrow">REACH THE TEAM</span><h2>Personal<br /><em>by design.</em></h2><p>Dealership contact details are placeholders until the business information is confirmed.</p><div className="contact-info"><span className="eyebrow">EMAIL</span><p>To be confirmed</p><span className="eyebrow">PHONE</span><p>To be confirmed</p><span className="eyebrow">VISIT</span><p>Business address to be confirmed<br />By appointment</p></div><Link className="text-link" href="/inventory">Browse the collection <ArrowUpRight size={14} /></Link></div><div className="contact-form-wrap"><div className="contact-form-heading"><span className="eyebrow">{testDrive ? "ARRANGE A VISIT" : "YOUR ENQUIRY"}</span><p>{vehicleId ? "Your message will be linked to the vehicle you selected." : "We’ll be in touch as soon as we can."}</p></div><ContactForm vehicleId={vehicleId} testDrive={testDrive} /></div></section>
    <section className="map-placeholder"><span className="map-cross">+</span><span className="eyebrow">SHOWROOM LOCATION TO BE CONFIRMED</span><p>Map details will be added when the dealership address is available.</p><MoveUpRight size={18} /></section>
  </main><SiteFooter /></>;
}
