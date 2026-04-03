import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Super Admin ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Admin@123!", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@prestigeproperties.com" },
    update: {},
    create: {
      email: "admin@prestigeproperties.com",
      name: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log("✅ Super Admin created:", superAdmin.email);

  // ── Agent ────────────────────────────────────────────────
  const agentHash = await bcrypt.hash("Agent@123!", 12);
  const agent = await prisma.user.upsert({
    where: { email: "agent@prestigeproperties.com" },
    update: {},
    create: {
      email: "agent@prestigeproperties.com",
      name: "John Williams",
      passwordHash: agentHash,
      role: "AGENT",
      phone: "+1 (234) 567-8901",
      bio: "Experienced property agent with over 8 years specialising in residential and commercial properties.",
      isActive: true,
    },
  });
  console.log("✅ Agent created:", agent.email);

  // ── Site Settings ────────────────────────────────────────
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      siteName: "Prestige Properties",
      tagline: "Exceptional Properties. Exceptional Service.",
      phone: "+1 (234) 567-8900",
      email: "info@prestigeproperties.com",
      address: "123 Business District, Suite 400, Kampala, Uganda",
      whatsappNumber: "1234567890",
      notificationEmail: "admin@prestigeproperties.com",
    },
  });
  console.log("✅ Site settings initialized");

  // ── Amenities ────────────────────────────────────────────
  const amenitiesData = [
    { name: "Parking", icon: "Car", category: "General" },
    { name: "Swimming Pool", icon: "Waves", category: "Recreation" },
    { name: "Gym / Fitness Center", icon: "Dumbbell", category: "Recreation" },
    { name: "Garden", icon: "Trees", category: "Outdoor" },
    { name: "24/7 Security", icon: "Shield", category: "Security" },
    { name: "Balcony", icon: "Home", category: "General" },
    { name: "Furnished", icon: "Sofa", category: "General" },
    { name: "Generator Backup", icon: "Zap", category: "Utilities" },
    { name: "Fibre Internet", icon: "Wifi", category: "Utilities" },
    { name: "CCTV", icon: "Camera", category: "Security" },
    { name: "Elevator", icon: "ArrowUpDown", category: "General" },
    { name: "Air Conditioning", icon: "Wind", category: "General" },
    { name: "Borehole / Water Storage", icon: "Droplets", category: "Utilities" },
    { name: "Servant Quarters", icon: "Home", category: "General" },
    { name: "Children's Play Area", icon: "Star", category: "Recreation" },
  ];

  for (const amenity of amenitiesData) {
    await prisma.amenity.upsert({
      where: { name: amenity.name },
      update: {},
      create: amenity,
    });
  }
  console.log(`✅ ${amenitiesData.length} amenities seeded`);

  // ── Sample Testimonials ──────────────────────────────────
  const testimonials = [
    {
      clientName: "Sarah Johnson",
      clientTitle: "Homeowner",
      rating: 5,
      text: "Prestige Properties made finding our dream home effortless. Their team was professional, responsive, and truly understood what we were looking for.",
      isActive: true,
      sortOrder: 1,
    },
    {
      clientName: "Michael Okonkwo",
      clientTitle: "Property Investor",
      rating: 5,
      text: "I've worked with many agencies, but Prestige stands out for their market knowledge and transparent communication. Highly recommended for investors.",
      isActive: true,
      sortOrder: 2,
    },
    {
      clientName: "Emma & David Chen",
      clientTitle: "First-time Buyers",
      rating: 5,
      text: "As first-time buyers, we were nervous about the process. Our agent guided us through every step and we couldn't be happier with our new home!",
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const t of testimonials) {
    await prisma.testimonial.create({ data: t }).catch(() => {});
  }
  console.log(`✅ ${testimonials.length} testimonials seeded`);

  // ── Sample FAQs ──────────────────────────────────────────
  const faqs = [
    {
      question: "How do I schedule a property viewing?",
      answer: "<p>You can schedule a viewing by clicking the &ldquo;Inquire About This Property&rdquo; button on any listing, or by calling us directly. Our agents will arrange a convenient time within 24–48 hours.</p>",
      category: "Viewings",
      sortOrder: 1,
    },
    {
      question: "What documents do I need to buy a property?",
      answer: "<p>For purchasing a property, you&rsquo;ll typically need: valid government-issued ID, proof of income or bank statements, tax identification number, and proof of address. Our agents will guide you through the specific requirements.</p>",
      category: "Buying",
      sortOrder: 2,
    },
    {
      question: "Do you offer property management services?",
      answer: "<p>Yes! We offer comprehensive property management services including tenant screening, rent collection, maintenance coordination, and regular property inspections. Contact us for a bespoke management package.</p>",
      category: "Services",
      sortOrder: 3,
    },
    {
      question: "How long does it take to complete a property purchase?",
      answer: "<p>The timeline varies depending on the transaction type. Cash purchases typically complete in 2–4 weeks, while mortgage-backed purchases can take 6–12 weeks. Our team works to expedite the process wherever possible.</p>",
      category: "Buying",
      sortOrder: 4,
    },
  ];

  for (const faq of faqs) {
    await prisma.fAQ.create({ data: faq }).catch(() => {});
  }
  console.log(`✅ ${faqs.length} FAQs seeded`);

  // ── Sample Property ──────────────────────────────────────
  const parkingAmenity = await prisma.amenity.findFirst({ where: { name: "Parking" } });
  const poolAmenity = await prisma.amenity.findFirst({ where: { name: "Swimming Pool" } });

  await prisma.property.upsert({
    where: { slug: "luxury-3bed-apartment-kololo-kampala" },
    update: {},
    create: {
      slug: "luxury-3bed-apartment-kololo-kampala",
      title: "Luxury 3-Bedroom Apartment in Kololo",
      listingType: "SALE",
      category: "RESIDENTIAL",
      propertyType: "Apartment",
      status: "PUBLISHED",
      price: 285000,
      currency: "USD",
      priceNegotiable: true,
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 2,
      squareFootage: 1850,
      yearBuilt: 2021,
      furnishingStatus: "Fully Furnished",
      description: "<h2>Exceptional Living in Kololo</h2><p>This stunning 3-bedroom apartment represents the pinnacle of modern luxury living in one of Kampala&rsquo;s most prestigious neighbourhoods. Floor-to-ceiling windows flood every room with natural light while offering breathtaking views of the city skyline.</p><p>The open-plan living and dining area seamlessly connects to a private balcony, perfect for entertaining. The gourmet kitchen features Italian marble countertops, high-end appliances, and ample storage.</p>",
      address: "Plot 45, Kololo Hill Drive",
      city: "Kampala",
      area: "Kololo",
      country: "Uganda",
      latitude: 0.3322,
      longitude: 32.5827,
      isFeatured: true,
      publishedAt: new Date(),
      agentId: agent.id,
      amenities: {
        create: [
          ...(parkingAmenity ? [{ amenityId: parkingAmenity.id }] : []),
          ...(poolAmenity ? [{ amenityId: poolAmenity.id }] : []),
        ],
      },
    },
  });
  console.log("✅ Sample property seeded");

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📋 Login credentials:");
  console.log("   Super Admin: admin@prestigeproperties.com / Admin@123!");
  console.log("   Agent:       agent@prestigeproperties.com / Agent@123!");
  console.log("\n⚠️  CHANGE THESE PASSWORDS IMMEDIATELY after first login!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
