import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with Uganda properties...\n");

  // ==================== ADMIN USER ====================
  const adminHash = await bcrypt.hash("Admin@123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@homefind.com" },
    update: { passwordHash: adminHash },
    create: {
      email: "admin@homefind.com",
      name: "Super Admin",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log("✅ Admin created:", admin.email);

  const agentHash = await bcrypt.hash("Agent@123!", 12);
  const agent = await prisma.user.upsert({
    where: { email: "agent@homefind.com" },
    update: { passwordHash: agentHash },
    create: {
      email: "agent@homefind.com",
      name: "David Mukasa",
      passwordHash: agentHash,
      role: "AGENT",
      phone: "+256 700 123 456",
      bio: "Senior property consultant with 8 years experience in Kampala's premium real estate market.",
      isActive: true,
    },
  });
  console.log("✅ Agent created:", agent.email);

  // ==================== SITE SETTINGS ====================
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      siteName: "HomeFind",
      tagline: "Find Your Perfect Home in Uganda",
      phone: "+256 700 000 000",
      email: "info@homefind.ug",
      address: "Plot 22, Acacia Avenue, Kololo, Kampala, Uganda",
      whatsappNumber: "256700000000",
      notificationEmail: "admin@homefind.com",
    },
  });
  console.log("✅ Site settings initialized");

  // ==================== AMENITIES ====================
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

  const parking = await prisma.amenity.findFirst({ where: { name: "Parking" } });
  const pool = await prisma.amenity.findFirst({ where: { name: "Swimming Pool" } });
  const security = await prisma.amenity.findFirst({ where: { name: "24/7 Security" } });
  const generator = await prisma.amenity.findFirst({ where: { name: "Generator Backup" } });
  const wifi = await prisma.amenity.findFirst({ where: { name: "Fibre Internet" } });
  const garden = await prisma.amenity.findFirst({ where: { name: "Garden" } });
  const furnished = await prisma.amenity.findFirst({ where: { name: "Furnished" } });
  const sq = await prisma.amenity.findFirst({ where: { name: "Servant Quarters" } });
  const gym = await prisma.amenity.findFirst({ where: { name: "Gym / Fitness Center" } });
  const cctv = await prisma.amenity.findFirst({ where: { name: "CCTV" } });

  // ==================== PROPERTIES ====================
  const properties = [
    {
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
      description: "<h2>Exceptional Living in Kololo</h2><p>This stunning 3-bedroom apartment sits in one of Kampala's most prestigious neighbourhoods. Floor-to-ceiling windows flood every room with natural light while offering breathtaking views of the city skyline. The open-plan living and dining area seamlessly connects to a private balcony, perfect for entertaining. The gourmet kitchen features Italian marble countertops, high-end appliances, and ample storage.</p>",
      address: "Plot 45, Kololo Hill Drive",
      city: "Kampala",
      area: "Kololo",
      country: "Uganda",
      latitude: 0.3322,
      longitude: 32.5827,
      isFeatured: true,
      publishedAt: new Date(),
      media: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
      amenityIds: [parking?.id, pool?.id, security?.id, generator?.id, wifi?.id].filter(Boolean) as string[],
    },
    {
      slug: "modern-5bed-mansion-naguru-kampala",
      title: "Modern 5-Bedroom Mansion in Naguru",
      listingType: "SALE",
      category: "RESIDENTIAL",
      propertyType: "House",
      status: "PUBLISHED",
      price: 650000,
      currency: "USD",
      priceNegotiable: false,
      bedrooms: 5,
      bathrooms: 4,
      parkingSpaces: 4,
      squareFootage: 4200,
      yearBuilt: 2020,
      furnishingStatus: "Semi-Furnished",
      description: "<h2>Grand Living in Naguru Heights</h2><p>This magnificent 5-bedroom mansion offers unparalleled luxury in Naguru's most sought-after residential enclave. Set on a half-acre landscaped plot, the property boasts a sparkling swimming pool, a spacious entertainment terrace, and a lush tropical garden. The grand entrance hall leads to expansive living areas designed with Italian finishes throughout. Servant quarters and a double garage complete this extraordinary home.</p>",
      address: "Plot 12, Naguru Drive",
      city: "Kampala",
      area: "Naguru",
      country: "Uganda",
      latitude: 0.3412,
      longitude: 32.5913,
      isFeatured: true,
      publishedAt: new Date(),
      media: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      amenityIds: [parking?.id, pool?.id, security?.id, generator?.id, garden?.id, sq?.id, cctv?.id].filter(Boolean) as string[],
    },
    {
      slug: "commercial-office-suite-nakasero-kampala",
      title: "Premium Office Suite in Nakasero CBD",
      listingType: "RENT",
      category: "COMMERCIAL",
      propertyType: "Office",
      status: "PUBLISHED",
      price: 4500,
      currency: "USD",
      priceNegotiable: true,
      bedrooms: 0,
      bathrooms: 2,
      parkingSpaces: 5,
      squareFootage: 2200,
      yearBuilt: 2019,
      description: "<h2>Prime Commercial Space in the Heart of Kampala</h2><p>This beautifully fitted office suite is located in a landmark Grade-A building in Nakasero, Kampala's premier business district. The space spans an entire floor with open-plan capacity for 30+ workstations, a boardroom, private offices, and a kitchenette. High-speed fibre internet, 24/7 backup power, and secure underground parking make this the ideal base for serious enterprises.</p>",
      address: "Plot 7, Parliamentary Avenue",
      city: "Kampala",
      area: "Nakasero",
      country: "Uganda",
      latitude: 0.3163,
      longitude: 32.5822,
      isFeatured: true,
      publishedAt: new Date(),
      media: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
      amenityIds: [parking?.id, security?.id, generator?.id, wifi?.id, cctv?.id].filter(Boolean) as string[],
    },
    {
      slug: "cozy-2bed-apartment-bugolobi-kampala",
      title: "Cozy 2-Bedroom Apartment in Bugolobi",
      listingType: "RENT",
      category: "RESIDENTIAL",
      propertyType: "Apartment",
      status: "PUBLISHED",
      price: 1200,
      currency: "USD",
      priceNegotiable: false,
      bedrooms: 2,
      bathrooms: 2,
      parkingSpaces: 1,
      squareFootage: 1100,
      yearBuilt: 2018,
      furnishingStatus: "Fully Furnished",
      description: "<h2>Stylish Apartment in Bugolobi</h2><p>A beautifully appointed 2-bedroom apartment in the vibrant Bugolobi neighbourhood. Perfect for young professionals or small families, this home features a modern open kitchen, a spacious living area, and a private balcony. The building has 24/7 security, a backup generator, and covered parking. Walking distance to Bugolobi Market and major supermarkets.</p>",
      address: "Plot 34, Luthuli Avenue",
      city: "Kampala",
      area: "Bugolobi",
      country: "Uganda",
      latitude: 0.3187,
      longitude: 32.6021,
      isFeatured: false,
      publishedAt: new Date(),
      media: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      amenityIds: [parking?.id, security?.id, generator?.id, wifi?.id, furnished?.id].filter(Boolean) as string[],
    },
    {
      slug: "land-plot-munyonyo-kampala",
      title: "Prime Land Plot in Munyonyo — Lake View",
      listingType: "SALE",
      category: "LAND",
      propertyType: "Land",
      status: "PUBLISHED",
      price: 180000,
      currency: "USD",
      priceNegotiable: true,
      squareFootage: 21780, // half acre in sqft
      description: "<h2>Rare Lake Victoria View Plot in Munyonyo</h2><p>An exceptional opportunity to acquire a prime half-acre plot on elevated ground in Munyonyo, with direct views of Lake Victoria. This mailo land title plot sits in a serene gated neighbourhood, just minutes from Speke Resort and the Commonwealth Resort. Ideal for developing a luxury private residence or boutique hospitality facility. All utilities available at the perimeter.</p>",
      address: "Munyonyo Road, Off Gaba Road",
      city: "Kampala",
      area: "Munyonyo",
      country: "Uganda",
      latitude: 0.2561,
      longitude: 32.6143,
      isFeatured: true,
      publishedAt: new Date(),
      media: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
      amenityIds: [],
    },
    {
      slug: "studio-apartment-ntinda-kampala",
      title: "Modern Studio Apartment in Ntinda",
      listingType: "RENT",
      category: "RESIDENTIAL",
      propertyType: "Studio",
      status: "PUBLISHED",
      price: 550,
      currency: "USD",
      priceNegotiable: false,
      bedrooms: 1,
      bathrooms: 1,
      parkingSpaces: 1,
      squareFootage: 520,
      yearBuilt: 2022,
      furnishingStatus: "Fully Furnished",
      description: "<h2>Smart Studio Living in Ntinda</h2><p>A fully furnished smart studio apartment perfect for a young professional or student. Located in the heart of Ntinda, this modern unit features a well-equipped kitchenette, a full bathroom, fast fibre internet, and access to a shared rooftop terrace. The building has CCTV and 24/7 security personnel.</p>",
      address: "Plot 88, Ntinda Road",
      city: "Kampala",
      area: "Ntinda",
      country: "Uganda",
      latitude: 0.3453,
      longitude: 32.6134,
      isFeatured: false,
      publishedAt: new Date(),
      media: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      amenityIds: [parking?.id, security?.id, wifi?.id, furnished?.id, cctv?.id].filter(Boolean) as string[],
    },
    {
      slug: "commercial-retail-space-entebbe-road",
      title: "Retail Shop Space on Entebbe Road",
      listingType: "RENT",
      category: "COMMERCIAL",
      propertyType: "Retail",
      status: "PUBLISHED",
      price: 2200,
      currency: "USD",
      priceNegotiable: true,
      parkingSpaces: 3,
      squareFootage: 1500,
      description: "<h2>High-Footfall Retail Space on Entebbe Road</h2><p>A well-positioned ground-floor retail space on the busy Entebbe Road corridor. Featuring a wide glass frontage, open floor plan, a back office, and two restrooms. Generator backup and security are provided by the building. High vehicular and pedestrian traffic makes this ideal for a supermarket, pharmacy, showroom, or restaurant.</p>",
      address: "Plot 5, Entebbe Road",
      city: "Kampala",
      area: "Kibuye",
      country: "Uganda",
      latitude: 0.2988,
      longitude: 32.5712,
      isFeatured: false,
      publishedAt: new Date(),
      media: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
      amenityIds: [parking?.id, security?.id, generator?.id, cctv?.id].filter(Boolean) as string[],
    },
    {
      slug: "4bed-townhouse-muyenga-kampala",
      title: "4-Bedroom Townhouse in Muyenga",
      listingType: "SALE",
      category: "RESIDENTIAL",
      propertyType: "Townhouse",
      status: "PUBLISHED",
      price: 320000,
      currency: "USD",
      priceNegotiable: false,
      bedrooms: 4,
      bathrooms: 3,
      parkingSpaces: 2,
      squareFootage: 2800,
      yearBuilt: 2020,
      furnishingStatus: "Unfurnished",
      description: "<h2>Elegant Townhouse in Muyenga Tank Hill Area</h2><p>This spacious 4-bedroom townhouse is nestled on a quiet lane in Muyenga, one of Kampala's most desirable hillside neighbourhoods. Spread over three floors, the home offers generous living areas, a rooftop terrace with panoramic city views, and a private garden. Master bedroom has an ensuite with a jacuzzi bath. The development is fully gated with 24/7 security and a backup generator.</p>",
      address: "Plot 9, Tank Hill Road",
      city: "Kampala",
      area: "Muyenga",
      country: "Uganda",
      latitude: 0.2901,
      longitude: 32.5989,
      isFeatured: true,
      publishedAt: new Date(),
      media: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      amenityIds: [parking?.id, security?.id, generator?.id, garden?.id, wifi?.id, sq?.id].filter(Boolean) as string[],
    },
  ];

  for (const prop of properties) {
    const { media, amenityIds, ...data } = prop;
    await prisma.property.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        agentId: agent.id,
        media: {
          create: [{
            url: media,
            publicId: `property-${data.slug}`,
            type: "IMAGE",
            isFeatured: true,
            sortOrder: 0,
          }],
        },
        amenities: {
          create: amenityIds.map((id) => ({ amenityId: id })),
        },
      },
    });
    console.log(`✅ Property: ${data.title}`);
  }

  // ==================== TESTIMONIALS ====================
  const testimonials = [
    { clientName: "Sarah Nakato", clientTitle: "Homeowner, Kampala", rating: 5, text: "HomeFind made finding our dream home in Kololo absolutely effortless. Their team was professional, responsive, and truly understood what we were looking for.", isActive: true, sortOrder: 1 },
    { clientName: "James Mugisha", clientTitle: "Property Investor", rating: 5, text: "I've worked with many agencies across Uganda, but HomeFind stands out for their deep market knowledge and transparent communication. Highly recommended for investors.", isActive: true, sortOrder: 2 },
    { clientName: "Grace & Peter Ouma", clientTitle: "First-time Buyers", rating: 5, text: "As first-time buyers, we were nervous about the process. Our HomeFind agent guided us through every step and we couldn't be happier with our new home in Naguru!", isActive: true, sortOrder: 3 },
    { clientName: "Dr. Amara Ssemwogerere", clientTitle: "Business Owner", rating: 5, text: "Found the perfect office space in Nakasero through HomeFind. The process was smooth and the team was extremely knowledgeable about commercial leasing in Kampala.", isActive: true, sortOrder: 4 },
  ];
  for (const t of testimonials) {
    await prisma.testimonial.create({ data: t }).catch(() => {});
  }
  console.log(`✅ ${testimonials.length} testimonials seeded`);

  console.log("\n🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
