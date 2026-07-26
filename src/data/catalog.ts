export type CurrencyCode = "USD";
export type CountryCode = "US" | "CA";
export type ProductType = "furniture" | "lighting" | "textile";
export type ImageRole = "hero" | "alternate" | "detail" | "context" | "lifestyle";
export type AssemblyLevel = "none" | "light" | "moderate" | "professional";
export type ProductSort = "featured" | "newest" | "name" | "price-asc" | "price-desc";

export interface CatalogImage {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly role: ImageRole;
  readonly sourcePageUrl: string;
  readonly creatorName: string;
}

export interface LinearDimensions {
  readonly widthIn: number;
  readonly heightIn: number;
  readonly depthIn: number;
}

export interface PackageDimensions extends LinearDimensions {
  readonly packageId: string;
  readonly weightLb: number;
}

export interface SeatDimensions {
  readonly widthIn: number;
  readonly heightIn: number;
  readonly depthIn: number;
}

export interface ProductDimensions {
  readonly overall: LinearDimensions;
  readonly itemWeightLb: number;
  readonly packages: readonly PackageDimensions[];
  readonly seat?: SeatDimensions;
  readonly cordLengthIn?: number;
}

export interface WillItFit {
  readonly minimumDoorwayWidthIn: number;
  readonly recommendedPathWidthIn: number;
  readonly elevatorRecommended: boolean;
  readonly componentBreakdown: string;
  readonly notes: string;
}

export interface ComfortDetails {
  readonly feel: "structured" | "balanced" | "relaxed";
  readonly support: string;
  readonly cushionFill: string;
  readonly posture: string;
}

export interface AssemblyDetails {
  readonly required: boolean;
  readonly level: AssemblyLevel;
  readonly estimatedMinutes: number;
  readonly description: string;
  readonly professionalInstallationAvailable: boolean;
}

export interface SeoMetadata {
  readonly title: string;
  readonly description: string;
}

export interface SiteSettings {
  readonly brandName: string;
  readonly wordmark: string;
  readonly tagline: string;
  readonly positioning: string;
  readonly story: string;
  readonly locale: "en-US";
  readonly currency: CurrencyCode;
  readonly primaryMarket: CountryCode;
  readonly shipsTo: readonly CountryCode[];
  readonly commerceMode: "consultation-only";
  readonly primaryCtaLabel: string;
  readonly primaryCtaHref: string;
  readonly announcement: string;
  readonly contactEmail: string;
  readonly socialHandle: string;
  readonly heroMedia: readonly CatalogImage[];
  readonly seo: SeoMetadata;
}

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly kind: "catalog" | "editorial" | "service" | "utility";
  readonly featured: boolean;
}

export interface Policy {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly details: readonly string[];
}

export type InquiryFieldId =
  | "designService"
  | "scope"
  | "postalCode"
  | "timeline"
  | "investment"
  | "fullName"
  | "email"
  | "phone"
  | "notes";

export interface InquiryStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly fields: readonly InquiryFieldId[];
}

export interface InquiryOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface InvestmentOption extends InquiryOption {
  readonly minimumMinor: number;
  readonly maximumMinor: number | null;
  readonly currency: CurrencyCode;
}

export interface InquiryConfig {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly responseExpectation: string;
  readonly privacyNote: string;
  readonly steps: readonly [InquiryStep, InquiryStep];
  readonly serviceOptions: readonly InquiryOption[];
  readonly scopeOptions: readonly InquiryOption[];
  readonly timelineOptions: readonly InquiryOption[];
  readonly investmentOptions: readonly InvestmentOption[];
}

export interface Category {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly order: number;
  readonly seo: SeoMetadata;
}

export interface Room {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly media: readonly CatalogImage[];
  readonly seo: SeoMetadata;
}

export interface Collection {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly seasonLabel: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly palette: readonly string[];
  readonly media: readonly CatalogImage[];
  readonly seo: SeoMetadata;
}

export interface Look {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly stylingNotes: readonly string[];
  readonly productIds: readonly string[];
  readonly media: readonly CatalogImage[];
  readonly seo: SeoMetadata;
}

export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly productType: ProductType;
  readonly shortDescription: string;
  readonly description: string;
  readonly categoryId: string;
  readonly roomIds: readonly string[];
  readonly collectionIds: readonly string[];
  readonly styleTags: readonly string[];
  readonly materials: readonly string[];
  readonly features: readonly string[];
  readonly care: readonly string[];
  readonly assembly: AssemblyDetails;
  readonly publishedAt: string;
  readonly images: readonly CatalogImage[];
  readonly dimensions: ProductDimensions;
  readonly willItFit?: WillItFit;
  readonly comfort?: ComfortDetails;
  readonly variantIds: readonly string[];
  readonly complementIds: readonly string[];
  readonly sampleReviewIds?: readonly string[];
  readonly featuredRank?: number;
  readonly seo: SeoMetadata;
}

export interface VariantOption {
  readonly name: string;
  readonly value: string;
}

export interface ProductVariant {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly options: readonly VariantOption[];
  readonly priceMinor: number;
  readonly currency: CurrencyCode;
  readonly leadTimeLabel: string;
  readonly overallDimensions?: LinearDimensions;
}

export interface SampleReview {
  readonly id: string;
  readonly productId: string;
  readonly isSample: true;
  readonly displayName: string;
  readonly location: string;
  readonly publishedAt: string;
  readonly title: string;
  readonly body: string;
  readonly disclosure: string;
}

export interface Catalog {
  readonly schemaVersion: string;
  readonly site: SiteSettings;
  readonly navigation: readonly NavigationItem[];
  readonly policies: readonly Policy[];
  readonly inquiry: InquiryConfig;
  readonly categories: readonly Category[];
  readonly rooms: readonly Room[];
  readonly collections: readonly Collection[];
  readonly looks: readonly Look[];
  readonly products: readonly Product[];
  readonly variants: readonly ProductVariant[];
  readonly sampleReviews: readonly SampleReview[];
}

function unsplashImage(
  id: string,
  width: number,
  height: number,
  alt: string,
  role: ImageRole,
  creatorName: string,
  sourcePhotoId: string,
): CatalogImage {
  return {
    id: `unsplash-${id}-${role}`,
    url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&h=${height}&q=86`,
    width,
    height,
    alt,
    role,
    sourcePageUrl: `https://unsplash.com/photos/${sourcePhotoId}`,
    creatorName,
  };
}

const noAssembly: AssemblyDetails = {
  required: false,
  level: "none",
  estimatedMinutes: 0,
  description: "Arrives ready to place after protective packaging is removed.",
  professionalInstallationAvailable: false,
};

const lightAssembly: AssemblyDetails = {
  required: true,
  level: "light",
  estimatedMinutes: 20,
  description: "Attach the labeled components with the included hardware; two people are recommended.",
  professionalInstallationAvailable: true,
};

const moderateAssembly: AssemblyDetails = {
  required: true,
  level: "moderate",
  estimatedMinutes: 45,
  description: "Two-person assembly is required using the included hardware and illustrated guide.",
  professionalInstallationAvailable: true,
};

const livingContext = unsplashImage(
  "1600210492486-724fe5c67fb0",
  1600,
  1100,
  "Sunlit living room with neutral seating and plants shown as general styling context",
  "context",
  "Collov Home Design",
  "green-potted-plant-on-table-HmHArS-HvNw",
);
const diningContext = unsplashImage(
  "1617806118233-18e1de247200",
  1600,
  1100,
  "Layered dining room shown as styling context; furnishings are not the exact catalog product",
  "context",
  "Spacejoy",
  "green-and-white-wooden-dining-table-and-chairs-AAy5l4-oFuw",
);
const bedroomContext = unsplashImage(
  "1765862835319-18fb6f8caff6",
  1600,
  1100,
  "Neutral bedroom with a large bed and minimal decor shown as general styling context",
  "context",
  "Puscas Adryan",
  "modern-bedroom-with-a-large-bed-and-minimalist-decor-Yo28aVLWkdU",
);
const workspaceContext = unsplashImage(
  "1497215728101-856f4ea42174",
  1600,
  1100,
  "Natural-light workspace shown as styling context; furnishings are not the exact catalog product",
  "context",
  "Alesia Kazantceva",
  "turned-off-laptop-computer-on-top-of-brown-wooden-table-VWcPlbHglYc",
);

