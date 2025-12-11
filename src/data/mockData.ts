export interface Store {
  id: string;
  name: string;
  url: string;
  country: string;
  theme: string;
  dateAdded: string;
}

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
  "Honduras", "Nicaragua"
];

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
export const allCountries = [...europeanCountries, ...americanCountries];

export const mockStores: Store[] = [
  { id: "1", name: "TechGadgets Pro", url: "https://techgadgetspro.myshopify.com", country: "United States", theme: "Dawn", dateAdded: "2024-12-01" },
  { id: "2", name: "Fashion Forward", url: "https://fashionforward.myshopify.com", country: "United Kingdom", theme: "Impulse", dateAdded: "2024-12-02" },
  { id: "3", name: "Home Essentials", url: "https://homeessentials.myshopify.com", country: "Germany", theme: "Prestige", dateAdded: "2024-12-03" },
  { id: "4", name: "Pet Paradise", url: "https://petparadise.myshopify.com", country: "Canada", theme: "Refresh", dateAdded: "2024-12-04" },
  { id: "5", name: "Beauty Bliss", url: "https://beautybliss.myshopify.com", country: "France", theme: "Sense", dateAdded: "2024-12-05" },
  { id: "6", name: "Sports Zone", url: "https://sportszone.myshopify.com", country: "Spain", theme: "Motion", dateAdded: "2024-12-06" },
  { id: "7", name: "Eco Living", url: "https://ecoliving.myshopify.com", country: "Netherlands", theme: "Craft", dateAdded: "2024-12-07" },
  { id: "8", name: "Kids Corner", url: "https://kidscorner.myshopify.com", country: "Australia", theme: "Studio", dateAdded: "2024-12-08" },
  { id: "9", name: "Luxury Watches", url: "https://luxurywatches.myshopify.com", country: "Switzerland", theme: "Empire", dateAdded: "2024-12-09" },
  { id: "10", name: "Outdoor Adventures", url: "https://outdooradventures.myshopify.com", country: "Norway", theme: "Expanse", dateAdded: "2024-12-10" },
  { id: "11", name: "Vintage Finds", url: "https://vintagefinds.myshopify.com", country: "Italy", theme: "Chronicle", dateAdded: "2024-11-28" },
  { id: "12", name: "Coffee Culture", url: "https://coffeeculture.myshopify.com", country: "Brazil", theme: "Origin", dateAdded: "2024-11-29" },
  { id: "13", name: "Art Studio", url: "https://artstudio.myshopify.com", country: "Sweden", theme: "Galleria", dateAdded: "2024-11-30" },
  { id: "14", name: "Gaming Hub", url: "https://gaminghub.myshopify.com", country: "Japan", theme: "Warehouse", dateAdded: "2024-11-25" },
  { id: "15", name: "Fitness First", url: "https://fitnessfirst.myshopify.com", country: "United States", theme: "Flow", dateAdded: "2024-11-26" },
  { id: "16", name: "Garden Glory", url: "https://gardenglory.myshopify.com", country: "United Kingdom", theme: "Taste", dateAdded: "2024-11-27" },
  { id: "17", name: "Book Haven", url: "https://bookhaven.myshopify.com", country: "Ireland", theme: "Editorial", dateAdded: "2024-11-20" },
  { id: "18", name: "Music Mania", url: "https://musicmania.myshopify.com", country: "Germany", theme: "Avenue", dateAdded: "2024-11-21" },
  { id: "19", name: "Jewelry Box", url: "https://jewelrybox.myshopify.com", country: "Belgium", theme: "Focal", dateAdded: "2024-11-22" },
  { id: "20", name: "Auto Parts Plus", url: "https://autopartsplus.myshopify.com", country: "Poland", theme: "Enterprise", dateAdded: "2024-11-23" },
];

export const generateMoreStores = (count: number): Store[] => {
  const stores: Store[] = [...mockStores];
  for (let i = 21; i <= count; i++) {
    stores.push({
      id: String(i),
      name: `Store ${i}`,
      url: `https://store${i}.myshopify.com`,
      country: allCountries[Math.floor(Math.random() * allCountries.length)],
      theme: allThemes[Math.floor(Math.random() * allThemes.length)],
      dateAdded: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`
    });
  }
  return stores;
};
