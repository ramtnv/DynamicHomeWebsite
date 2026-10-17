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
};

const lightTheme: Theme = {
  themeName: "Nature Green",
  primary: "#2d5c50",
  secondary: "#d7e2d9",
  accent: "#d77955",
  page: "#f5f4ef",
  surface: "#ffffff",
  heading: "#202823",
  body: "#515b54",
  muted: "#626b64",
  link: "#2d5c50",
  linkHover: "#1d4037",
  button: "#2d5c50",
  buttonText: "#ffffff",
  buttonHover: "#1d4037",
  border: "#e3e5df",
  header: "#f5f4ef",
  navigation: "#626b64",
  footer: "#202823",
  footerText: "#d2d8d3",
  font: "DM Sans",
  headingFont: "Playfair Display",
  typographyScale: 1.1,
  radius: 12,
  contentWidth: 1600,
  cardShadow: "soft",
  sectionSpacing: 104,
};

export const defaultConfig: SiteConfig = {
  site: {
    companyName: "Atelier & Co.",
    title: "Atelier & Co. — Thoughtful Goods",
    description: "Thoughtful goods for everyday living.",
    logo: "",
    favicon: "",
    footer: "Made with care, for the everyday.",
  },
  theme: lightTheme,
  home: {
    eyebrow: "Made for slower mornings",
    heading: "Make room for\nwhat matters.",
    subheading: "Thoughtful goods for everyday living.",
    description:
      "A considered collection of home essentials, crafted with honest materials and made to be part of your story for years to come.",
    heroImage:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=85",
    heroBackground: "#f5f4ef",
    primaryLabel: "Explore the collection",
    primaryLink: "/products",
    secondaryLabel: "Our story",
    secondaryLink: "/about",
    banner: "Good things, made to last. Free shipping on orders over $100.",
    sections: [
      {
        id: "featured",
        title: "Considered pieces, made to stay",
        body: "Thoughtful design. Honest materials. Everyday essentials that feel right at home.",
        image: "",
        enabled: true,
        order: 0,
      },
      {
        id: "story",
        title: "A little more intention, every day",
        body: "We believe the best things are made slowly, used often, and loved for a long time.",
        image:
          "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
        enabled: true,
        order: 1,
      },
    ],
  },
  about: {
    heading: "A thoughtful way of living",
    introduction:
      "Atelier & Co. began with a simple idea: the objects we live with should be as considered as the lives we want to lead.",
    history:
      "Founded in 2018, we started as a small studio sharing a few useful, beautifully made pieces with our community. Today, we work with independent makers who share our belief in lasting quality and considered design.",
    mission:
      "To make useful, beautiful things that bring a little more meaning to everyday life.",
    vision:
      "A world where thoughtful design, responsible making, and everyday rituals belong together.",
    values: "Considered design\nHonest materials\nMade to last\nPeople over pace",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85",
    sections: [
      {
        id: "people",
        title: "Good work, made together",
        body: "We partner with small, independent workshops that care deeply about how things are made.",
        image: "",
        enabled: true,
        order: 0,
      },
    ],
    team: [
      {
        id: "mara-ellis",
        name: "Mara Ellis",
        role: "Founder & creative director",
        bio: "The details person. Believes a home is made in the everyday.",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
        enabled: true,
      },
      {
        id: "lena-ortiz",
        name: "Lena Ortiz",
        role: "Maker partnerships",
        bio: "Gets to know the people behind every good thing we make.",
        image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80",
        enabled: true,
      },
      {
        id: "james-park",
        name: "James Park",
        role: "Studio & fulfillment",
        bio: "Makes sure each piece finds its way home, with care.",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
        enabled: true,
      },
    ],
  },
  contact: {
    heading: "We'd love to hear from you",
    introduction:
      "Questions about an order, a product, or just want to say hello? Our small team is happy to help.",
    email: "hello@atelierandco.example",
    phone: "+1 (555) 014-2280",
    address: "42 Orchard Street\nPortland, OR 97205",
    hours: "Monday – Friday, 9am – 5pm",
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    successMessage: "Thanks for reaching out. We'll be in touch soon.",
    formLabels: {
      name: "Your name",
      email: "Email address",
      subject: "What can we help with?",
      message: "Your message",
      submit: "Send your note",
    },
  },
};

export const themes: Record<string, Theme> = {
  Light: lightTheme,
  "Modern Blue": {
    ...lightTheme,
    primary: "#315b87",
    secondary: "#dce8f2",
    accent: "#d17b58",
    link: "#315b87",
    button: "#315b87",
    buttonHover: "#25486d",
  },
  "Nature Green": {
    ...lightTheme,
    primary: "#48654b",
    secondary: "#e0e8d8",
    accent: "#bd7650",
    link: "#48654b",
    button: "#48654b",
    buttonHover: "#354b38",
  },
  "Minimal Neutral": {
    ...lightTheme,
    primary: "#343434",
    secondary: "#e9e7e2",
    accent: "#ab795b",
    page: "#f7f6f3",
    link: "#343434",
    button: "#343434",
    buttonHover: "#191919",
  },
  Dark: {
    ...lightTheme,
    primary: "#a4c6b1",
    secondary: "#34443a",
    accent: "#ef9b79",
    page: "#171c19",
    surface: "#222925",
    heading: "#f1f3ef",
    body: "#d1d8d2",
    muted: "#a5b0a8",
    link: "#b7d8c3",
    linkHover: "#d2ead9",
    button: "#a4c6b1",
    buttonText: "#142018",
    buttonHover: "#c1ddc9",
    border: "#354139",
    header: "#171c19",
    navigation: "#d1d8d2",
    footer: "#111512",
    footerText: "#d1d8d2",
  },
  "Warm Terracotta": {
    ...lightTheme,
    primary: "#864531",
    secondary: "#f1dfd8",
    accent: "#b86849",
    link: "#864531",
    linkHover: "#663221",
    button: "#864531",
    buttonHover: "#663221",
  },
  "Coastal Blue": {
    ...lightTheme,
    primary: "#245b78",
    secondary: "#dcebf1",
    accent: "#c8794c",
    link: "#245b78",
    linkHover: "#18435b",
    button: "#245b78",
    buttonHover: "#18435b",
  },
  "Soft Rose": {
    ...lightTheme,
    primary: "#843c54",
    secondary: "#f1dfe5",
    accent: "#b56c57",
    link: "#843c54",
    linkHover: "#64283d",
    button: "#843c54",
    buttonHover: "#64283d",
  },
  "Lavender Mist": {
    ...lightTheme,
    primary: "#594779",
    secondary: "#e8e2f2",
    accent: "#aa756a",
    link: "#594779",
    linkHover: "#40325b",
    button: "#594779",
    buttonHover: "#40325b",
  },
  "Golden Hour": {
    ...lightTheme,
    primary: "#73500b",
    secondary: "#f3e7c8",
    accent: "#bd7137",
    link: "#73500b",
    linkHover: "#553b08",
    button: "#73500b",
    buttonHover: "#553b08",
  },
};
