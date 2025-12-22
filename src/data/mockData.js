export const europeanCountries = [
  "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina",
  "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Denmark", "Estonia",
  "Finland", "France", "Germany", "Greece", "Hungary", "Iceland",
  "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania",
  "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands",
  "North Macedonia", "Norway", "Poland", "Portugal", "Romania", "Russia",
  "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden",
  "Switzerland", "Ukraine", "United Kingdom", "Vatican City"
];

export const americanCountries = [
  "United States", "Canada", "Mexico", "Brazil", "Argentina", "Chile",
  "Colombia", "Peru", "Venezuela", "Ecuador", "Bolivia", "Paraguay",
  "Uruguay", "Guyana", "Suriname", "Costa Rica", "Panama", "Cuba",
  "Dominican Republic", "Puerto Rico", "Jamaica", "Trinidad and Tobago",
  "Bahamas", "Barbados", "Belize", "El Salvador", "Guatemala", "Haiti",
  "Honduras", "Nicaragua", "Australia"
];

// Additional countries using USD
export const usdCountries = [
  "Ecuador", "El Salvador", "Panama", "Marshall Islands", "Micronesia", 
  "Palau", "Timor-Leste", "Zimbabwe"
];

// Additional major global markets
export const asianCountries = [
  "Japan", "China", "South Korea", "Singapore", "Hong Kong",
  "Taiwan", "Malaysia", "Thailand", "Indonesia", "Philippines", "Vietnam",
  "Bangladesh", "Pakistan", "Sri Lanka", "Myanmar", "Cambodia", "Laos"
];

export const middleEastCountries = [
  "United Arab Emirates", "Saudi Arabia", "Israel", "Turkey", "Qatar",
  "Kuwait", "Bahrain", "Oman", "Jordan", "Lebanon", "Egypt", "Iran", "Iraq"
];

export const africanCountries = [
  "South Africa", "Nigeria", "Kenya", "Ghana", "Morocco", "Tunisia",
  "Algeria", "Ethiopia", "Tanzania", "Uganda", "Zimbabwe", "Zambia"
];

export const oceaniaCountries = [
  "New Zealand", "Fiji", "Papua New Guinea", "Samoa", "Tonga", "Vanuatu"
];

// Combined list of all countries
export const allCountries = [
  ...europeanCountries,
  ...americanCountries,
  ...asianCountries,
  ...middleEastCountries,
  ...africanCountries,
  ...oceaniaCountries
].filter((country, index, self) => self.indexOf(country) === index); // Remove duplicates

export const freeThemes = [
  "Dawn", "Refresh", "Sense", "Craft", "Studio", "Taste", "Origin"
];

export const paidThemes = [
  "Impulse", "Motion", "Prestige", "Empire", "Expanse", "Warehouse",
  "Enterprise", "Symmetry", "Modular", "Palo Alto", "Loft", "Blockshop",
  "Flow", "Avenue", "Broadcast", "Pipeline", "Envy", "Streamline",
  "Fashionopolism", "District", "Venue", "Editorial", "Focal", "Chronicle", "Galleria"
];

export const allThemes = [...freeThemes, ...paidThemes];

export const availableTags = [
  "Dropshipping",
  "Print on Demand",
  "Currently Running Ads"
];

