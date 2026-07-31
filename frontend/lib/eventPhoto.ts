// Curated, verified event-themed photos (concerts/festivals/talks) - deterministic
// per event id so the same event always gets the same cover photo.
const PHOTO_IDS = [
  "1470229722913-7c0e2dbbafd3", // concert stage lights
  "1492684223066-81342ee5ff30", // confetti concert
  "1533174072545-7a4b6ad7a6c3", // festival crowd
  "1591115765373-5207764f72e7", // conference talk
];

function hashToIndex(id: string, mod: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

export function getEventPhotoUrl(eventId: string, width: number, height: number) {
  const photoId = PHOTO_IDS[hashToIndex(eventId, PHOTO_IDS.length)];
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=75`;
}
