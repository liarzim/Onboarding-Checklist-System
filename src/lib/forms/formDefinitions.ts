export interface FormMetadata {
  docTypeId: string;
  title: string;
  subtitle: string;
  category: "security" | "legal" | "access" | "personal";
}

export const FORM_METADATA_LIST: Record<string, FormMetadata> = {
  doc_1: {
    docTypeId: "doc_1",
    title: "שאלון אישי רמה 5",
    subtitle: "שאלון קביעת התאמה ביטחונית לתפקידים מסווגים (רמה 5)",
    category: "personal",
  },
  doc_2: {
    docTypeId: "doc_2",
    title: "עלון מידע לנבדק",
    subtitle: "דף הסבר על הליך הבדיקה הביטחונית, זכויותיך וחובות הגורם המוסמך",
    category: "security",
  },
  doc_3: {
    docTypeId: "doc_3",
    title: "הצהרה על קבלת כרטיס חכם",
    subtitle: "התחייבות לשמירה ושימוש נאות בכרטיס הגישה החכם",
    category: "access",
  },
  doc_4: {
    docTypeId: "doc_4",
    title: "הסכמה למסירת מידע פלילי",
    subtitle: "מתן ייפוי כוח למשטרת ישראל למסירת מידע מן המרשם הפלילי",
    category: "legal",
  },
  doc_5: {
    docTypeId: "doc_5",
    title: "התחייבות לשמירת סודיות",
    subtitle: "הסכם סודיות (NDA) והגנה על מידע ביטחוני וטכנולוגי",
    category: "security",
  },
  doc_6: {
    docTypeId: "doc_6",
    title: "התחייבות לשמירת פרטיות",
    subtitle: "הצהרת עמידה בהוראות חוק הגנת הפרטיות, התשמ\"א-1981",
    category: "legal",
  },
  doc_7: {
    docTypeId: "doc_7",
    title: "הימנעות מעבירות מחשב",
    subtitle: "התחייבות על פי הוראות חוק המחשבים, התשנ\"ה-1995",
    category: "security",
  },
  doc_8: {
    docTypeId: "doc_8",
    title: "הסכמה לניטור סייבר",
    subtitle: "הסכמה לפעולות ניטור ואבטחת מידע ברשתות ובעמדות קצה",
    category: "security",
  },
  doc_9: {
    docTypeId: "doc_9",
    title: "בקשה להנפקת כרטיס חכם",
    subtitle: "טופס בקשת גישה פיזית ומערכתית להנפקת תג/כרטיס חכם",
    category: "access",
  },
};