export const catalog: Catalog = {
  schemaVersion: "1.0.0",
  site: {
    brandName: "Vestrel House",
    wordmark: "VESTREL / HOUSE",
    tagline: "Modern rooms, collected slowly.",
    positioning: "A furniture-led whole-home edit for layered North American interiors.",
    story:
      "Vestrel House is a fictional New York-based design retailer shaped around Collected Modernism: assured silhouettes, tactile materials, and useful pieces that leave room for a home to become personal. The catalog is edited rather than endless, and every project begins with a conversation instead of a cart.",
    locale: "en-US",
    currency: "USD",
    primaryMarket: "US",
    shipsTo: ["US", "CA"],
    commerceMode: "consultation-only",
    primaryCtaLabel: "Start a design consultation",
    primaryCtaHref: "/consultation",
    announcement: "Design consultations available for projects across the United States and Canada.",
    contactEmail: "design@vestrelhouse.example",
    socialHandle: "@vestrelhouse",
    heroMedia: [
      unsplashImage(
        "1618221195710-dd6b41faaea6",
        2200,
        1500,
        "Modern living room with a long gray sofa, warm timber accents, and low leather ottomans",
        "hero",
        "Spacejoy",
        "white-and-brown-living-room-set-9M66C_w_ToM",
      ),
      unsplashImage(
        "1616486338812-3dadae4b4ace",
        1800,
        1200,
        "Bright neutral living room with a sectional sofa, round timber table, and woven floor cushion",
        "lifestyle",
        "Spacejoy",
        "brown-wooden-round-table-with-chairs-RqO6kwm4tZY",
      ),
      unsplashImage(
        "1582528617848-af3c559c4d71",
        1800,
        1200,
        "Curving timber staircase photographed as an architectural material detail",
        "detail",
        "Redd Francisco",
        "brown-and-white-spiral-stairs-yPWFgbjMDwg",
      ),
    ],
    seo: {
      title: "Vestrel House | Collected Modern Furniture & Design Consultation",
      description:
        "Explore Vestrel House furniture, rooms, and collected-modern looks, then plan your US or Canadian project with a design consultant.",
    },
  },
  navigation: [
    { id: "nav-new", label: "New & Noted", href: "/products?sort=newest", kind: "catalog", featured: false },
    { id: "nav-furniture", label: "Furniture", href: "/products", kind: "catalog", featured: false },
    { id: "nav-rooms", label: "Rooms", href: "/rooms", kind: "editorial", featured: false },
    { id: "nav-collections", label: "Collections", href: "/collections", kind: "editorial", featured: false },
    { id: "nav-looks", label: "The Lookbook", href: "/looks", kind: "editorial", featured: false },
    { id: "nav-consultation", label: "Design Consultation", href: "/consultation", kind: "service", featured: true },
  ],
  policies: [
    {
      id: "policy-shipping",
      slug: "shipping-delivery",
      title: "Shipping & delivery",
      summary: "Delivery is planned around the pieces, destination, access, and service level selected with your consultant.",
      details: [
        "We coordinate delivery within the contiguous United States and to serviceable Canadian destinations. Alaska, Hawaii, remote, and island destinations are reviewed individually.",
        "Product prices do not include delivery, duties, taxes, or installation. Your consultant confirms those costs in a written project proposal before you approve an order.",
        "Lead-time labels are planning estimates, not inventory promises. Final timing is confirmed after selections and destination details are reviewed.",
      ],
    },
    {
      id: "policy-installation",
      slug: "installation-access",
      title: "Installation & access",
      summary: "Room-of-choice placement and assembly are scoped during consultation rather than added automatically at checkout.",
      details: [
        "Share doorway, hallway, stair, elevator, and loading restrictions before proposal approval. Product pages include planning dimensions, but the customer is responsible for confirming the complete path.",
        "White-glove placement, packaging removal, assembly, and wall or ceiling installation are quoted where local service is available.",
        "Electrical hardwiring and structural anchoring must be completed by appropriately licensed local professionals.",
      ],
    },
    {
      id: "policy-returns",
      slug: "changes-returns",
      title: "Changes & returns",
      summary: "Because each proposal is reviewed with you, change and return terms are attached to the selected pieces before approval.",
      details: [
        "Do not approve a proposal until dimensions, finishes, quantities, delivery access, and service details are correct.",
        "Cancellation, change, and return eligibility varies by piece and project stage and is stated in the written proposal.",
        "Document visible delivery damage with the delivery team before signing and contact your consultant promptly using the instructions in the proposal.",
      ],
    },
    {
      id: "policy-swatches",
      slug: "materials-swatches",
      title: "Materials & swatches",
      summary: "Screens and editorial photography cannot replace an in-hand material review.",
      details: [
        "Your consultant can identify available finish and textile samples before proposal approval.",
        "Natural materials and textile dye lots can vary in tone, grain, veining, and texture; these variations are discussed as part of selection.",
        "Editorial context photographs are labeled and should be read as styling references, not additional product views.",
      ],
    },
  ],
  inquiry: {
    eyebrow: "Vestrel Design Service",
    title: "Let’s make the room make sense.",
    description:
      "Tell us what you are solving for. A consultant will shape an edited furniture plan, confirm fit, and prepare a transparent proposal; there is no online checkout.",
    responseExpectation: "Portfolio demo: submissions are not sent. In a live service, a consultant would reply within two business days.",
    privacyNote: "Use project-level details only; do not include payment information or access codes.",
    steps: [
      {
        id: "inquiry-project",
        title: "Your project",
        description: "Define the service, scope, destination, schedule, and working investment range.",
        fields: ["designService", "scope", "postalCode", "timeline", "investment"],
      },
      {
        id: "inquiry-contact",
        title: "How to reach you",
        description: "Share practical contact details and any context that will help the first conversation.",
        fields: ["fullName", "email", "phone", "notes"],
      },
    ],
    serviceOptions: [
      { id: "service-piece-edit", label: "Focused piece edit", description: "Compare and specify a small group of anchor pieces." },
      { id: "service-room-plan", label: "Single-room plan", description: "Build a coordinated furniture, lighting, and textile direction." },
      { id: "service-multi-room", label: "Multi-room plan", description: "Create continuity across two or more connected rooms." },
      { id: "service-trade", label: "Designer or trade support", description: "Coordinate selections for an active professional project." },
    ],
    scopeOptions: [
      { id: "scope-living", label: "Living room", description: "Seating, tables, storage, lighting, and rugs." },
      { id: "scope-dining", label: "Dining room", description: "Table, seating, storage, lighting, and rugs." },
      { id: "scope-bedroom", label: "Bedroom", description: "Bed, bedside storage, seating, lighting, and rugs." },
      { id: "scope-workspace", label: "Workspace", description: "Desk, task seating, storage, and lighting." },
      { id: "scope-whole-home", label: "Whole home", description: "A phased edit spanning several rooms." },
    ],
    timelineOptions: [
      { id: "timeline-flexible", label: "Flexible", description: "The right plan matters more than a target date." },
      { id: "timeline-3-6", label: "3–6 months", description: "Selections should support a near-term move or room update." },
      { id: "timeline-6-12", label: "6–12 months", description: "The project can be specified and delivered in phases." },
      { id: "timeline-planning", label: "Early planning", description: "Layouts or construction details are still developing." },
    ],
    investmentOptions: [
      { id: "investment-5-15", label: "$5,000–$15,000", description: "A focused piece edit or compact room plan.", minimumMinor: 500000, maximumMinor: 1500000, currency: "USD" },
      { id: "investment-15-35", label: "$15,000–$35,000", description: "A furniture-led single room or selective two-room plan.", minimumMinor: 1500000, maximumMinor: 3500000, currency: "USD" },
      { id: "investment-35-75", label: "$35,000–$75,000", description: "A layered multi-room project.", minimumMinor: 3500000, maximumMinor: 7500000, currency: "USD" },
      { id: "investment-75-plus", label: "$75,000+", description: "A whole-home or phased furnishing plan.", minimumMinor: 7500000, maximumMinor: null, currency: "USD" },
    ],
  },
  categories: [
    { id: "cat-sofas", slug: "sofas-sectionals", name: "Sofas & Sectionals", description: "Upholstered anchors with composed proportions and room-planning flexibility.", order: 1, seo: { title: "Modern Sofas & Sectionals | Vestrel House", description: "Explore edited sofas, sectionals, and daybeds for collected modern living rooms." } },
    { id: "cat-chairs", slug: "lounge-chairs", name: "Lounge Chairs", description: "Sculptural occasional seating balanced for conversation and reading.", order: 2, seo: { title: "Modern Lounge Chairs | Vestrel House", description: "Discover lounge and swivel chairs with tactile upholstery and precise silhouettes." } },
    { id: "cat-tables", slug: "tables-consoles", name: "Tables & Consoles", description: "Low tables, dining surfaces, side tables, and architectural consoles.", order: 3, seo: { title: "Modern Tables & Consoles | Vestrel House", description: "Browse coffee, side, dining, and console tables selected for layered rooms." } },
    { id: "cat-dining-seating", slug: "dining-seating", name: "Dining Seating", description: "Chairs and benches designed to make long meals feel easy.", order: 4, seo: { title: "Modern Dining Seating | Vestrel House", description: "Explore upholstered dining chairs and versatile benches in warm modern finishes." } },
    { id: "cat-storage", slug: "storage-cabinets", name: "Storage & Cabinets", description: "Credenzas, cabinets, and bedside storage that organize without disappearing.", order: 5, seo: { title: "Modern Storage & Cabinets | Vestrel House", description: "Discover media credenzas, display cabinets, and nightstands with architectural detail." } },
    { id: "cat-beds", slug: "beds", name: "Beds", description: "Quiet, room-defining frames in upholstered and timber profiles.", order: 6, seo: { title: "Modern Beds | Vestrel House", description: "Explore platform and canopy beds for calm, collected bedrooms." } },
    { id: "cat-workspace", slug: "desks-task-chairs", name: "Workspace", description: "Desks and task seating for focused work in shared or dedicated rooms.", order: 7, seo: { title: "Modern Workspace Furniture | Vestrel House", description: "Browse writing desks, secretary desks, and considered task chairs." } },
    { id: "cat-lighting-textiles", slug: "lighting-textiles", name: "Lighting & Textiles", description: "The finishing layer: useful light and grounding rugs with material presence.", order: 8, seo: { title: "Modern Lighting & Textiles | Vestrel House", description: "Explore floor lamps, pendants, and wool rugs for layered modern rooms." } },
  ],
  rooms: [
    {
      id: "room-living",
      slug: "living-room",
      name: "Living Room",
      shortDescription: "Comfort with a clear point of view.",
      description: "Start with seating that supports real conversation, then vary height, material, and age through tables, lighting, storage, and a grounding textile.",
      media: [
        unsplashImage("1600210491369-e753d80a41f3", 1900, 1300, "Bright living room with a pale sofa, mustard accent chair, dark side table, and framed art", "hero", "Collov Home Design", "white-and-black-wooden-table-with-chairs-js8AQlw71HA"),
        unsplashImage("1583847268964-b28dc8f51f92", 1500, 1100, "Neutral living room with a pale sectional, rounded chair, timber table, and large windows", "detail", "Minh Pham", "a-living-room-filled-with-furniture-and-a-large-window-OtXADkUh3-I"),
      ],
      seo: { title: "Collected Modern Living Room | Vestrel House", description: "Build a layered living room with edited seating, tables, storage, lighting, and rugs." },
    },
    {
      id: "room-dining",
      slug: "dining-room",
      name: "Dining Room",
      shortDescription: "A room for lingering, not staging.",
      description: "Pair generous table proportions with comfortable seating, useful storage, and directional light that shifts easily from weekday to occasion.",
      media: [
        unsplashImage("1600488999806-8efb986d87b1", 1900, 1300, "Warm dining room with a timber table, upholstered chairs, woven rug, and pendant light", "hero", "Collov Home Design", "brown-wooden-table-with-chairs-v9096DgeVeA"),
        unsplashImage("1577140917170-285929fb55b7", 1500, 1100, "Close dining-room view of a dark oval timber table and curved wooden chairs", "detail", "Jose Losada", "brown-wooden-5-piece-dining-set-inside-white-building-9dRBM8Qw2TE"),
      ],
      seo: { title: "Collected Modern Dining Room | Vestrel House", description: "Plan a welcoming dining room with tables, seating, cabinets, lighting, and rugs." },
    },
    {
      id: "room-bedroom",
      slug: "bedroom",
      name: "Bedroom",
      shortDescription: "Calm without becoming anonymous.",
      description: "Use the bed as a quiet architectural center, then add compact storage, low light, and enough texture to make restraint feel lived in.",
      media: [
        unsplashImage("1766733041960-0de62f403e7b", 1900, 1300, "Neutral bedroom with an arched upholstered headboard, pale bedding, and rounded bedside tables", "hero", "Puscas Adryan", "modern-bedroom-with-arched-headboard-and-neutral-decor-AT1AqItpuOI"),
        unsplashImage("1666153047039-6849a2c18f83", 1500, 1100, "Close bedroom view with white bedding, dark cushions, and a compact bedside lamp", "detail", "Kendrick Fernandez", "a-bed-with-a-lamp-and-a-pillow-RqaXp1aRe2I"),
      ],
      seo: { title: "Collected Modern Bedroom | Vestrel House", description: "Create a calm bedroom with edited beds, nightstands, lighting, and tactile rugs." },
    },
    {
      id: "room-workspace",
      slug: "workspace",
      name: "Workspace",
      shortDescription: "Focus, with softer edges.",
      description: "Choose a work surface around the tasks at hand, support it with an adjustable chair, then add closed storage and warm task light.",
      media: [
        unsplashImage("1497366754035-f200968a6e72", 1900, 1300, "Glass-walled office corridor with long sightlines, dark frames, and pendant lights", "hero", "Nastuh Abootalebi", "hallway-between-glass-panel-doors-yWwob8kwOCk"),
        unsplashImage("1524758631624-e2822e304c36", 1500, 1100, "Open office lounge with upholstered chairs, floor lamps, shelving, and daylight", "detail", "Toa Heftiba", "black-floor-lamp-on-living-room-sofa-FV3GConVSss"),
      ],
      seo: { title: "Collected Modern Workspace | Vestrel House", description: "Plan a composed home workspace with desks, task seating, storage, and lighting." },
    },
  ],
  collections: [
    {
      id: "collection-soft-geometry",
      slug: "soft-geometry",
      name: "Soft Geometry",
      seasonLabel: "Collection 01",
      shortDescription: "Curves held by disciplined lines.",
      description: "Rounded upholstery, softened corners, and broad planes bring ease to rooms without losing architectural clarity.",
      palette: ["Oat", "Clay", "Oxide", "Ink"],
      media: [
        unsplashImage("1616137466211-f939a420be84", 1900, 1300, "Light living room with a pale sectional, rectangular coffee table, and graphic pendant", "hero", "Spacejoy", "white-sectional-couch-beside-white-wooden-table-uGWNcejbf2E"),
        unsplashImage("1615874694520-474822394e73", 1500, 1100, "Gray fireplace wall framed by two dark lounge chairs and rounded decorative objects", "detail", "Spacejoy", "black-fireplace-in-living-room-XpbtQfr9Skg"),
      ],
      seo: { title: "Soft Geometry Collection | Vestrel House", description: "Explore curved upholstery and softened architectural forms in the Soft Geometry collection." },
    },
    {
      id: "collection-material-study",
      slug: "material-study",
      name: "Material Study",
      seasonLabel: "Collection 02",
      shortDescription: "Grain, stone, metal, and textile in conversation.",
      description: "A measured mix of contrasting surfaces makes neutral rooms feel dimensional rather than uniform.",
      palette: ["Walnut", "Travertine", "Bronze", "Flax"],
      media: [
        unsplashImage("1778873321519-ad0f30b84883", 1900, 1300, "Warm interior with timber walls, a monolithic stone table, metal artwork, and copper pendants", "hero", "Gabriel Quintana", "modern-room-with-wooden-walls-stone-table-and-abstract-art-56YB1me8TDA"),
        unsplashImage("1768320837734-02390d59dfea", 1500, 1100, "Close material study of warm timber beside a pale textured stone surface", "detail", "Carlo Sierra", "stone-and-wood-textures-juxtaposed-in-a-minimalist-design-la_ES1DEk28"),
      ],
      seo: { title: "Material Study Collection | Vestrel House", description: "Layer wood, stone, metal, and textile through the Material Study furniture collection." },
    },
    {
      id: "collection-afterlight",
      slug: "afterlight",
      name: "Afterlight",
      seasonLabel: "Collection 03",
      shortDescription: "Low light, deep tone, and evening utility.",
      description: "Dark timber, shaded light, and enveloping textiles tune rooms for the slower end of the day.",
      palette: ["Espresso", "Tobacco", "Parchment", "Moss"],
      media: [
        unsplashImage("1704686448043-466a7178c8e9", 1900, 1300, "Low-lit living room with a shaded lamp, dark seating, and warm timber surfaces", "hero", "Evan Wise", "a-living-room-filled-with-furniture-and-a-lamp-OAiJ1gcainE"),
        unsplashImage("1507473885765-e6ed057f782c", 1500, 1100, "Close view of a dark adjustable task lamp against a pale wall", "detail", "Jonny Caspari", "gray-desk-lamp-near-white-wall-wsvCC6UyKjs"),
      ],
      seo: { title: "Afterlight Collection | Vestrel House", description: "Discover dark timber, tactile upholstery, and atmospheric lighting in Afterlight." },
    },
  ],
  looks: [
    {
      id: "look-warm-monolith",
      slug: "warm-monolith",
      name: "Warm Monolith",
      eyebrow: "Look 01 / Living",
      description: "Blocky silhouettes become inviting through rounded edges, wool texture, and a narrow range of sun-warmed neutrals.",
      stylingNotes: ["Keep the largest forms tonal.", "Use one dark timber plane for contrast.", "Let asymmetry come from art and objects."],
      productIds: ["prod-vale-sofa", "prod-brera-chair", "prod-plinth-table", "prod-ledger-credenza", "prod-mica-floor-lamp", "prod-tressa-rug"],
      media: [
        unsplashImage("1631679706909-1844bbd07221", 1900, 1300, "Warm neutral living room with a broad pale sofa, rounded chairs, and timber tables", "hero", "Spacejoy", "a-living-room-filled-with-furniture-and-a-mirror-c0JoR_-2x3E"),
        unsplashImage("1667312939934-60fc3bfa4ec0", 1500, 1100, "Dark sculptural vase and stacked books arranged on a pale console surface", "detail", "Karolina Grabowska", "a-vase-and-some-books-H_eb_VfG2Ow"),
      ],
      seo: { title: "Warm Monolith Look | Vestrel House", description: "Style a tonal modern living room with substantial forms and tactile contrast." },
    },
    {
      id: "look-gallery-calm",
      slug: "gallery-calm",
      name: "Gallery Calm",
      eyebrow: "Look 02 / Whole Home",
      description: "Pale ground, precise furniture, and generous negative space create a home that supports art without reading as austere.",
      stylingNotes: ["Repeat pale oak in no more than three places.", "Choose art before small accessories.", "Break straight lines with one rounded seat."],
      productIds: ["prod-morrow-sofa", "prod-tuck-chair", "prod-serein-side-table", "prod-linea-console", "prod-folio-cabinet", "prod-cove-bed"],
      media: [
        unsplashImage("1744819181935-edb1c6924d0b", 1900, 1300, "Minimal black-and-white living room with a pale sofa and framed artwork", "hero", "Emi Ymerai", "a-couch-with-pillows-and-artwork-on-the-wall-zbU7VFC2GmU"),
        unsplashImage("1618220179428-22790b461013", 1500, 1100, "Pale living room with an orange lounge chair, timber cabinet, plants, and a round mirror", "detail", "Spacejoy", "green-plant-on-white-ceramic-pot-IH7wPsjwomc"),
      ],
      seo: { title: "Gallery Calm Look | Vestrel House", description: "Create a light collected interior with precise furniture, art, and breathing room." },
    },
    {
      id: "look-tailored-contrast",
      slug: "tailored-contrast",
      name: "Tailored Contrast",
      eyebrow: "Look 03 / Dining & Work",
      description: "Dark edges, fitted upholstery, and clear geometry make shared dining and work spaces feel polished but usable.",
      stylingNotes: ["Use black as a line, not a field.", "Balance tailored seating with visible wood grain.", "Keep the task lighting compact and directional."],
      productIds: ["prod-arden-dining-table", "prod-rill-dining-chair", "prod-sable-bench", "prod-axis-desk", "prod-rove-task-chair", "prod-vela-pendant"],
      media: [
        unsplashImage("1605665852523-fb68ef1779f4", 1900, 1300, "Dark green dining room with a timber table, black chairs, gold mirrors, and dried foliage", "hero", "Erica Marsland Huynh", "brown-wooden-table-with-chairs-56LyVIvYCqU"),
        unsplashImage("1486946255434-2466348c2166", 1500, 1100, "Compact timber desk with a black task lamp, pale cabinet, and green chair", "detail", "Kari Shea", "black-2-light-torchiere-beside-brown-wooden-top-desk-with-black-steel-frame-tOVmshavtoo"),
      ],
      seo: { title: "Tailored Contrast Look | Vestrel House", description: "Style precise dining and work spaces with dark lines, warm wood, and fitted seating." },
    },
    {
      id: "look-quiet-color",
      slug: "quiet-color",
      name: "Quiet Color",
      eyebrow: "Look 04 / Rest & Retreat",
      description: "Moss, clay, and tobacco tones behave like neutrals when the silhouettes stay simple and the light remains soft.",
      stylingNotes: ["Choose one muted color family per room.", "Repeat color through texture rather than exact matches.", "Leave the brightest note to a small object or artwork."],
      productIds: ["prod-canto-sectional", "prod-nila-daybed", "prod-palis-chair", "prod-parcel-nightstand", "prod-frame-canopy-bed", "prod-fold-secretary"],
      media: [
        unsplashImage("1617103996702-96ff29b1c467", 1900, 1300, "Bright living room with rust and cream seating, a patterned rug, and woven wall decor", "hero", "Spacejoy", "white-and-brown-living-room-set-85pCvDWDMmI"),
        unsplashImage("1610701596007-11502861dcfa", 1500, 1100, "Small grouping of white and sand-colored ceramic vessels on a pale surface", "detail", "Vladimir Gladkov", "white-and-brown-ceramic-bowls-NPPIq1XFdck"),
      ],
      seo: { title: "Quiet Color Look | Vestrel House", description: "Layer moss, clay, and tobacco as calm neutrals across restful modern rooms." },
    },
  ],
  products: [
    {
      id: "prod-vale-sofa",
      slug: "vale-modular-sofa",
      name: "Vale Modular Sofa",
      productType: "furniture",
      shortDescription: "A broad three-seat sofa with soft corners and a composed, medium-depth sit.",
      description: "Vale pairs deep visual volume with supportive proportions. Three independently upholstered seat modules lock to a low plinth, while the continuous back keeps the profile calm from across the room.",
      categoryId: "cat-sofas",
      roomIds: ["room-living"],
      collectionIds: ["collection-soft-geometry"],
      styleTags: ["collected modern", "soft geometry", "low profile", "tonal"],
      materials: ["Textured performance weave", "High-resilience foam", "Fiber wrap", "Kiln-dried hardwood frame", "Powder-coated steel connectors"],
      features: ["Three connected modules", "Loose seat cushions", "Fixed upholstered back", "Concealed levelers"],
      care: ["Vacuum with an upholstery attachment.", "Blot spills promptly with a clean undyed cloth.", "Rotate loose cushions monthly."],
      assembly: lightAssembly,
      publishedAt: "2026-01-12T15:00:00.000Z",
      images: [
        unsplashImage("1759722665629-29df6ee4f9a5", 1800, 1200, "Light gray fabric sofa with broad arms and three loose back cushions in a modern room", "hero", "Costa Live", "a-light-grey-sofa-in-a-modern-living-room-upT3v0yLnvk"),
        livingContext,
      ],
      dimensions: { overall: { widthIn: 108, heightIn: 30, depthIn: 40 }, itemWeightLb: 238, packages: [{ packageId: "vale-1", widthIn: 38, heightIn: 28, depthIn: 42, weightLb: 78 }, { packageId: "vale-2", widthIn: 38, heightIn: 28, depthIn: 42, weightLb: 78 }, { packageId: "vale-3", widthIn: 38, heightIn: 28, depthIn: 42, weightLb: 82 }], seat: { widthIn: 84, heightIn: 17, depthIn: 24 } },
      willItFit: { minimumDoorwayWidthIn: 30, recommendedPathWidthIn: 34, elevatorRecommended: true, componentBreakdown: "Ships as three sofa modules; arms and backs remain attached.", notes: "Confirm turns using the largest 38 × 42 × 28 in package." },
      comfort: { feel: "balanced", support: "Resilient foam base with a softer fiber crown", cushionFill: "High-resilience foam and polyester fiber wrap", posture: "Medium-depth, upright lounge" },
      variantIds: ["var-vale-oat", "var-vale-oxide"],
      complementIds: ["prod-plinth-table", "prod-brera-chair", "prod-tressa-rug"],
      sampleReviewIds: ["review-vale-01"],
      featuredRank: 1,
      seo: { title: "Vale Modular Sofa | Vestrel House", description: "A three-module modern sofa with broad proportions, soft corners, and a balanced medium-depth sit." },
    },
    {
      id: "prod-morrow-sofa",
      slug: "morrow-apartment-sofa",
      name: "Morrow Apartment Sofa",
      productType: "furniture",
      shortDescription: "A tailored 78-inch sofa designed for smaller living rooms and clear circulation.",
      description: "Morrow compresses the gestures of a generous lounge sofa into a city-scaled frame. Slim arms preserve seat width, while two bench-like cushions and a raised timber base keep the silhouette light.",
      categoryId: "cat-sofas",
      roomIds: ["room-living", "room-workspace"],
      collectionIds: ["collection-material-study"],
      styleTags: ["collected modern", "apartment scale", "tailored", "raised base"],
      materials: ["Basket-weave upholstery", "High-resilience foam", "Fiber wrap", "Hardwood frame", "Solid ash base"],
      features: ["Compact 78-inch width", "Loose reversible seat cushions", "Two lumbar cushions", "Exposed ash base"],
      care: ["Vacuum seams and cushion surfaces regularly.", "Blot; do not rub liquid spills.", "Keep out of prolonged direct sunlight."],
      assembly: lightAssembly,
      publishedAt: "2026-02-03T15:00:00.000Z",
      images: [
        unsplashImage("1698936061086-2bf99c7b9fc5", 1800, 1200, "Compact gray fabric sofa with four cushions centered against a pale wall", "hero", "Ambo Ampeng", "a-gray-couch-with-four-pillows-on-it-KEGGJPKxcSc"),
        livingContext,
      ],
      dimensions: { overall: { widthIn: 78, heightIn: 32, depthIn: 36 }, itemWeightLb: 142, packages: [{ packageId: "morrow-1", widthIn: 81, heightIn: 31, depthIn: 38, weightLb: 150 }], seat: { widthIn: 66, heightIn: 18, depthIn: 22 } },
      willItFit: { minimumDoorwayWidthIn: 32, recommendedPathWidthIn: 36, elevatorRecommended: false, componentBreakdown: "Ships as one frame; legs detach and cushions pack within the frame footprint.", notes: "Allow 81 in of straight clearance at the final doorway or stand the packaged frame on end where safe." },
      comfort: { feel: "structured", support: "Firm foam core with a thin fiber crown", cushionFill: "High-resilience foam and polyester fiber", posture: "Upright conversation sit" },
      variantIds: ["var-morrow-flax", "var-morrow-ink"],
      complementIds: ["prod-serein-side-table", "prod-linea-console", "prod-tuck-chair"],
      featuredRank: 7,
      seo: { title: "Morrow Apartment Sofa | Vestrel House", description: "A tailored 78-inch modern sofa with slim arms, reversible cushions, and an exposed ash base." },
    },
    {
      id: "prod-canto-sectional",
      slug: "canto-chaise-sectional",
      name: "Canto Chaise Sectional",
      productType: "furniture",
      shortDescription: "A two-piece sectional with a long chaise and softly angled interior corner.",
      description: "Canto makes a large-room gesture without a bulky outer profile. The chaise and sofa meet at a softened angle, creating an easy place to stretch out while preserving an open conversation edge.",
      categoryId: "cat-sofas",
      roomIds: ["room-living"],
      collectionIds: ["collection-afterlight"],
      styleTags: ["collected modern", "sectional", "asymmetrical", "evening"],
      materials: ["Low-pile velvet", "High-resilience foam", "Fiber and feather blend wrap", "Hardwood frame", "Steel joining brackets"],
      features: ["Two-piece construction", "Left- or right-facing chaise option", "Loose back cushions", "Low concealed feet"],
      care: ["Brush velvet gently in the direction of the pile.", "Blot spills immediately.", "Fluff and rotate back cushions weekly."],
      assembly: lightAssembly,
      publishedAt: "2026-03-18T15:00:00.000Z",
      images: [
        unsplashImage("1738168246881-40f35f8aba0a", 1800, 1200, "Large moss-green sectional with a chaise in a warm neutral living room", "hero", "Prydumano Design", "a-living-room-with-a-large-green-couch-VZ2z8ozzy10"),
        livingContext,
      ],
      dimensions: { overall: { widthIn: 122, heightIn: 29, depthIn: 68 }, itemWeightLb: 276, packages: [{ packageId: "canto-sofa", widthIn: 78, heightIn: 28, depthIn: 41, weightLb: 152 }, { packageId: "canto-chaise", widthIn: 46, heightIn: 28, depthIn: 70, weightLb: 134 }], seat: { widthIn: 98, heightIn: 17, depthIn: 25 } },
      willItFit: { minimumDoorwayWidthIn: 30, recommendedPathWidthIn: 36, elevatorRecommended: true, componentBreakdown: "Ships as one sofa unit and one chaise unit; backs remain attached.", notes: "Map separate paths for the 78 in sofa package and 70 in chaise package." },
      comfort: { feel: "relaxed", support: "Resilient foam under a plush blended wrap", cushionFill: "Foam, polyester fiber, and feather blend", posture: "Deep lounge with supportive low back" },
      variantIds: ["var-canto-moss-left", "var-canto-moss-right"],
      complementIds: ["prod-serein-side-table", "prod-mica-floor-lamp", "prod-ledger-credenza"],
      featuredRank: 5,
      seo: { title: "Canto Chaise Sectional | Vestrel House", description: "A two-piece modern sectional with an angled interior corner and left- or right-facing chaise." },
    },
    {
      id: "prod-nila-daybed",
      slug: "nila-upholstered-daybed",
      name: "Nila Upholstered Daybed",
      productType: "furniture",
      shortDescription: "An armless daybed for reading, overnight overflow, or dividing an open room.",
      description: "Nila is upholstered on every side so it can float with confidence. A firm single cushion and cylindrical bolster make it useful as a perch, chaise, or occasional sleep surface.",
      categoryId: "cat-sofas",
      roomIds: ["room-living", "room-bedroom", "room-workspace"],
      collectionIds: ["collection-soft-geometry"],
      styleTags: ["collected modern", "daybed", "floating", "multipurpose"],
      materials: ["Wool-blend upholstery", "High-resilience foam", "Hardwood frame", "Powder-coated steel feet"],
      features: ["Fully upholstered back", "Loose cylindrical bolster", "Firm single cushion", "Inset steel feet"],
      care: ["Vacuum using low suction.", "Spot clean only with an upholstery professional for set stains.", "Rotate the bolster regularly."],
      assembly: lightAssembly,
      publishedAt: "2026-04-08T15:00:00.000Z",
      images: [
        unsplashImage("1633515091011-d1aa4c127590", 1800, 1200, "Low gray upholstered daybed with an open back and slim dark base in a minimal room", "hero", "kim groothedde", "a-couch-that-is-sitting-in-the-middle-of-a-room-NxWtmoZ9-tM"),
        bedroomContext,
      ],
      dimensions: { overall: { widthIn: 80, heightIn: 26, depthIn: 34 }, itemWeightLb: 126, packages: [{ packageId: "nila-1", widthIn: 82, heightIn: 27, depthIn: 36, weightLb: 136 }], seat: { widthIn: 76, heightIn: 17, depthIn: 30 } },
      willItFit: { minimumDoorwayWidthIn: 28, recommendedPathWidthIn: 34, elevatorRecommended: false, componentBreakdown: "Ships as one upholstered frame with removable feet and bolster.", notes: "The frame may be carried on its long edge; protect upholstery at all turns." },
      comfort: { feel: "structured", support: "Firm continuous foam surface", cushionFill: "High-resilience foam with wool batting", posture: "Supportive recline or upright perch" },
      variantIds: ["var-nila-oat", "var-nila-clay"],
      complementIds: ["prod-serein-side-table", "prod-mica-floor-lamp", "prod-tressa-rug"],
      sampleReviewIds: ["review-nila-01"],
      seo: { title: "Nila Upholstered Daybed | Vestrel House", description: "A fully upholstered modern daybed for reading, occasional sleep, and flexible open-room layouts." },
    },
    {
      id: "prod-brera-chair",
      slug: "brera-lounge-chair",
      name: "Brera Lounge Chair",
      productType: "furniture",
      shortDescription: "A low lounge chair with a sheltering back and neatly contained seat cushion.",
      description: "Brera turns a continuous curved back into both arm and enclosure. The compact footprint reads sculptural from every side, making the chair especially useful opposite a sofa or near a window.",
      categoryId: "cat-chairs",
      roomIds: ["room-living", "room-bedroom"],
      collectionIds: ["collection-soft-geometry"],
      styleTags: ["collected modern", "barrel chair", "sculptural", "compact"],
      materials: ["Textured boucle", "Molded foam", "Hardwood and plywood frame", "Nylon glides"],
      features: ["Continuous curved back", "Loose seat cushion", "Fully upholstered base", "Compact footprint"],
      care: ["Vacuum with an upholstery attachment.", "Blot spills; avoid saturating the pile.", "Rotate the loose seat cushion monthly."],
      assembly: noAssembly,
      publishedAt: "2026-01-26T15:00:00.000Z",
      images: [
        unsplashImage("1684165610413-2401399e0e59", 1800, 1200, "Rounded ivory boucle lounge chair photographed against a warm white background", "hero", "Kevin Shek", "a-white-couch-sitting-on-top-of-a-white-floor-kcxZ-YUZ8VE"),
        livingContext,
      ],
      dimensions: { overall: { widthIn: 33, heightIn: 29, depthIn: 32 }, itemWeightLb: 58, packages: [{ packageId: "brera-1", widthIn: 35, heightIn: 31, depthIn: 34, weightLb: 66 }], seat: { widthIn: 22, heightIn: 17, depthIn: 21 } },
      willItFit: { minimumDoorwayWidthIn: 30, recommendedPathWidthIn: 32, elevatorRecommended: false, componentBreakdown: "Ships fully assembled in one carton.", notes: "Measure tight stair turns against the 35 in carton width." },
      comfort: { feel: "balanced", support: "Molded back with a resilient foam seat", cushionFill: "High-resilience foam and fiber wrap", posture: "Contained lounge with upright shoulder support" },
      variantIds: ["var-brera-ivory", "var-brera-tobacco"],
      complementIds: ["prod-vale-sofa", "prod-plinth-table", "prod-mica-floor-lamp"],
      featuredRank: 3,
      seo: { title: "Brera Lounge Chair | Vestrel House", description: "A compact curved lounge chair with a sheltering back and balanced, supportive sit." },
    },
    {
      id: "prod-tuck-chair",
      slug: "tuck-swivel-chair",
      name: "Tuck Swivel Chair",
      productType: "furniture",
      shortDescription: "A clean-lined swivel chair with a hidden base and softly pitched back.",
      description: "Tuck keeps motion visually quiet. Its compact seat turns on a concealed return swivel, while the angled back and small lumbar cushion support reading, conversation, or a flexible workspace corner.",
      categoryId: "cat-chairs",
      roomIds: ["room-living", "room-bedroom", "room-workspace"],
      collectionIds: ["collection-material-study"],
      styleTags: ["collected modern", "swivel", "tailored", "compact"],
      materials: ["Linen-blend upholstery", "High-resilience foam", "Plywood frame", "Steel return-swivel base"],
      features: ["Concealed 360-degree return swivel", "Loose lumbar cushion", "Fixed seat", "Small-space footprint"],
      care: ["Vacuum upholstery and beneath the lumbar cushion.", "Blot spills with an undyed cloth.", "Keep the swivel path clear of rugs with a high edge."],
      assembly: noAssembly,
      publishedAt: "2026-02-19T15:00:00.000Z",
      images: [
        unsplashImage("1580480055273-228ff5388ef8", 1800, 1200, "Tailored gray upholstered chair with a softly curved back and pale timber frame", "hero", "SCOPIC LTD", "brown-wooden-framed-gray-padded-chair-NLlWwR4d3qU"),
        workspaceContext,
      ],
      dimensions: { overall: { widthIn: 31, heightIn: 32, depthIn: 33 }, itemWeightLb: 64, packages: [{ packageId: "tuck-1", widthIn: 33, heightIn: 34, depthIn: 35, weightLb: 72 }], seat: { widthIn: 22, heightIn: 18, depthIn: 21 } },
      willItFit: { minimumDoorwayWidthIn: 30, recommendedPathWidthIn: 33, elevatorRecommended: false, componentBreakdown: "Ships fully assembled in one carton.", notes: "Keep the chair upright during handling to protect the swivel mechanism." },
      comfort: { feel: "structured", support: "Fixed foam seat with lumbar cushion", cushionFill: "High-resilience foam and polyester fiber", posture: "Upright with a gentle recline" },
      variantIds: ["var-tuck-flax", "var-tuck-graphite"],
      complementIds: ["prod-morrow-sofa", "prod-serein-side-table", "prod-axis-desk"],
      seo: { title: "Tuck Swivel Chair | Vestrel House", description: "A compact upholstered swivel chair with a concealed return base and supportive lumbar cushion." },
    },
    {
      id: "prod-palis-chair",
      slug: "palis-cantilever-lounge-chair",
      name: "Palis Cantilever Lounge Chair",
      productType: "furniture",
      shortDescription: "A sling-like lounge chair held within a continuous dark bronze frame.",
      description: "Palis uses a gently flexing steel frame to suspend a fitted upholstered shell. The open sides and narrow outline add a graphic note without blocking views through a room.",
      categoryId: "cat-chairs",
      roomIds: ["room-living", "room-bedroom", "room-workspace"],
      collectionIds: ["collection-afterlight"],
      styleTags: ["collected modern", "cantilever", "graphic", "open frame"],
      materials: ["Wool-blend upholstery", "Molded foam shell", "Powder-coated tubular steel", "Felt glides"],
      features: ["Continuous cantilever frame", "Integrated upholstered shell", "Open-sided profile", "Floor-protecting glides"],
      care: ["Vacuum upholstery using low suction.", "Wipe the frame with a dry soft cloth.", "Do not use the frame as a step."],
      assembly: noAssembly,
      publishedAt: "2026-05-11T15:00:00.000Z",
      images: [
        unsplashImage("1779144639775-6083233ac9b9", 1800, 1200, "Open metal-frame lounge chair with dark upholstery and geometric shadows on concrete", "hero", "Jason Leung", "modern-armchair-with-geometric-shadows-on-concrete-floor-C1ulbZdMFtU"),
        livingContext,
      ],
      dimensions: { overall: { widthIn: 27, heightIn: 31, depthIn: 34 }, itemWeightLb: 38, packages: [{ packageId: "palis-1", widthIn: 29, heightIn: 33, depthIn: 36, weightLb: 46 }], seat: { widthIn: 21, heightIn: 16, depthIn: 22 } },
      willItFit: { minimumDoorwayWidthIn: 28, recommendedPathWidthIn: 30, elevatorRecommended: false, componentBreakdown: "Ships fully assembled in one carton.", notes: "Do not compress or strap across the cantilever arms during moving." },
      comfort: { feel: "balanced", support: "Flexible frame with a molded foam shell", cushionFill: "Molded high-resilience foam", posture: "Gently reclined reading posture" },
      variantIds: ["var-palis-moss", "var-palis-rust"],
      complementIds: ["prod-nila-daybed", "prod-linea-console", "prod-mica-floor-lamp"],
      featuredRank: 11,
      seo: { title: "Palis Cantilever Lounge Chair | Vestrel House", description: "A graphic open-sided lounge chair with a continuous bronze-tone frame and fitted upholstered shell." },
    },
    {
      id: "prod-plinth-table",
      slug: "plinth-low-table",
      name: "Plinth Low Table",
      productType: "furniture",
      shortDescription: "A substantial rectangular coffee table softened by radiused corners and a recessed base.",
      description: "Plinth reads as a single low volume while preserving useful shadow beneath. A matte mineral-composite surface tolerates everyday placement, and rounded corners ease circulation around deep seating.",
      categoryId: "cat-tables",
      roomIds: ["room-living"],
      collectionIds: ["collection-soft-geometry"],
      styleTags: ["collected modern", "monolithic", "low profile", "rounded"],
      materials: ["Pigmented mineral composite", "Engineered wood core", "Recessed steel base", "Felt floor pads"],
      features: ["Radiused corners", "Recessed shadow base", "Matte sealed surface", "Floor-protecting pads"],
      care: ["Use coasters and trivets.", "Wipe spills promptly with a damp soft cloth.", "Avoid acidic, abrasive, or solvent cleaners."],
      assembly: noAssembly,
      publishedAt: "2026-01-12T15:00:00.000Z",
      images: [
        unsplashImage("1765728614936-53c87c6858cf", 1800, 1200, "Pale sculptural coffee tables grouped in front of a low neutral sectional", "hero", "Allen Boguslavsky", "modern-living-room-with-large-windows-and-city-view-4yrFRvj_3ms"),
        livingContext,
      ],
      dimensions: { overall: { widthIn: 54, heightIn: 13, depthIn: 32 }, itemWeightLb: 118, packages: [{ packageId: "plinth-1", widthIn: 58, heightIn: 18, depthIn: 36, weightLb: 132 }] },
      willItFit: { minimumDoorwayWidthIn: 34, recommendedPathWidthIn: 38, elevatorRecommended: false, componentBreakdown: "Ships fully assembled in one reinforced carton.", notes: "A four-wheel dolly and two handlers are recommended because the weight is concentrated." },
      variantIds: ["var-plinth-chalk", "var-plinth-umber"],
      complementIds: ["prod-vale-sofa", "prod-brera-chair", "prod-tressa-rug"],
      sampleReviewIds: ["review-plinth-01"],
      featuredRank: 4,
      seo: { title: "Plinth Low Table | Vestrel House", description: "A low mineral-composite coffee table with softened corners and a recessed shadow base." },
    },
    {
      id: "prod-serein-side-table",
      slug: "serein-side-table",
      name: "Serein Side Table",
      productType: "furniture",
      shortDescription: "A compact round table balancing a veined stone top on three solid-wood legs.",
      description: "Serein adds material contrast in a small footprint. The honed stone top has a subtly raised edge, while three tapered legs leave enough visual space beside upholstered furniture.",
      categoryId: "cat-tables",
      roomIds: ["room-living", "room-bedroom", "room-workspace"],
      collectionIds: ["collection-material-study"],
      styleTags: ["collected modern", "tripod", "stone", "compact"],
      materials: ["Honed natural stone", "Solid walnut", "Steel mounting plate", "Felt glides"],
      features: ["Raised top edge", "Three-leg base", "Honed surface", "Adjustable felt glides"],
      care: ["Use coasters; natural stone can etch or stain.", "Blot spills immediately.", "Clean only with a pH-neutral stone cleaner."],
      assembly: lightAssembly,
      publishedAt: "2026-02-03T15:00:00.000Z",
      images: [
        unsplashImage("1738091418632-4d9f81013c92", 1800, 1200, "Small round pale-topped table beside a neutral sofa in a layered living room", "hero", "Ana G Mendivil", "a-living-room-with-a-couch-and-a-table-hAgUkf8gZwM"),
        bedroomContext,
      ],
      dimensions: { overall: { widthIn: 20, heightIn: 21, depthIn: 20 }, itemWeightLb: 42, packages: [{ packageId: "serein-1", widthIn: 25, heightIn: 10, depthIn: 25, weightLb: 50 }] },
      willItFit: { minimumDoorwayWidthIn: 22, recommendedPathWidthIn: 24, elevatorRecommended: false, componentBreakdown: "Top and three legs pack together; legs attach on site.", notes: "Carry the stone top vertically with edge protection before assembly." },
      variantIds: ["var-serein-walnut"],
      complementIds: ["prod-morrow-sofa", "prod-tuck-chair", "prod-cove-bed"],
      seo: { title: "Serein Side Table | Vestrel House", description: "A compact round side table with a honed stone top and three tapered walnut legs." },
    },
    {
      id: "prod-arden-dining-table",
      slug: "arden-dining-table",
      name: "Arden Dining Table",
      productType: "furniture",
      shortDescription: "An oval dining table with a slender top and two faceted pedestal bases.",
      description: "Arden opens circulation at the corners while keeping a strong architectural center. Twin pedestal bases preserve flexible chair placement, and the beveled edge makes the broad timber top feel considered rather than heavy.",
      categoryId: "cat-tables",
      roomIds: ["room-dining"],
      collectionIds: ["collection-material-study"],
      styleTags: ["collected modern", "oval", "pedestal", "architectural"],
      materials: ["Walnut veneer", "Engineered wood core", "Solid walnut edge", "Powder-coated steel mounting plates"],
      features: ["Oval beveled top", "Twin pedestal base", "Seats six at 78 inches or eight at 96 inches", "Adjustable levelers"],
      care: ["Use placemats and trivets.", "Wipe with a barely damp cloth and dry immediately.", "Avoid silicone polishes and prolonged direct sunlight."],
      assembly: moderateAssembly,
      publishedAt: "2026-03-02T15:00:00.000Z",
      images: [
        unsplashImage("1719899913493-1e508c3833e8", 1800, 1200, "Oval pale-timber dining table surrounded by curved wooden chairs in a bright room", "hero", "syahmi syahir", "a-wooden-table-and-chairs-in-a-room-wCe0TztIyhc"),
        diningContext,
      ],
      dimensions: { overall: { widthIn: 78, heightIn: 30, depthIn: 42 }, itemWeightLb: 174, packages: [{ packageId: "arden-top", widthIn: 82, heightIn: 7, depthIn: 46, weightLb: 100 }, { packageId: "arden-bases", widthIn: 35, heightIn: 28, depthIn: 24, weightLb: 88 }] },
      willItFit: { minimumDoorwayWidthIn: 30, recommendedPathWidthIn: 36, elevatorRecommended: true, componentBreakdown: "Top and two pedestal bases ship in separate cartons.", notes: "Confirm elevator length against the selected top carton: 82 in or 100 in." },
      variantIds: ["var-arden-78-walnut", "var-arden-96-walnut"],
      complementIds: ["prod-rill-dining-chair", "prod-sable-bench", "prod-vela-pendant"],
      sampleReviewIds: ["review-arden-01"],
      featuredRank: 2,
      seo: { title: "Arden Oval Dining Table | Vestrel House", description: "An oval walnut dining table with a beveled edge, twin pedestals, and seating for six or eight." },
    },
    {
      id: "prod-linea-console",
      slug: "linea-console-table",
      name: "Linea Console Table",
      productType: "furniture",
      shortDescription: "A narrow console that pairs a smoked-glass top with a linear bronze-tone frame.",
      description: "Linea brings a dark, precise edge behind a sofa, along a hall, or beneath art. The raised frame protects the glass perimeter and creates a shallow rail for books and objects.",
      categoryId: "cat-tables",
      roomIds: ["room-living", "room-dining", "room-workspace"],
      collectionIds: ["collection-afterlight"],
      styleTags: ["collected modern", "linear", "glass", "slim profile"],
      materials: ["Tempered smoked glass", "Powder-coated steel", "Silicone glass pads", "Adjustable levelers"],
      features: ["Narrow 14-inch depth", "Raised perimeter rail", "Tempered glass top", "Adjustable feet"],
      care: ["Use a non-ammonia glass cleaner on the top.", "Wipe the frame with a dry microfiber cloth.", "Lift rather than drag when repositioning."],
      assembly: lightAssembly,
      publishedAt: "2026-04-22T15:00:00.000Z",
      images: [
        unsplashImage("1721824296808-92c325601dd8", 1800, 1200, "Slim black console with a mirror, lamp, vase, and books against a gray wall", "hero", "Lisa Anna", "a-living-room-with-a-mirror-and-a-shelf-KtdrZfBsK1o"),
        workspaceContext,
      ],
      dimensions: { overall: { widthIn: 62, heightIn: 30, depthIn: 14 }, itemWeightLb: 74, packages: [{ packageId: "linea-frame", widthIn: 65, heightIn: 8, depthIn: 33, weightLb: 46 }, { packageId: "linea-glass", widthIn: 65, heightIn: 5, depthIn: 18, weightLb: 38 }] },
      willItFit: { minimumDoorwayWidthIn: 20, recommendedPathWidthIn: 24, elevatorRecommended: false, componentBreakdown: "Flat-packed frame and glass top ship separately.", notes: "Keep the glass carton upright and supported along its full edge." },
      variantIds: ["var-linea-smoke"],
      complementIds: ["prod-palis-chair", "prod-ledger-credenza", "prod-mica-floor-lamp"],
      seo: { title: "Linea Console Table | Vestrel House", description: "A narrow smoked-glass console table with a precise bronze-tone steel frame." },
    },
    {
      id: "prod-rill-dining-chair",
      slug: "rill-dining-chair",
      name: "Rill Dining Chair",
      productType: "furniture",
      shortDescription: "An upholstered dining chair with a curved back and exposed solid-ash frame.",
      description: "Rill supports a longer sit without reading like a lounge chair. The back follows the shoulder line, the seat has a modest waterfall edge, and the visible frame keeps the profile light around a large table.",
      categoryId: "cat-dining-seating",
      roomIds: ["room-dining", "room-workspace"],
      collectionIds: ["collection-material-study"],
      styleTags: ["collected modern", "dining", "curved back", "tailored"],
      materials: ["Wool-blend upholstery", "Molded foam", "Solid ash frame", "Nylon glides"],
      features: ["Curved shoulder-height back", "Waterfall seat edge", "Exposed timber frame", "Sold individually"],
      care: ["Vacuum the seat and back regularly.", "Blot spills promptly.", "Wipe timber with a dry soft cloth."],
      assembly: noAssembly,
      publishedAt: "2026-03-02T15:00:00.000Z",
      images: [
        unsplashImage("1598300042247-d088f8ab3a91", 1800, 1200, "Gray upholstered dining chair with a curved back and exposed pale timber frame", "hero", "Sam Moghadam", "gray-and-white-padded-chair-kvmdsTrGOBM"),
        diningContext,
      ],
      dimensions: { overall: { widthIn: 21, heightIn: 32, depthIn: 23 }, itemWeightLb: 18, packages: [{ packageId: "rill-1", widthIn: 24, heightIn: 35, depthIn: 26, weightLb: 25 }], seat: { widthIn: 19, heightIn: 19, depthIn: 18 } },
      willItFit: { minimumDoorwayWidthIn: 24, recommendedPathWidthIn: 26, elevatorRecommended: false, componentBreakdown: "Ships fully assembled, one chair per carton.", notes: "For larger quantities, confirm a staging area for cartons before placement." },
      comfort: { feel: "structured", support: "Molded foam seat and curved shoulder support", cushionFill: "Molded high-resilience foam", posture: "Upright dining posture with a flexible-feeling back" },
      variantIds: ["var-rill-natural-flax", "var-rill-black-ink"],
      complementIds: ["prod-arden-dining-table", "prod-folio-cabinet", "prod-vela-pendant"],
      featuredRank: 9,
      seo: { title: "Rill Dining Chair | Vestrel House", description: "An upholstered modern dining chair with a curved back, waterfall seat, and exposed ash frame." },
    },
    {
      id: "prod-sable-bench",
      slug: "sable-dining-bench",
      name: "Sable Dining Bench",
      productType: "furniture",
      shortDescription: "A slim upholstered bench with softened ends and a dark timber rail base.",
      description: "Sable slides beneath a dining table but is finished to work in an entry or at the foot of a bed. A slightly crowned seat adds comfort without changing the bench’s clean horizontal line.",
      categoryId: "cat-dining-seating",
      roomIds: ["room-dining", "room-bedroom"],
      collectionIds: ["collection-afterlight"],
      styleTags: ["collected modern", "bench", "slim", "multipurpose"],
      materials: ["Textured woven upholstery", "High-resilience foam", "Solid ash base", "Felt glides"],
      features: ["Slightly crowned seat", "Rounded upholstered ends", "Rail-style timber base", "Seats two to three"],
      care: ["Vacuum upholstery using low suction.", "Blot spills without rubbing.", "Check floor glides periodically."],
      assembly: lightAssembly,
      publishedAt: "2026-05-04T15:00:00.000Z",
      images: [
        unsplashImage("1637426345359-7fc29536bb95", 1800, 1200, "Oxide-orange upholstered banquette with loose pillows in a restaurant interior", "hero", "Anna", "a-couch-sitting-in-front-of-a-window-next-to-a-table-pAPwQaaEGCk"),
        diningContext,
      ],
      dimensions: { overall: { widthIn: 62, heightIn: 19, depthIn: 18 }, itemWeightLb: 52, packages: [{ packageId: "sable-1", widthIn: 65, heightIn: 12, depthIn: 21, weightLb: 62 }], seat: { widthIn: 58, heightIn: 19, depthIn: 17 } },
      willItFit: { minimumDoorwayWidthIn: 21, recommendedPathWidthIn: 24, elevatorRecommended: false, componentBreakdown: "Upholstered seat and rail base pack together; base attaches on site.", notes: "The narrow carton can turn vertically in most residential paths." },
      comfort: { feel: "structured", support: "Crowned foam seat over a rigid deck", cushionFill: "High-resilience foam and fiber wrap", posture: "Upright backless perch" },
      variantIds: ["var-sable-oat", "var-sable-oxide"],
      complementIds: ["prod-arden-dining-table", "prod-rill-dining-chair", "prod-frame-canopy-bed"],
      seo: { title: "Sable Dining Bench | Vestrel House", description: "A slim upholstered dining bench with softened ends and a dark solid-ash rail base." },
    },
    {
      id: "prod-ledger-credenza",
      slug: "ledger-media-credenza",
      name: "Ledger Media Credenza",
      productType: "furniture",
      shortDescription: "A low four-door credenza with ribbed walnut fronts and cable-aware storage.",
      description: "Ledger gives media components and everyday objects a quiet architectural home. Ribbed fronts conceal ventilation slots, while the inset base and continuous top keep the long profile visually settled.",
      categoryId: "cat-storage",
      roomIds: ["room-living", "room-dining"],
      collectionIds: ["collection-material-study"],
      styleTags: ["collected modern", "media storage", "ribbed", "low profile"],
      materials: ["Walnut veneer", "Engineered wood", "Solid walnut pulls", "Powder-coated steel base"],
      features: ["Four soft-close doors", "Two adjustable shelves", "Rear cable ports", "Ventilated door reveals"],
      care: ["Dust with a soft dry cloth.", "Wipe spills immediately and dry the surface.", "Do not block rear ventilation clearance."],
      assembly: lightAssembly,
      publishedAt: "2026-01-30T15:00:00.000Z",
      images: [
        unsplashImage("1721385675060-9982ec72385e", 1800, 1200, "Low mid-century timber sideboard with sliding doors and a potted plant", "hero", "Urban Vintage", "a-white-room-with-a-wooden-cabinet-and-a-potted-plant-ynaMTwl3R1A"),
        livingContext,
      ],
      dimensions: { overall: { widthIn: 78, heightIn: 25, depthIn: 20 }, itemWeightLb: 166, packages: [{ packageId: "ledger-case", widthIn: 81, heightIn: 25, depthIn: 23, weightLb: 168 }, { packageId: "ledger-base", widthIn: 75, heightIn: 7, depthIn: 19, weightLb: 18 }] },
      willItFit: { minimumDoorwayWidthIn: 25, recommendedPathWidthIn: 30, elevatorRecommended: true, componentBreakdown: "Cabinet ships assembled; inset base attaches on site.", notes: "Use the 81 in cabinet carton for elevator and landing checks; do not lift by the doors." },
      variantIds: ["var-ledger-walnut"],
      complementIds: ["prod-vale-sofa", "prod-linea-console", "prod-mica-floor-lamp"],
      sampleReviewIds: ["review-ledger-01"],
      featuredRank: 6,
      seo: { title: "Ledger Media Credenza | Vestrel House", description: "A low four-door walnut media credenza with ribbed fronts, adjustable shelves, and cable ports." },
    },
    {
      id: "prod-folio-cabinet",
      slug: "folio-display-cabinet",
      name: "Folio Display Cabinet",
      productType: "furniture",
      shortDescription: "A tall glass-front cabinet with a dark frame, timber back, and integrated low light.",
      description: "Folio treats storage as part of the room’s composition. The slim steel outline frames warm timber shelves, and a dimmable interior strip gives books and objects a low, even wash after dark.",
      categoryId: "cat-storage",
      roomIds: ["room-living", "room-dining", "room-workspace"],
      collectionIds: ["collection-afterlight"],
      styleTags: ["collected modern", "display", "glass front", "tall storage"],
      materials: ["Powder-coated steel", "Tempered glass", "Walnut veneer", "Integrated LED strip"],
      features: ["Two glass doors", "Four adjustable shelves", "Dimmable integrated light", "Wall-restraint hardware included"],
      care: ["Use non-ammonia glass cleaner.", "Dust shelves with a dry soft cloth.", "Have hardwired or concealed-cable changes completed by a qualified professional."],
      assembly: { required: true, level: "professional", estimatedMinutes: 60, description: "Cabinet placement, leveling, door adjustment, and wall restraint require two trained installers.", professionalInstallationAvailable: true },
      publishedAt: "2026-04-01T15:00:00.000Z",
      images: [
        unsplashImage("1774578342061-ee1bd6d6a142", 1800, 1200, "Tall black glass-front cabinet displaying ceramic vessels and framed artwork", "hero", "Franco Debartolo", "black-glass-cabinet-displaying-decorative-vases-and-artwork-ZdPylmn6gBc"),
        diningContext,
      ],
      dimensions: { overall: { widthIn: 42, heightIn: 76, depthIn: 17 }, itemWeightLb: 184, packages: [{ packageId: "folio-case", widthIn: 45, heightIn: 79, depthIn: 20, weightLb: 178 }, { packageId: "folio-shelves", widthIn: 40, heightIn: 9, depthIn: 17, weightLb: 26 }], cordLengthIn: 96 },
      willItFit: { minimumDoorwayWidthIn: 22, recommendedPathWidthIn: 30, elevatorRecommended: true, componentBreakdown: "Cabinet case ships assembled; glass shelves ship separately.", notes: "The case must remain upright. Confirm elevator height and turning clearance against the 79 in carton." },
      variantIds: ["var-folio-walnut"],
      complementIds: ["prod-arden-dining-table", "prod-rill-dining-chair", "prod-linea-console"],
      featuredRank: 10,
      seo: { title: "Folio Display Cabinet | Vestrel House", description: "A tall glass-front display cabinet with walnut shelves, a dark steel frame, and dimmable interior light." },
    },
    {
      id: "prod-parcel-nightstand",
      slug: "parcel-nightstand",
      name: "Parcel Nightstand",
      productType: "furniture",
      shortDescription: "A compact two-drawer nightstand with a wrapped timber case and recessed pulls.",
      description: "Parcel keeps bedside storage visually continuous. Grain wraps over the top and sides, two recessed pulls remove projecting hardware, and the open lower shadow line leaves the case feeling light.",
      categoryId: "cat-storage",
      roomIds: ["room-bedroom"],
      collectionIds: ["collection-material-study"],
      styleTags: ["collected modern", "bedside", "compact storage", "wrapped grain"],
      materials: ["White oak veneer", "Engineered wood", "Solid oak drawer edges", "Soft-close runners"],
      features: ["Two soft-close drawers", "Recessed pulls", "Wrapped-grain case", "Adjustable levelers"],
      care: ["Dust with a dry soft cloth.", "Use a coaster for drinks.", "Avoid placing hot devices directly on the top."],
      assembly: noAssembly,
      publishedAt: "2026-05-18T15:00:00.000Z",
      images: [
        unsplashImage("1652155205433-52179159a15e", 1800, 1200, "Compact warm-oak bedside table with a drawer, lower shelf, and small plant", "hero", "Fujiphilm", "a-wooden-table-in-a-room-pZh3qNF1oKA"),
        bedroomContext,
      ],
      dimensions: { overall: { widthIn: 24, heightIn: 22, depthIn: 18 }, itemWeightLb: 54, packages: [{ packageId: "parcel-1", widthIn: 27, heightIn: 25, depthIn: 21, weightLb: 62 }] },
      willItFit: { minimumDoorwayWidthIn: 22, recommendedPathWidthIn: 24, elevatorRecommended: false, componentBreakdown: "Ships fully assembled in one carton.", notes: "Remove drawers before carrying if a lower lift weight is needed." },
      variantIds: ["var-parcel-oak"],
      complementIds: ["prod-cove-bed", "prod-frame-canopy-bed", "prod-mica-floor-lamp"],
      seo: { title: "Parcel Nightstand | Vestrel House", description: "A compact two-drawer white-oak nightstand with wrapped grain and recessed pulls." },
    },
    {
      id: "prod-cove-bed",
      slug: "cove-upholstered-platform-bed",
      name: "Cove Upholstered Platform Bed",
      productType: "furniture",
      shortDescription: "A low platform bed with a gently wrapped headboard and slim upholstered rails.",
      description: "Cove creates enclosure without a towering headboard. The softly curved wings frame standard mattress widths, while inset timber feet and closely set slats preserve the bed’s low, continuous outline.",
      categoryId: "cat-beds",
      roomIds: ["room-bedroom"],
      collectionIds: ["collection-soft-geometry"],
      styleTags: ["collected modern", "upholstered bed", "low profile", "soft geometry"],
      materials: ["Linen-blend upholstery", "Foam padding", "Hardwood and plywood frame", "Solid ash slats and feet"],
      features: ["Wrapped wing headboard", "Upholstered side rails", "Platform slat system", "Mattress sold separately"],
      care: ["Vacuum the headboard and rails.", "Blot spills immediately.", "Retighten frame hardware after the first month and every six months."],
      assembly: moderateAssembly,
      publishedAt: "2026-02-24T15:00:00.000Z",
      images: [
        unsplashImage("1768946131530-358c52c4c42d", 1800, 1200, "Low neutral upholstered bed with a rounded headboard and white bedding", "hero", "Caroline Badran", "modern-bed-with-rounded-headboard-and-white-linens-2oChNpMfh_k"),
        bedroomContext,
      ],
      dimensions: { overall: { widthIn: 70, heightIn: 42, depthIn: 91 }, itemWeightLb: 174, packages: [{ packageId: "cove-headboard", widthIn: 73, heightIn: 45, depthIn: 12, weightLb: 82 }, { packageId: "cove-rails", widthIn: 88, heightIn: 15, depthIn: 14, weightLb: 58 }, { packageId: "cove-slats", widthIn: 64, heightIn: 8, depthIn: 14, weightLb: 48 }] },
      willItFit: { minimumDoorwayWidthIn: 30, recommendedPathWidthIn: 36, elevatorRecommended: true, componentBreakdown: "Headboard, rails, center support, and slats ship separately.", notes: "Check stairs and elevator against both the headboard and the 88 in rail carton." },
      variantIds: ["var-cove-queen-oat", "var-cove-king-oat"],
      complementIds: ["prod-parcel-nightstand", "prod-mica-floor-lamp", "prod-tressa-rug"],
      sampleReviewIds: ["review-cove-01"],
      featuredRank: 8,
      seo: { title: "Cove Upholstered Platform Bed | Vestrel House", description: "A low upholstered platform bed with a softly wrapped headboard, slim rails, and solid-ash slats." },
    },
    {
      id: "prod-frame-canopy-bed",
      slug: "frame-canopy-bed",
      name: "Frame Canopy Bed",
      productType: "furniture",
      shortDescription: "A precise timber canopy bed with an upholstered headboard panel and open upper frame.",
      description: "Frame uses a narrow solid-ash structure to draw the room without filling it. The inset textile headboard softens the grid, and the open canopy can remain bare for the clearest architectural expression.",
      categoryId: "cat-beds",
      roomIds: ["room-bedroom"],
      collectionIds: ["collection-afterlight"],
      styleTags: ["collected modern", "canopy", "architectural", "dark timber"],
      materials: ["Solid ash", "Ash veneer", "Wool-blend upholstered panel", "Solid wood slats", "Steel hardware"],
      features: ["Open canopy frame", "Inset upholstered headboard", "Platform slat system", "Mattress sold separately"],
      care: ["Dust timber and upper rails with an extendable soft duster.", "Vacuum the headboard panel.", "Retighten frame hardware every six months."],
      assembly: { required: true, level: "professional", estimatedMinutes: 90, description: "Two trained installers should assemble, square, level, and recheck all upper-frame connections.", professionalInstallationAvailable: true },
      publishedAt: "2026-04-27T15:00:00.000Z",
      images: [
        unsplashImage("1676056312173-4243b4773b29", 1800, 1200, "Dark timber canopy bed with an open upper frame and pale upholstered headboard", "hero", "Rebeca Alvidrez", "a-bedroom-with-a-bed-and-a-chandelier-X0vdXzgTQr0"),
        bedroomContext,
      ],
      dimensions: { overall: { widthIn: 66, heightIn: 84, depthIn: 88 }, itemWeightLb: 196, packages: [{ packageId: "frame-headboard", widthIn: 68, heightIn: 43, depthIn: 9, weightLb: 62 }, { packageId: "frame-posts", widthIn: 86, heightIn: 10, depthIn: 12, weightLb: 64 }, { packageId: "frame-rails", widthIn: 84, heightIn: 13, depthIn: 14, weightLb: 48 }, { packageId: "frame-slats", widthIn: 61, heightIn: 8, depthIn: 14, weightLb: 38 }] },
      willItFit: { minimumDoorwayWidthIn: 28, recommendedPathWidthIn: 34, elevatorRecommended: true, componentBreakdown: "Headboard, posts, rails, canopy members, and slats ship separately.", notes: "Confirm the 86 in post carton fits elevators and stair turns; verify final ceiling height before assembly." },
      variantIds: ["var-frame-queen-espresso", "var-frame-king-espresso"],
      complementIds: ["prod-parcel-nightstand", "prod-sable-bench", "prod-tressa-rug"],
      seo: { title: "Frame Canopy Bed | Vestrel House", description: "An architectural solid-ash canopy bed with an open upper frame and inset upholstered headboard." },
    },
    {
      id: "prod-axis-desk",
      slug: "axis-writing-desk",
      name: "Axis Writing Desk",
      productType: "furniture",
      shortDescription: "A generous writing desk with a floating drawer box and offset trestle base.",
      description: "Axis separates storage from structure so the desk remains visually open. A slim two-drawer box sits beneath one side of the top, balanced by an offset trestle that leaves flexible knee space.",
      categoryId: "cat-workspace",
      roomIds: ["room-workspace"],
      collectionIds: ["collection-material-study"],
      styleTags: ["collected modern", "writing desk", "asymmetrical", "walnut"],
      materials: ["Walnut veneer", "Solid walnut edge", "Engineered wood", "Powder-coated steel", "Felt cable grommet"],
      features: ["Two soft-close drawers", "Offset trestle base", "Rear cable grommet", "Finished on all sides"],
      care: ["Use a desk pad beneath writing tools and hot devices.", "Wipe with a soft barely damp cloth.", "Do not overload open drawers."],
      assembly: moderateAssembly,
      publishedAt: "2026-03-25T15:00:00.000Z",
      images: [
        unsplashImage("1486946255434-2466348c2166", 1800, 1200, "Warm timber writing desk with slim dark legs, a drawer, and an angled task lamp", "hero", "Kari Shea", "black-2-light-torchiere-beside-brown-wooden-top-desk-with-black-steel-frame-tOVmshavtoo"),
        workspaceContext,
      ],
      dimensions: { overall: { widthIn: 68, heightIn: 30, depthIn: 30 }, itemWeightLb: 116, packages: [{ packageId: "axis-top", widthIn: 72, heightIn: 9, depthIn: 34, weightLb: 72 }, { packageId: "axis-base", widthIn: 35, heightIn: 15, depthIn: 27, weightLb: 54 }] },
      willItFit: { minimumDoorwayWidthIn: 32, recommendedPathWidthIn: 36, elevatorRecommended: false, componentBreakdown: "Desktop with drawer box and the two base components ship separately.", notes: "The drawer box remains attached to the desktop; plan around the 72 × 34 × 9 in top carton." },
      variantIds: ["var-axis-walnut"],
      complementIds: ["prod-rove-task-chair", "prod-folio-cabinet", "prod-mica-floor-lamp"],
      sampleReviewIds: ["review-axis-01"],
      featuredRank: 12,
      seo: { title: "Axis Writing Desk | Vestrel House", description: "A walnut writing desk with a floating two-drawer box, offset trestle base, and cable grommet." },
    },
    {
      id: "prod-fold-secretary",
      slug: "fold-secretary-desk",
      name: "Fold Secretary Desk",
      productType: "furniture",
      shortDescription: "A compact wall-like cabinet that opens into a work surface with organized storage.",
      description: "Fold allows a workspace to close at the end of the day. The drop-front creates a 32-inch-deep desk, while shallow shelves, a drawer, and cable access keep work essentials contained.",
      categoryId: "cat-workspace",
      roomIds: ["room-living", "room-bedroom", "room-workspace"],
      collectionIds: ["collection-afterlight"],
      styleTags: ["collected modern", "secretary", "compact workspace", "transforming"],
      materials: ["Oak veneer", "Engineered wood", "Powder-coated steel supports", "Soft-close hardware"],
      features: ["Drop-front work surface", "One drawer and three shelves", "Integrated cable opening", "Wall-restraint hardware included"],
      care: ["Close the work surface before moving the cabinet.", "Wipe with a soft dry or barely damp cloth.", "Keep hinges and support arms free of loose objects."],
      assembly: { required: true, level: "professional", estimatedMinutes: 60, description: "Two installers should level the cabinet, fit the base, and secure the included wall restraint to an appropriate substrate.", professionalInstallationAvailable: true },
      publishedAt: "2026-05-27T15:00:00.000Z",
      images: [
        unsplashImage("1666204576299-69ac3bea55ae", 1800, 1200, "Compact timber secretary desk opened with books, shelves, drawers, and a mirror", "hero", "Josef Maxson", "a-desk-with-books-and-a-mirror-ux60F5yDrkQ"),
        workspaceContext,
      ],
      dimensions: { overall: { widthIn: 42, heightIn: 58, depthIn: 18 }, itemWeightLb: 148, packages: [{ packageId: "fold-case", widthIn: 45, heightIn: 61, depthIn: 21, weightLb: 150 }, { packageId: "fold-base", widthIn: 41, heightIn: 9, depthIn: 18, weightLb: 16 }] },
      willItFit: { minimumDoorwayWidthIn: 23, recommendedPathWidthIn: 30, elevatorRecommended: true, componentBreakdown: "Cabinet ships assembled; base attaches on site. Open depth is 32 inches.", notes: "Keep the 61 in cabinet carton upright and verify wall construction at the final location." },
      variantIds: ["var-fold-smoked-oak"],
      complementIds: ["prod-rove-task-chair", "prod-palis-chair", "prod-mica-floor-lamp"],
      seo: { title: "Fold Secretary Desk | Vestrel House", description: "A compact secretary cabinet with a drop-front work surface, shelves, drawer, and cable access." },
    },
    {
      id: "prod-rove-task-chair",
      slug: "rove-task-chair",
      name: "Rove Task Chair",
      productType: "furniture",
      shortDescription: "An adjustable task chair with a tailored upholstered shell and compact five-star base.",
      description: "Rove brings necessary adjustment into a residential material language. A slim upholstered shell flexes at the upper back, while concealed controls handle seat height, tilt tension, and tilt lock.",
      categoryId: "cat-workspace",
      roomIds: ["room-workspace"],
      collectionIds: ["collection-soft-geometry"],
      styleTags: ["collected modern", "task chair", "adjustable", "tailored"],
      materials: ["Wool-blend upholstery", "Molded foam shell", "Powder-coated aluminum base", "Dual-wheel casters"],
      features: ["Pneumatic seat-height adjustment", "Tilt tension and lock", "Upper-back flex", "Carpet and hard-floor compatible casters"],
      care: ["Vacuum upholstery regularly.", "Wipe the base and controls with a dry cloth.", "Remove fibers from caster axles as needed."],
      assembly: lightAssembly,
      publishedAt: "2026-04-15T15:00:00.000Z",
      images: [
        unsplashImage("1688578735352-9a6f2ac3b70a", 1800, 1200, "Adjustable gray office chair with a padded seat, wheeled base, and pale frame", "hero", "EFFYDESK", "a-gray-office-chair-sitting-next-to-a-wooden-table-7mfNpV5eJH0"),
        workspaceContext,
      ],
      dimensions: { overall: { widthIn: 26, heightIn: 39, depthIn: 26 }, itemWeightLb: 36, packages: [{ packageId: "rove-1", widthIn: 29, heightIn: 25, depthIn: 28, weightLb: 44 }], seat: { widthIn: 20, heightIn: 20, depthIn: 18 } },
      willItFit: { minimumDoorwayWidthIn: 27, recommendedPathWidthIn: 29, elevatorRecommended: false, componentBreakdown: "Seat shell, gas lift, and base pack in one carton; seat height adjusts from 17 to 21 inches.", notes: "Assemble in the room where the chair will be used to simplify moving." },
      comfort: { feel: "structured", support: "Molded seat with flexible upper-back shell", cushionFill: "Molded high-resilience foam", posture: "Adjustable upright task posture" },
      variantIds: ["var-rove-oat", "var-rove-ink"],
      complementIds: ["prod-axis-desk", "prod-fold-secretary", "prod-folio-cabinet"],
      seo: { title: "Rove Upholstered Task Chair | Vestrel House", description: "An adjustable upholstered task chair with tilt control, upper-back flex, and a compact aluminum base." },
    },
    {
      id: "prod-mica-floor-lamp",
      slug: "mica-floor-lamp",
      name: "Mica Floor Lamp",
      productType: "lighting",
      shortDescription: "A slim reading lamp with a broad linen shade and weighted bronze-tone base.",
      description: "Mica places warm light without a large footprint. The offset stem slides neatly beside seating, and a dimmer at hand height shifts from reading light to an ambient evening glow.",
      categoryId: "cat-lighting-textiles",
      roomIds: ["room-living", "room-bedroom", "room-workspace"],
      collectionIds: ["collection-afterlight"],
      styleTags: ["collected modern", "floor lamp", "reading light", "slim"],
      materials: ["Powder-coated steel", "Bronze-tone finish", "Linen shade", "Fabric-wrapped cord"],
      features: ["Integrated dimmer", "Weighted base", "Replaceable E26 bulb", "Bulb not included"],
      care: ["Unplug before cleaning or changing the bulb.", "Dust the shade with a soft brush.", "Wipe metal with a dry cloth; do not use polish."],
      assembly: lightAssembly,
      publishedAt: "2026-01-20T15:00:00.000Z",
      images: [
        unsplashImage("1642689703534-e41f29622078", 1800, 1200, "Slim dark floor lamp with a broad natural shade beside a timber table and ceramic vases", "hero", "Mary Skrynnikova 💛💙", "a-table-with-two-vases-and-a-lamp-on-it-f9mpWX2a-QU"),
        livingContext,
      ],
      dimensions: { overall: { widthIn: 18, heightIn: 58, depthIn: 24 }, itemWeightLb: 24, packages: [{ packageId: "mica-1", widthIn: 25, heightIn: 12, depthIn: 21, weightLb: 31 }], cordLengthIn: 96 },
      variantIds: ["var-mica-bronze-linen", "var-mica-black-parchment"],
      complementIds: ["prod-brera-chair", "prod-nila-daybed", "prod-axis-desk"],
      featuredRank: 13,
      seo: { title: "Mica Dimmable Floor Lamp | Vestrel House", description: "A slim reading floor lamp with a linen shade, hand-height dimmer, and weighted bronze-tone base." },
    },
    {
      id: "prod-vela-pendant",
      slug: "vela-pendant-light",
      name: "Vela Pendant Light",
      productType: "lighting",
      shortDescription: "A wide shallow pendant that washes the dining table with diffused downward light.",
      description: "Vela combines an opaque spun-metal dome with a recessed diffuser, keeping the source soft from seated eye level. Its broad diameter suits tables without competing with the view across them.",
      categoryId: "cat-lighting-textiles",
      roomIds: ["room-dining", "room-workspace"],
      collectionIds: ["collection-material-study"],
      styleTags: ["collected modern", "pendant", "dining light", "shallow dome"],
      materials: ["Spun aluminum", "Powder-coated finish", "Opal acrylic diffuser", "Fabric-wrapped cord"],
      features: ["Dimmable with compatible bulb and wall dimmer", "Adjustable drop", "Replaceable E26 bulb", "Bulb not included"],
      care: ["Switch power off at the breaker before service.", "Dust with a dry soft cloth.", "Use a qualified electrician for installation."],
      assembly: { required: true, level: "professional", estimatedMinutes: 45, description: "Hardwire to a listed ceiling junction box using a qualified electrician; set and trim the drop on site.", professionalInstallationAvailable: true },
      publishedAt: "2026-03-09T15:00:00.000Z",
      images: [
        unsplashImage("1540932239986-30128078f3c5", 1800, 1200, "Cluster of large oxide-colored metal pendant lights glowing against a dark background", "hero", "Jean-Philippe Delberghe", "turned-on-pendant-lamps-Ry9WBo3qmoc"),
        diningContext,
      ],
      dimensions: { overall: { widthIn: 32, heightIn: 8, depthIn: 32 }, itemWeightLb: 12, packages: [{ packageId: "vela-1", widthIn: 36, heightIn: 13, depthIn: 36, weightLb: 20 }], cordLengthIn: 120 },
      variantIds: ["var-vela-bone", "var-vela-oxide"],
      complementIds: ["prod-arden-dining-table", "prod-rill-dining-chair", "prod-folio-cabinet"],
      seo: { title: "Vela Dining Pendant Light | Vestrel House", description: "A wide shallow dining pendant with a spun-metal shade, recessed diffuser, and adjustable drop." },
    },
    {
      id: "prod-tressa-rug",
      slug: "tressa-wool-rug",
      name: "Tressa Wool Rug",
      productType: "textile",
      shortDescription: "A low-pile wool rug with an offset linear field in oat, clay, and charcoal.",
      description: "Tressa grounds broad furniture without becoming a background solid. Fine broken lines shift in density across the field, adding enough movement to connect timber, stone, and upholstered pieces.",
      categoryId: "cat-lighting-textiles",
      roomIds: ["room-living", "room-dining", "room-bedroom", "room-workspace"],
      collectionIds: ["collection-soft-geometry"],
      styleTags: ["collected modern", "wool rug", "linear", "low pile"],
      materials: ["Wool pile", "Cotton foundation", "Latex backing bands"],
      features: ["Low 0.4-inch pile rounded to 1 inch in catalog dimensions", "Bound edges", "Subtle directional pattern", "Rug pad recommended"],
      care: ["Vacuum without a beater bar.", "Rotate every three months.", "Use a professional rug cleaner for set stains or full cleaning."],
      assembly: noAssembly,
      publishedAt: "2026-02-10T15:00:00.000Z",
      images: [
        unsplashImage("1600166898405-da9535204843", 1800, 1200, "Stack of low-pile beige, clay, and blue-gray patterned rugs with fringed edges", "hero", "Erfan Banaei", "a-rug-with-fringes-laying-on-top-of-it-p00r5JmTMpY"),
        livingContext,
      ],
      dimensions: { overall: { widthIn: 96, heightIn: 1, depthIn: 120 }, itemWeightLb: 52, packages: [{ packageId: "tressa-8x10", widthIn: 10, heightIn: 10, depthIn: 98, weightLb: 56 }] },
      variantIds: ["var-tressa-8x10-oat", "var-tressa-9x12-oat"],
      complementIds: ["prod-vale-sofa", "prod-arden-dining-table", "prod-cove-bed"],
      seo: { title: "Tressa Wool Rug | Vestrel House", description: "A low-pile wool rug with a quiet offset line pattern in oat, clay, and charcoal." },
    },
  ],
  variants: [
    { id: "var-vale-oat", productId: "prod-vale-sofa", sku: "VH-VAL-108-OAT", options: [{ name: "Upholstery", value: "Oat weave" }], priceMinor: 620000, currency: "USD", leadTimeLabel: "Estimated 10–14 weeks" },
    { id: "var-vale-oxide", productId: "prod-vale-sofa", sku: "VH-VAL-108-OXI", options: [{ name: "Upholstery", value: "Oxide weave" }], priceMinor: 640000, currency: "USD", leadTimeLabel: "Estimated 10–14 weeks" },
    { id: "var-morrow-flax", productId: "prod-morrow-sofa", sku: "VH-MOR-078-FLX", options: [{ name: "Upholstery", value: "Flax basket weave" }], priceMinor: 380000, currency: "USD", leadTimeLabel: "Estimated 8–12 weeks" },
    { id: "var-morrow-ink", productId: "prod-morrow-sofa", sku: "VH-MOR-078-INK", options: [{ name: "Upholstery", value: "Ink basket weave" }], priceMinor: 395000, currency: "USD", leadTimeLabel: "Estimated 8–12 weeks" },
    { id: "var-canto-moss-left", productId: "prod-canto-sectional", sku: "VH-CAN-122-MOS-L", options: [{ name: "Upholstery", value: "Moss velvet" }, { name: "Chaise", value: "Left-facing" }], priceMinor: 720000, currency: "USD", leadTimeLabel: "Estimated 12–16 weeks" },
    { id: "var-canto-moss-right", productId: "prod-canto-sectional", sku: "VH-CAN-122-MOS-R", options: [{ name: "Upholstery", value: "Moss velvet" }, { name: "Chaise", value: "Right-facing" }], priceMinor: 720000, currency: "USD", leadTimeLabel: "Estimated 12–16 weeks" },
    { id: "var-nila-oat", productId: "prod-nila-daybed", sku: "VH-NIL-080-OAT", options: [{ name: "Upholstery", value: "Oat wool blend" }], priceMinor: 320000, currency: "USD", leadTimeLabel: "Estimated 8–12 weeks" },
    { id: "var-nila-clay", productId: "prod-nila-daybed", sku: "VH-NIL-080-CLY", options: [{ name: "Upholstery", value: "Clay wool blend" }], priceMinor: 330000, currency: "USD", leadTimeLabel: "Estimated 8–12 weeks" },
    { id: "var-brera-ivory", productId: "prod-brera-chair", sku: "VH-BRE-033-IVR", options: [{ name: "Upholstery", value: "Ivory boucle" }], priceMinor: 245000, currency: "USD", leadTimeLabel: "Estimated 8–10 weeks" },
    { id: "var-brera-tobacco", productId: "prod-brera-chair", sku: "VH-BRE-033-TOB", options: [{ name: "Upholstery", value: "Tobacco texture" }], priceMinor: 255000, currency: "USD", leadTimeLabel: "Estimated 8–10 weeks" },
    { id: "var-tuck-flax", productId: "prod-tuck-chair", sku: "VH-TUC-031-FLX", options: [{ name: "Upholstery", value: "Flax linen blend" }], priceMinor: 225000, currency: "USD", leadTimeLabel: "Estimated 8–10 weeks" },
    { id: "var-tuck-graphite", productId: "prod-tuck-chair", sku: "VH-TUC-031-GRA", options: [{ name: "Upholstery", value: "Graphite linen blend" }], priceMinor: 225000, currency: "USD", leadTimeLabel: "Estimated 8–10 weeks" },
    { id: "var-palis-moss", productId: "prod-palis-chair", sku: "VH-PAL-027-MOS", options: [{ name: "Upholstery", value: "Moss wool blend" }], priceMinor: 260000, currency: "USD", leadTimeLabel: "Estimated 10–12 weeks" },
    { id: "var-palis-rust", productId: "prod-palis-chair", sku: "VH-PAL-027-RST", options: [{ name: "Upholstery", value: "Rust wool blend" }], priceMinor: 260000, currency: "USD", leadTimeLabel: "Estimated 10–12 weeks" },
    { id: "var-plinth-chalk", productId: "prod-plinth-table", sku: "VH-PLI-054-CHK", options: [{ name: "Finish", value: "Chalk" }], priceMinor: 185000, currency: "USD", leadTimeLabel: "Estimated 6–8 weeks" },
    { id: "var-plinth-umber", productId: "prod-plinth-table", sku: "VH-PLI-054-UMB", options: [{ name: "Finish", value: "Umber" }], priceMinor: 185000, currency: "USD", leadTimeLabel: "Estimated 6–8 weeks" },
    { id: "var-serein-walnut", productId: "prod-serein-side-table", sku: "VH-SER-020-WAL", options: [{ name: "Base", value: "Walnut" }, { name: "Stone", value: "Warm cream" }], priceMinor: 78000, currency: "USD", leadTimeLabel: "Estimated 4–6 weeks" },
    { id: "var-arden-78-walnut", productId: "prod-arden-dining-table", sku: "VH-ARD-078-WAL", options: [{ name: "Size", value: "78 in" }, { name: "Finish", value: "Walnut" }], priceMinor: 480000, currency: "USD", leadTimeLabel: "Estimated 10–14 weeks", overallDimensions: { widthIn: 78, heightIn: 30, depthIn: 42 } },
    { id: "var-arden-96-walnut", productId: "prod-arden-dining-table", sku: "VH-ARD-096-WAL", options: [{ name: "Size", value: "96 in" }, { name: "Finish", value: "Walnut" }], priceMinor: 560000, currency: "USD", leadTimeLabel: "Estimated 10–14 weeks", overallDimensions: { widthIn: 96, heightIn: 30, depthIn: 44 } },
    { id: "var-linea-smoke", productId: "prod-linea-console", sku: "VH-LIN-062-SMK", options: [{ name: "Glass", value: "Smoke" }, { name: "Frame", value: "Dark bronze" }], priceMinor: 210000, currency: "USD", leadTimeLabel: "Estimated 8–10 weeks" },
    { id: "var-rill-natural-flax", productId: "prod-rill-dining-chair", sku: "VH-RIL-021-NAT-FLX", options: [{ name: "Frame", value: "Natural ash" }, { name: "Upholstery", value: "Flax" }], priceMinor: 95000, currency: "USD", leadTimeLabel: "Estimated 8–10 weeks" },
    { id: "var-rill-black-ink", productId: "prod-rill-dining-chair", sku: "VH-RIL-021-BLK-INK", options: [{ name: "Frame", value: "Black ash" }, { name: "Upholstery", value: "Ink" }], priceMinor: 98000, currency: "USD", leadTimeLabel: "Estimated 8–10 weeks" },
    { id: "var-sable-oat", productId: "prod-sable-bench", sku: "VH-SAB-062-OAT", options: [{ name: "Upholstery", value: "Oat weave" }], priceMinor: 170000, currency: "USD", leadTimeLabel: "Estimated 8–10 weeks" },
    { id: "var-sable-oxide", productId: "prod-sable-bench", sku: "VH-SAB-062-OXI", options: [{ name: "Upholstery", value: "Oxide weave" }], priceMinor: 175000, currency: "USD", leadTimeLabel: "Estimated 8–10 weeks" },
    { id: "var-ledger-walnut", productId: "prod-ledger-credenza", sku: "VH-LED-078-WAL", options: [{ name: "Finish", value: "Walnut" }], priceMinor: 390000, currency: "USD", leadTimeLabel: "Estimated 10–14 weeks" },
    { id: "var-folio-walnut", productId: "prod-folio-cabinet", sku: "VH-FOL-076-WAL", options: [{ name: "Interior", value: "Walnut" }, { name: "Frame", value: "Ink" }], priceMinor: 460000, currency: "USD", leadTimeLabel: "Estimated 12–16 weeks" },
    { id: "var-parcel-oak", productId: "prod-parcel-nightstand", sku: "VH-PAR-024-OAK", options: [{ name: "Finish", value: "White oak" }], priceMinor: 120000, currency: "USD", leadTimeLabel: "Estimated 8–10 weeks" },
    { id: "var-cove-queen-oat", productId: "prod-cove-bed", sku: "VH-COV-QN-OAT", options: [{ name: "Size", value: "Queen" }, { name: "Upholstery", value: "Oat linen blend" }], priceMinor: 450000, currency: "USD", leadTimeLabel: "Estimated 10–14 weeks", overallDimensions: { widthIn: 70, heightIn: 42, depthIn: 91 } },
    { id: "var-cove-king-oat", productId: "prod-cove-bed", sku: "VH-COV-KG-OAT", options: [{ name: "Size", value: "King" }, { name: "Upholstery", value: "Oat linen blend" }], priceMinor: 510000, currency: "USD", leadTimeLabel: "Estimated 10–14 weeks", overallDimensions: { widthIn: 86, heightIn: 42, depthIn: 91 } },
    { id: "var-frame-queen-espresso", productId: "prod-frame-canopy-bed", sku: "VH-FRA-QN-ESP", options: [{ name: "Size", value: "Queen" }, { name: "Finish", value: "Espresso ash" }], priceMinor: 520000, currency: "USD", leadTimeLabel: "Estimated 12–16 weeks", overallDimensions: { widthIn: 66, heightIn: 84, depthIn: 88 } },
    { id: "var-frame-king-espresso", productId: "prod-frame-canopy-bed", sku: "VH-FRA-KG-ESP", options: [{ name: "Size", value: "King" }, { name: "Finish", value: "Espresso ash" }], priceMinor: 590000, currency: "USD", leadTimeLabel: "Estimated 12–16 weeks", overallDimensions: { widthIn: 82, heightIn: 84, depthIn: 88 } },
    { id: "var-axis-walnut", productId: "prod-axis-desk", sku: "VH-AXI-068-WAL", options: [{ name: "Finish", value: "Walnut" }], priceMinor: 260000, currency: "USD", leadTimeLabel: "Estimated 8–12 weeks" },
    { id: "var-fold-smoked-oak", productId: "prod-fold-secretary", sku: "VH-FOL-042-SMO", options: [{ name: "Finish", value: "Smoked oak" }], priceMinor: 340000, currency: "USD", leadTimeLabel: "Estimated 10–14 weeks" },
    { id: "var-rove-oat", productId: "prod-rove-task-chair", sku: "VH-ROV-026-OAT", options: [{ name: "Upholstery", value: "Oat wool blend" }], priceMinor: 165000, currency: "USD", leadTimeLabel: "Estimated 6–8 weeks" },
    { id: "var-rove-ink", productId: "prod-rove-task-chair", sku: "VH-ROV-026-INK", options: [{ name: "Upholstery", value: "Ink wool blend" }], priceMinor: 165000, currency: "USD", leadTimeLabel: "Estimated 6–8 weeks" },
    { id: "var-mica-bronze-linen", productId: "prod-mica-floor-lamp", sku: "VH-MIC-058-BRZ", options: [{ name: "Finish", value: "Dark bronze" }, { name: "Shade", value: "Natural linen" }], priceMinor: 130000, currency: "USD", leadTimeLabel: "Estimated 4–6 weeks" },
    { id: "var-mica-black-parchment", productId: "prod-mica-floor-lamp", sku: "VH-MIC-058-BLK", options: [{ name: "Finish", value: "Ink black" }, { name: "Shade", value: "Parchment" }], priceMinor: 130000, currency: "USD", leadTimeLabel: "Estimated 4–6 weeks" },
    { id: "var-vela-bone", productId: "prod-vela-pendant", sku: "VH-VEL-032-BON", options: [{ name: "Finish", value: "Bone" }], priceMinor: 155000, currency: "USD", leadTimeLabel: "Estimated 6–8 weeks" },
    { id: "var-vela-oxide", productId: "prod-vela-pendant", sku: "VH-VEL-032-OXI", options: [{ name: "Finish", value: "Oxide" }], priceMinor: 155000, currency: "USD", leadTimeLabel: "Estimated 6–8 weeks" },
    { id: "var-tressa-8x10-oat", productId: "prod-tressa-rug", sku: "VH-TRE-0810-OAT", options: [{ name: "Size", value: "8 × 10 ft" }, { name: "Palette", value: "Oat / clay" }], priceMinor: 180000, currency: "USD", leadTimeLabel: "Estimated 4–6 weeks", overallDimensions: { widthIn: 96, heightIn: 1, depthIn: 120 } },
    { id: "var-tressa-9x12-oat", productId: "prod-tressa-rug", sku: "VH-TRE-0912-OAT", options: [{ name: "Size", value: "9 × 12 ft" }, { name: "Palette", value: "Oat / clay" }], priceMinor: 240000, currency: "USD", leadTimeLabel: "Estimated 4–6 weeks", overallDimensions: { widthIn: 108, heightIn: 1, depthIn: 144 } },
  ],
  sampleReviews: [
    { id: "review-vale-01", productId: "prod-vale-sofa", isSample: true, displayName: "M. R.", location: "Brooklyn, NY", publishedAt: "2026-05-14T15:00:00.000Z", title: "The room finally has a center", body: "Our fictional consultant checked the elevator and helped balance the sofa with two lighter chairs. The medium-depth seat is the detail this sample household appreciated most.", disclosure: "Fictional sample review for portfolio demonstration only." },
    { id: "review-nila-01", productId: "prod-nila-daybed", isSample: true, displayName: "A. K.", location: "Toronto, ON", publishedAt: "2026-06-02T15:00:00.000Z", title: "Useful from every side", body: "In this sample scenario, the daybed divides a long room without blocking the windows. The consultant’s taped floor plan made the scale easy to understand before the proposal.", disclosure: "Fictional sample review for portfolio demonstration only." },
    { id: "review-plinth-01", productId: "prod-plinth-table", isSample: true, displayName: "J. S.", location: "Austin, TX", publishedAt: "2026-04-21T15:00:00.000Z", title: "Substantial, not severe", body: "This fictional customer liked how the rounded corners softened a large sectional. The delivery discussion also made the table’s concentrated weight clear before approval.", disclosure: "Fictional sample review for portfolio demonstration only." },
    { id: "review-arden-01", productId: "prod-arden-dining-table", isSample: true, displayName: "L. T.", location: "Chicago, IL", publishedAt: "2026-05-29T15:00:00.000Z", title: "The oval changed the circulation", body: "The sample consultation compared both sizes on our imaginary floor plan. Choosing the 78-inch top left a comfortable path to the kitchen and still made six seats feel generous.", disclosure: "Fictional sample review for portfolio demonstration only." },
    { id: "review-ledger-01", productId: "prod-ledger-credenza", isSample: true, displayName: "C. D.", location: "Portland, OR", publishedAt: "2026-06-17T15:00:00.000Z", title: "Storage without visual noise", body: "In this fictional project, components and cables fit behind the ribbed doors while the long top stayed open for art. Access measurements were reviewed before proposal approval.", disclosure: "Fictional sample review for portfolio demonstration only." },
    { id: "review-cove-01", productId: "prod-cove-bed", isSample: true, displayName: "S. P.", location: "Vancouver, BC", publishedAt: "2026-06-25T15:00:00.000Z", title: "Soft shape, clear proportions", body: "This sample household used the room plan to confirm king-size clearance and nightstand spacing. The wrapped headboard gave the room a finished edge without feeling tall.", disclosure: "Fictional sample review for portfolio demonstration only." },
    { id: "review-axis-01", productId: "prod-axis-desk", isSample: true, displayName: "N. B.", location: "Boston, MA", publishedAt: "2026-07-08T15:00:00.000Z", title: "A desk that can face the room", body: "Because the back is finished, the fictional plan floated this desk toward the windows. The offset drawer placement left the wider knee space where it was actually needed.", disclosure: "Fictional sample review for portfolio demonstration only." },
  ],
} as const;
