/**
 * Authoritative list of official Israeli cities, towns, and regional councils
 * based on the Israel Central Bureau of Statistics (למ"ס) and Ministry of Interior.
 */
export interface IsraeliCity {
  name: string;
  code: number;
}

export const ISRAELI_CITIES: IsraeliCity[] = [
  { name: "ירושלים", code: 3000 },
  { name: "תל אביב - יפו", code: 5000 },
  { name: "חיפה", code: 4000 },
  { name: "ראשון לציון", code: 8300 },
  { name: "פתח תקווה", code: 7900 },
  { name: "אשדוד", code: 70 },
  { name: "נתניה", code: 7400 },
  { name: "באר שבע", code: 9000 },
  { name: "בני ברק", code: 6100 },
  { name: "חולון", code: 6600 },
  { name: "רמת גן", code: 8600 },
  { name: "אשקלון", code: 7100 },
  { name: "רחובות", code: 8400 },
  { name: "בת ים", code: 6200 },
  { name: "בית שמש", code: 2610 },
  { name: "כפר סבא", code: 6900 },
  { name: "הרצליה", code: 6400 },
  { name: "חדרה", code: 6500 },
  { name: "מודיעין - מכבים - רעות", code: 1200 },
  { name: "נצרת", code: 7300 },
  { name: "לוד", code: 7000 },
  { name: "רמלה", code: 8500 },
  { name: "רעננה", code: 8700 },
  { name: "הוד השרון", code: 9700 },
  { name: "גבעתיים", code: 6300 },
  { name: "קריית אתא", code: 6800 },
  { name: "נהריה", code: 9100 },
  { name: "קריית גת", code: 2630 },
  { name: "עפולה", code: 7700 },
  { name: "אילת", code: 2600 },
  { name: "עכו", code: 7600 },
  { name: "טבריה", code: 6700 },
  { name: "קריית מוצקין", code: 8200 },
  { name: "קריית ים", code: 9600 },
  { name: "ראש העין", code: 2640 },
  { name: "קריית ביאליק", code: 9500 },
  { name: "רמת השרון", code: 2650 },
  { name: "דימונה", code: 2200 },
  { name: "נס ציונה", code: 7200 },
  { name: "אום אל-פחם", code: 2710 },
  { name: "טייבה", code: 2720 },
  { name: "אלעד", code: 1309 },
  { name: "שפרעם", code: 8800 },
  { name: "מעלה אדומים", code: 3616 },
  { name: "טמרה", code: 8900 },
  { name: "יבנה", code: 2660 },
  { name: "קריית אונו", code: 2620 },
  { name: "צפת", code: 8000 },
  { name: "סח'נין", code: 7500 },
  { name: "מגדל העמק", code: 874 },
  { name: "טירת כרמל", code: 2100 },
  { name: "ערד", code: 2560 },
  { name: "אופקים", code: 31 },
  { name: "נתיבות", code: 246 },
  { name: "קריית שמונה", code: 2800 },
  { name: "יהוד - מונסון", code: 9400 },
  { name: "כפר קאסם", code: 634 },
  { name: "באקה אל-גרבייה", code: 6000 },
  { name: "גבעת שמואל", code: 681 },
  { name: "טירה", code: 2730 },
  { name: "מעלות - תרשיחא", code: 1063 },
  { name: "שדרות", code: 1031 },
  { name: "חריש", code: 1324 },
  { name: "קלנסווה", code: 638 },
  { name: "מודיעין עילית", code: 3797 },
  { name: "ביתר עילית", code: 3780 },
  { name: "אריאל", code: 3570 },
  { name: "קריית מלאכי", code: 1034 },
  { name: "אור יהודה", code: 2400 },
  { name: "אור עקיבא", code: 1020 },
  { name: "נשר", code: 2500 },
  { name: "בית שאן", code: 9200 },
  { name: "גן יבנה", code: 166 },
  { name: "מזכרת בתיה", code: 28 },
  { name: "קדימה - צורן", code: 3640 },
  { name: "פרדס חנה - כרכור", code: 7800 },
  { name: "גדרה", code: 2550 },
  { name: "שוהם", code: 1311 },
  { name: "אבן יהודה", code: 182 },
  { name: "תל מונד", code: 153 },
  { name: "כוכב יאיר", code: 1224 },
  { name: "קריית טבעון", code: 2300 },
  { name: "בנימינה - גבעת עדה", code: 9800 },
  { name: "זכרון יעקב", code: 9300 },
  { name: "מבשרת ציון", code: 1015 },
  { name: "אזור", code: 58 },
  { name: "כפר יונה", code: 168 },
  { name: "מעלה עירון", code: 1327 },
  { name: "חצור הגלילית", code: 2034 },
  { name: "ראש פינה", code: 26 },
  { name: "ירוחם", code: 831 },
  { name: "מצפה רמון", code: 99 },
  { name: "גבעת זאב", code: 3763 },
  { name: "אפרת", code: 3650 },
  { name: "קרני שומרון", code: 3640 },
  { name: "גני תקווה", code: 229 },
  { name: "סביון", code: 593 },
  { name: "כפר שמריהו", code: 267 },
  { name: "עתלית", code: 14 },
  { name: "קיסריה", code: 1167 },
  { name: "עומר", code: 128 },
  { name: "מיתר", code: 1264 },
  { name: "להבים", code: 1272 },
  { name: "יקנעם עילית", code: 240 },
];

/**
 * Searches the Israeli cities list by prefix or substring.
 */
export function searchIsraeliCities(query: string, limit = 15): IsraeliCity[] {
  if (!query || typeof query !== "string") return ISRAELI_CITIES.slice(0, limit);
  const cleanQ = query.trim().replace(/["']/g, "");
  if (!cleanQ) return ISRAELI_CITIES.slice(0, limit);

  // Exact prefix match first
  const prefixMatches = ISRAELI_CITIES.filter((c) =>
    c.name.startsWith(cleanQ)
  );

  // Substring matches next
  const otherMatches = ISRAELI_CITIES.filter(
    (c) => !c.name.startsWith(cleanQ) && c.name.includes(cleanQ)
  );

  return [...prefixMatches, ...otherMatches].slice(0, limit);
}
