export type Theme = {
  themeName: string;
  primary: string;
  secondary: string;
  accent: string;
  page: string;
  surface: string;
  heading: string;
  body: string;
  muted: string;
  link: string;
  linkHover: string;
  button: string;
  buttonText: string;
  buttonHover: string;
  border: string;
  header: string;
  navigation: string;
  footer: string;
  footerText: string;
  font: string;
  headingFont: string;
  typographyScale: number;
  radius: number;
  contentWidth: number;
  cardShadow: "none" | "soft" | "lifted";
  sectionSpacing: number;
};

export type ContentSection = {
  id: string;
  title: string;
  body: string;
  image: string;
  enabled: boolean;
  order: number;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  enabled: boolean;
};

export type ProductPage = {
  heading: string;
  subheading: string;
  description: string;
  image: string;
  sections: ContentSection[];
};

export type SiteConfig = {
  site: {
    companyName: string;
    title: string;
    description: string;
    logo: string;
    favicon: string;
    footer: string;
  };
  theme: Theme;
  home: {
    eyebrow: string;
    heading: string;
    subheading: string;
    description: string;
    heroImage: string;
    heroBackground: string;
    primaryLabel: string;
    primaryLink: string;
    secondaryLabel: string;
    secondaryLink: string;
    banner: string;
    sections: ContentSection[];
  };
  about: {
    heading: string;
    introduction: string;
    history: string;
    mission: string;
    vision: string;
    values: string;
    image: string;
    sections: ContentSection[];
    team: TeamMember[];
  };
  contact: {
    heading: string;
    introduction: string;
    email: string;
    phone: string;
    address: string;
    hours: string;
    instagram: string;
    facebook: string;
    successMessage: string;
    formLabels: {
      name: string;
      email: string;
      subject: string;
      message: string;
      submit: string;
    };
  };
  productPage: ProductPage;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  image: string;
  gallery: string[];
  price: number;
  discountPrice: number | null;
  category: string;
  sku: string;
  active: boolean;
  published: boolean;
  ctaLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = {
  productId: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

export type PaymentMethod = "Cash" | "UPI (GPay / Other apps)" | "Card";

export type Order = {
  id: number;
  orderId: string;
  serialNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: PaymentMethod;
  items: CartItem[];
  total: number;
  createdAt: string;
};
