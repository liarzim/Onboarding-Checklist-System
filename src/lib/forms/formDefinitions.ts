export interface FormFieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

export interface FormMetadata {
  docTypeId: string;
  title: string;
  subtitle: string;
  category: "security" | "legal" | "access" | "personal";
  lawReference?: string;
  version: string;
  isCustomizable: boolean;
  fields?: FormFieldDef[];
}

export const FORM_METADATA_LIST: Record<string, FormMetadata> = {
  doc_1: {
    docTypeId: "doc_1",
    title: "שאלון אישי רמה 5",
    subtitle: "שאלון קביעת התאמה ביטחונית לתפקידים מסווגים (רמה 5)",
    category: "personal",
    lawReference: "חוק שירות הביטחון הכללי, התשס\"ב-2002 והנחיות מלמ\"ב",
    version: "2.1",
    isCustomizable: true,
  },
  doc_2: {
    docTypeId: "doc_2",
    title: "עלון מידע לנבדק",
    subtitle: "דף הסבר על הליך הבדיקה הביטחונית, זכויותיך וחובות הגורם המוסמך",
    category: "security",
    lawReference: "חוק שירות הביטחון הכללי, התשס\"ב-2002",
    version: "1.8",
    isCustomizable: true,
  },
  doc_3: {
    docTypeId: "doc_3",
    title: "הצהרה על קבלת כרטיס חכם",
    subtitle: "התחייבות לשמירה ושימוש נאות בכרטיס הגישה החכם",
    category: "access",
    lawReference: "נהלי אבטחה פיזית ומערכות גישה ארגוניות",
    version: "2.0",
    isCustomizable: true,
  },
  doc_4: {
    docTypeId: "doc_4",
    title: "הסכמה למסירת מידע פלילי",
    subtitle: "מתן ייפוי כוח למשטרת ישראל למסירת מידע מן המרשם הפלילי",
    category: "legal",
    lawReference: "חוק המידע הפלילי ותקנת השבים, התשע\"ט-2019",
    version: "3.0",
    isCustomizable: true,
  },
  doc_5: {
    docTypeId: "doc_5",
    title: "התחייבות לשמירת סודיות",
    subtitle: "הסכם סודיות (NDA) והגנה על מידע ביטחוני וטכנולוגי",
    category: "security",
    lawReference: "חוק העונשין, התשל\"ז-1977 (עבירות ביטחון וסודות רשמיים)",
    version: "2.4",
    isCustomizable: true,
  },
  doc_6: {
    docTypeId: "doc_6",
    title: "התחייבות לשמירת פרטיות",
    subtitle: "הצהרת עמידה בהוראות חוק הגנת הפרטיות, התשמ\"א-1981",
    category: "legal",
    lawReference: "חוק הגנת הפרטיות, התשמ\"א-1981 ותקנות אבטחת מידע, התשע\"ז-2017",
    version: "2.2",
    isCustomizable: true,
  },
  doc_7: {
    docTypeId: "doc_7",
    title: "הימנעות מעבירות מחשב",
    subtitle: "התחייבות על פי הוראות חוק המחשבים, התשנ\"ה-1995",
    category: "security",
    lawReference: "חוק המחשבים, התשנ\"ה-1995",
    version: "2.0",
    isCustomizable: true,
  },
  doc_8: {
    docTypeId: "doc_8",
    title: "הסכמה לניטור סייבר",
    subtitle: "הסכמה לפעולות ניטור ואבטחת מידע ברשתות ובעמדות קצה",
    category: "security",
    lawReference: "הנחיות מערך הסייבר הלאומי ופסיקת בתי הדין לעבודה",
    version: "1.9",
    isCustomizable: true,
  },
  doc_9: {
    docTypeId: "doc_9",
    title: "בקשה להנפקת כרטיס חכם",
    subtitle: "טופס בקשת גישה פיזית ומערכתית להנפקת תג/כרטיס חכם",
    category: "access",
    lawReference: "נוהל הנפקת תגים ובקרת כניסה לאתרים מוגנים",
    version: "2.3",
    isCustomizable: true,
  },
  doc_10: {
    docTypeId: "doc_10",
    title: "צילום תעודת זהות וספח",
    subtitle: "צילום ברור של תעודת הזהות (ניתן לצרף מספר קבצים/תמונות - קדמי, אחורי וספח)",
    category: "personal",
    lawReference: "חוק מרשם האוכלוסין, התשכ\"ה-1965",
    version: "1.0",
    isCustomizable: false,
  },
  doc_11: {
    docTypeId: "doc_11",
    title: "תמונת פספורט רשמית",
    subtitle: "תמונת פנים עדכנית על רקע בהיר (בסיומת תמונה מורשית בלבד)",
    category: "access",
    lawReference: "הנחיות בקרת כניסה והנפקת כרטיסים חכמים",
    version: "1.0",
    isCustomizable: false,
  },
};
