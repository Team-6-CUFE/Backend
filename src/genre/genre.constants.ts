export const DEFAULT_GENRES = [
  { name: 'Electronic', description: 'Electronic music including house, techno, and EDM' },
  { name: 'Hip Hop', description: 'Hip hop and rap music' },
  { name: 'Rock', description: 'Rock and alternative rock' },
  { name: 'Pop', description: 'Popular music' },
  { name: 'Jazz', description: 'Jazz and blues' },
  { name: 'Classical', description: 'Classical and orchestral music' },
  { name: 'R&B', description: 'Rhythm and blues' },
  { name: 'Country', description: 'Country and folk music' },
  { name: 'Reggae', description: 'Reggae and dancehall' },
  { name: 'Metal', description: 'Heavy metal and hard rock' },
  { name: 'Indie', description: 'Independent and alternative music' },
  { name: 'Soul', description: 'Soul and funk' },
  { name: 'Techno', description: 'Techno and minimal techno' },
  { name: 'House', description: 'House music' },
  { name: 'Dubstep', description: 'Dubstep and bass music' },
  { name: 'Trap', description: 'Trap music' },
  { name: 'Ambient', description: 'Ambient and experimental' },
  { name: 'Disco', description: 'Disco and funk' },
  { name: 'Punk', description: 'Punk rock' },
  { name: 'Lo-fi', description: 'Lo-fi hip hop and chill beats' },
] as const;

export const DEFAULT_GENRE_NAMES = DEFAULT_GENRES.map((g) => g.name);
