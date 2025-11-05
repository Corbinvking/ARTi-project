// Hierarchical Genre System for Campaign Matching

export interface GenreHierarchy {
  primary: string;
  subGenres: string[];
}

// Main genre categories with their sub-genres
export const GENRE_HIERARCHY: GenreHierarchy[] = [
  {
    primary: "EDM",
    subGenres: ["House", "Tech House", "Techno", "Dubstep", "Trance", "DnB", "Progressive House", "Deep House", "Electro House"]
  },
  {
    primary: "Hip Hop",
    subGenres: ["Trap", "Drill", "Old School", "Conscious", "Mumble Rap", "UK Drill", "Latin Trap"]
  },
  {
    primary: "Pop",
    subGenres: ["Mainstream Pop", "Indie Pop", "Electropop", "K-Pop", "Teen Pop", "Dance Pop"]
  },
  {
    primary: "Rock",
    subGenres: ["Alternative", "Indie Rock", "Hard Rock", "Punk", "Metal", "Classic Rock"]
  },
  {
    primary: "Latin",
    subGenres: ["Reggaeton", "Bachata", "Salsa", "Regional Mexican", "Latin Pop", "Merengue"]
  },
  {
    primary: "R&B",
    subGenres: ["Contemporary R&B", "Neo Soul", "Alternative R&B", "Classic R&B"]
  },
  {
    primary: "Country",
    subGenres: ["Modern Country", "Country Pop", "Folk Country", "Americana"]
  },
  {
    primary: "Afro",
    subGenres: ["Afrobeats", "Amapiano", "Afro House", "Afro Pop", "Afro Drill"]
  },
  {
    primary: "Reggae",
    subGenres: ["Dancehall", "Reggae Fusion", "Roots Reggae", "Dub"]
  },
  {
    primary: "Alternative",
    subGenres: ["Indie", "Grunge", "Post-Rock", "Shoegaze", "Emo"]
  }
];

// All primary genres
export const PRIMARY_GENRES = GENRE_HIERARCHY.map(g => g.primary);

// All sub-genres flattened
export const ALL_SUB_GENRES = GENRE_HIERARCHY.flatMap(g => g.subGenres);

// All genres (primary + sub)
export const ALL_GENRES = [...PRIMARY_GENRES, ...ALL_SUB_GENRES].sort();

// Get sub-genres for a primary genre
export const getSubGenres = (primaryGenre: string): string[] => {
  const hierarchy = GENRE_HIERARCHY.find(g => g.primary === primaryGenre);
  return hierarchy ? hierarchy.subGenres : [];
};

// Get primary genre for a sub-genre
export const getPrimaryGenre = (subGenre: string): string | null => {
  const hierarchy = GENRE_HIERARCHY.find(g => g.subGenres.includes(subGenre));
  return hierarchy ? hierarchy.primary : null;
};

// Check if two genres are related (same primary or one is primary of the other)
export const areGenresRelated = (genre1: string, genre2: string): boolean => {
  if (genre1 === genre2) return true;
  
  const primary1 = getPrimaryGenre(genre1) || genre1;
  const primary2 = getPrimaryGenre(genre2) || genre2;
  
  return primary1 === primary2;
};

// Get genre compatibility score (0-100)
export const getGenreCompatibilityScore = (creatorGenres: string[], campaignPrimary: string, campaignSub?: string): number => {
  let maxScore = 0;
  
  for (const creatorGenre of creatorGenres) {
    let score = 0;
    
    // Perfect match with campaign sub-genre
    if (campaignSub && creatorGenre === campaignSub) {
      score = 100;
    }
    // Perfect match with campaign primary
    else if (creatorGenre === campaignPrimary) {
      score = 90;
    }
    // Creator has sub-genre of campaign primary
    else if (getSubGenres(campaignPrimary).includes(creatorGenre)) {
      score = 85;
    }
    // Creator primary matches campaign primary
    else if (getPrimaryGenre(creatorGenre) === campaignPrimary) {
      score = 80;
    }
    // Related genres (same primary family)
    else if (areGenresRelated(creatorGenre, campaignPrimary)) {
      score = 60;
    }
    
    maxScore = Math.max(maxScore, score);
  }
  
  return maxScore;
};

// Content type compatibility
export const CONTENT_TYPES = [
  "DJ Footage",
  "Festival Content", 
  "EDM Memes",
  "EDM Carousels",
  "Hip Hop Content",
  "Music Reviews",
  "Behind the Scenes",
  "Live Performance",
  "Studio Sessions",
  "Music Discovery",
  "EDM Influencer",
  "Workout Content",
  "Party Content",
  "Summer Content",
  "Ibiza",
  "Rave Content"
].sort();

// Post types
export const POST_TYPES = ["Reel", "Carousel", "Story"] as const;

// Territory preferences  
export const TERRITORY_PREFERENCES = [
  "US Primary",
  "UK Primary", 
  "EU Primary",
  "Spanish Speaking",
  "German Speaking",
  "Global Audience",
  "North America",
  "Europe",
  "Latin America",
  "Asia Pacific",
  "Middle East",
  "Africa"
].sort();

// Countries
export const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", 
  "Spain", "Italy", "Netherlands", "Belgium", "Sweden", "Norway", "Denmark",
  "Brazil", "Mexico", "Argentina", "Colombia", "Chile", "Peru", "Venezuela",
  "Japan", "South Korea", "India", "China", "Thailand", "Philippines", "Indonesia",
  "South Africa", "Nigeria", "Egypt", "Morocco", "Kenya", "Ghana",
  "Russia", "Poland", "Czech Republic", "Hungary", "Romania", "Turkey",
  "Israel", "UAE", "Saudi Arabia", "Lebanon", "Jordan"
].sort();