export const mockStores = [
  { id: "1", name: "TechGadgets Pro", url: "https://techgadgetspro.myshopify.com", country: "United States", theme: "Dawn", dateAdded: "2024-12-01", productCount: 45, logo: null },
  { id: "2", name: "Fashion Forward", url: "https://fashionforward.myshopify.com", country: "United Kingdom", theme: "Impulse", dateAdded: "2024-12-02", productCount: 128, logo: null },
  { id: "3", name: "Home Essentials", url: "https://homeessentials.myshopify.com", country: "Germany", theme: "Prestige", dateAdded: "2024-12-03", productCount: 67, logo: null },
  { id: "4", name: "Pet Paradise", url: "https://petparadise.myshopify.com", country: "Canada", theme: "Refresh", dateAdded: "2024-12-04", productCount: 92, logo: null },
  { id: "5", name: "Beauty Bliss", url: "https://beautybliss.myshopify.com", country: "France", theme: "Sense", dateAdded: "2024-12-05", productCount: 156, logo: null },
  { id: "6", name: "Sports Zone", url: "https://sportszone.myshopify.com", country: "Spain", theme: "Motion", dateAdded: "2024-12-06", productCount: 78, logo: null },
  { id: "7", name: "Eco Living", url: "https://ecoliving.myshopify.com", country: "Netherlands", theme: "Craft", dateAdded: "2024-12-07", productCount: 54, logo: null },
  { id: "8", name: "Kids Corner", url: "https://kidscorner.myshopify.com", country: "Australia", theme: "Studio", dateAdded: "2024-12-08", productCount: 103, logo: null },
  { id: "9", name: "Luxury Watches", url: "https://luxurywatches.myshopify.com", country: "Switzerland", theme: "Empire", dateAdded: "2024-12-09", productCount: 34, logo: null },
  { id: "10", name: "Outdoor Adventures", url: "https://outdooradventures.myshopify.com", country: "Norway", theme: "Expanse", dateAdded: "2024-12-10", productCount: 89, logo: null },
  { id: "11", name: "Vintage Finds", url: "https://vintagefinds.myshopify.com", country: "Italy", theme: "Chronicle", dateAdded: "2024-11-28", productCount: 112, logo: null },
  { id: "12", name: "Coffee Culture", url: "https://coffeeculture.myshopify.com", country: "Brazil", theme: "Origin", dateAdded: "2024-11-29", productCount: 23, logo: null },
  { id: "13", name: "Art Studio", url: "https://artstudio.myshopify.com", country: "Sweden", theme: "Galleria", dateAdded: "2024-11-30", productCount: 67, logo: null },
  { id: "14", name: "Gaming Hub", url: "https://gaminghub.myshopify.com", country: "Japan", theme: "Warehouse", dateAdded: "2024-11-25", productCount: 145, logo: null },
  { id: "15", name: "Fitness First", url: "https://fitnessfirst.myshopify.com", country: "United States", theme: "Flow", dateAdded: "2024-11-26", productCount: 98, logo: null },
  { id: "16", name: "Garden Glory", url: "https://gardenglory.myshopify.com", country: "United Kingdom", theme: "Taste", dateAdded: "2024-11-27", productCount: 76, logo: null },
  { id: "17", name: "Book Haven", url: "https://bookhaven.myshopify.com", country: "Ireland", theme: "Editorial", dateAdded: "2024-11-20", productCount: 234, logo: null },
  { id: "18", name: "Music Mania", url: "https://musicmania.myshopify.com", country: "Germany", theme: "Avenue", dateAdded: "2024-11-21", productCount: 56, logo: null },
  { id: "19", name: "Jewelry Box", url: "https://jewelrybox.myshopify.com", country: "Belgium", theme: "Focal", dateAdded: "2024-11-22", productCount: 87, logo: null },
  { id: "20", name: "Auto Parts Plus", url: "https://autopartsplus.myshopify.com", country: "Poland", theme: "Enterprise", dateAdded: "2024-11-23", productCount: 201, logo: null },
];

export const generateMoreStores = (count) => {
  const stores = [...mockStores];
  
  // Add tags to existing stores
  const storesWithTags = stores.map(store => ({
    ...store,
    tags: generateRandomTags()
  }));
  
  for (let i = 21; i <= count; i++) {
    storesWithTags.push({
      id: String(i),
      name: `Store ${i}`,
      url: `https://store${i}.myshopify.com`,
      country: allCountries[Math.floor(Math.random() * allCountries.length)],
      theme: allThemes[Math.floor(Math.random() * allThemes.length)],
      dateAdded: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      productCount: Math.floor(Math.random() * 300) + 10,
      logo: null,
      tags: generateRandomTags()
    });
  }
  return storesWithTags;
};

const generateRandomTags = () => {
  const tags = [];
  // 40% chance for Dropshipping
  if (Math.random() < 0.4) tags.push("Dropshipping");
  // 35% chance for Print on Demand
  if (Math.random() < 0.35) tags.push("Print on Demand");
  // 30% chance for Ads
  if (Math.random() < 0.3) tags.push("Currently Running Ads");
  return tags;
};

