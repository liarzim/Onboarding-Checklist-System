# מערכת ניהול ובקרת תהליכי קליטה (Onboarding Checklist & Smart Card Management System)

מערכת מלאה מקצה לקצה (End-to-End) לקליטת עובדים, בקרת מסמכים, ניהול שלבי סינון וביטחון, והנפקת כרטיסים חכמים עבור ארגונים, ספקי מיקור חוץ ומחלקות משאבי אנוש וביטחון.

---

## 🚀 ארכיטקטורה וטכנולוגיות

- **Framework**: Next.js 14+ (App Router, TypeScript, React Server Components & Server Actions)
- **Styling**: Tailwind CSS עם תמיכה מלאה ב-RTL (`dir="rtl"`, שפה עברית), רכיבים בעיצוב Modern Enterprise / shadcn
- **Backend & Database**: Google Sheets API v4 (שימוש כ-Database רלציוני)
- **Object Storage**: Google Drive API v3 (אחסון קבצים, תיקיות מועמדים ייעודיות, והרשאות)
- **Authentication & RBAC**:
  - `jose` (Signed JWTs ב-HttpOnly Secure Cookies)
  - תפקידי ספקים (Vendor): התחברות בקוד קסם / אימות אימייל מול לשונית `Vendors`
  - תפקידי ניהול (HR, Admin): לוח בקרה, אימות מסמכים, מעבר שלבים, אישור כרטיס חכם
  - הרשאות מנהל מערכת (Admin בלבד): הגדרות מערכת (`/admin/settings`) ויומן פעולות (`/admin/audit-log`)
- **Security & OWASP Top 10 Hardened**:
  - אימות Magic Bytes אמיתי של קבצים (PDF, PNG, JPG בלבד) למניעת הרצת קוד זדוני
  - ניקוי והגנה מפני הזרקת נוסחאות (Spreadsheet Formula Injection Sanitization)
  - הגבלת קצב בקשות (Rate Limiting) בזיכרון בטוח
  - כותרות אבטחה קשיחות ב-`next.config.mjs` (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)

---

## 📋 מבנה הגיליונות ב-Google Spreadsheet

המערכת פועלת מול Google Spreadsheet יחיד המכיל את הטאבים הבאים:

1. **Candidates**:
   `candidate_id | full_name | id_number | email | phone | vendor_id | project_id | drive_folder_id | current_stage_id | is_completed | created_at | updated_at`
2. **ChecklistItems**:
   `item_id | candidate_id | doc_type_id | drive_file_id | status | verified_by | verified_at | rejection_reason | updated_at`
3. **DocumentTypes**:
   `doc_type_id | doc_name | is_required | template_drive_url | order_index`
4. **SettingStages**:
   `stage_id | stage_name | stage_order | is_terminal`
5. **Vendors**:
   `vendor_id | company_name | contact_name | contact_email | is_active`
6. **Projects**:
   `project_name`
7. **AuditLogs**:
   `timestamp | action | candidate_id | actor_email | details`

---

## 🔑 הגדרת Google Cloud Service Account

כדי שהמערכת תוכל לתקשר עם Google Drive ו-Google Sheets:

1. היכנס ל-[Google Cloud Console](https://console.cloud.google.com/).
2. צור פרויקט חדש או בחר פרויקט קיים.
3. הפעל את ה-APIs הבאים:
   - **Google Sheets API**
   - **Google Drive API**
4. עבור אל **IAM & Admin** -> **Service Accounts** ולחץ **Create Service Account**:
   - תן שם (לדוגמה: `onboarding-checklist-sa`).
   - סיים את היצירה.
5. צור מפתח (Key):
   - לחץ על ה-Service Account שיצרת, עבור ללשונית **Keys**.
   - לחץ **Add Key** -> **Create new key** ובחר סוג **JSON**.
   - קובץ ה-JSON יירד למחשב שלך.
6. חלץ מתוך קובץ ה-JSON:
   - `client_email` -> זהו ה-`GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   - `private_key` -> זהו ה-`GOOGLE_PRIVATE_KEY`.

---

## 📂 שיתוף ה-Spreadsheet ותיקיית ה-Drive

חשוב מאוד להעניק ל-Service Account הרשאות עריכה כדי שהמערכת תפעל:

1. **Google Spreadsheet**:
   - פתח את הגיליון ב-Google Sheets.
   - לחץ על **שתף (Share)** בפינה העליונה.
   - הדבק את כתובת האימייל של ה-Service Account (הערך של `client_email`).
   - הגדר הרשאת **עורך (Editor)** והסר את הסימון מ-Notify people.
   - העתק את ה-Spreadsheet ID משורת הכתובת בדפדפן (`https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`).

2. **Google Drive Root Folder**:
   - פתח את Google Drive וצור תיקייה ראשית (לדוגמה: `Onboarding_System_Root`).
   - לחץ קליק ימני על התיקייה -> **שיתוף (Share)**.
   - הוסף את ה-Service Account כ-**עורך (Editor)**.
   - העתק את ה-Folder ID מסוף ה-URL בדפדפן (`https://drive.google.com/drive/folders/<ROOT_FOLDER_ID>`).

---

## ⚙️ הגדרת משתני סביבה (.env.local)

צור קובץ `.env.local` בתיקיית השורש של הפרויקט לפי התבנית הבאה:

```env
# Google Cloud Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL="onboarding-checklist-sa@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Google Resources
GOOGLE_SPREADSHEET_ID="your_google_spreadsheet_id_here"
GOOGLE_DRIVE_ROOT_FOLDER_ID="your_google_drive_folder_id_here"

# Security & Sessions
JWT_SECRET="your_secure_random_string_at_least_32_characters_long"
```

> **שים לב**: במידה וה-`GOOGLE_PRIVATE_KEY` מכיל ירידות שורה, שמור אותו בגרשיים כפולים כאשר ירידות השורה מיוצגות כ-`\n`.

---

## 💻 הרצה מקומית לפיתוח (Local Development)

התקנת תלויות:
```bash
npm install
```

בדיקת טיפוסים (TypeScript Check):
```bash
npx tsc --noEmit
```

הרצת שרת פיתוח:
```bash
npm run dev
```

פתח את הדפדפן בכתובת: `http://localhost:3000`

---

## ☁️ פריסה ל-Vercel (Deployment)

1. דחוף את הקוד ל-GitHub / GitLab / Bitbucket.
2. התחבר ל-[Vercel Dashboard](https://vercel.com/) ולחץ **Add New...** -> **Project**.
3. ייבא את ה-Repository של הפרויקט.
4. בהגדרות ה-Project:
   - **Framework Preset**: בחר `Next.js`.
   - **Environment Variables**: הזן את כל המשתנים מקובץ `.env.local`:
     - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
     - `GOOGLE_PRIVATE_KEY`
     - `GOOGLE_SPREADSHEET_ID`
     - `GOOGLE_DRIVE_ROOT_FOLDER_ID`
     - `JWT_SECRET`
5. לחץ **Deploy**. Vercel יבנה ויפרוס את האפליקציה ב-Edge & Serverless Node.js Runtime.

---

## 🔒 אבטחה והרשאות משתמשים

- **ספקים (Vendors)**:
  - כניסה דרך `/login` עם כתובת אימייל הרשומה בלשונית `Vendors`.
  - גישה אך ורק למועמדים השייכים לאותו ספק (`assertVendorOwnership`).
- **צוות משאבי אנוש (HR)**:
  - כניסה דרך `/admin/login`.
  - צפייה ואימות מסמכים לכל המועמדים מכל הספקים.
  - קידום שלבים וסיום תהליך קליטה.
- **מנהל מערכת (Admin)**:
  - הרשאות מלאות כמו HR.
  - גישה בלעדית להגדרות מערכת ב-`/admin/settings` (שלבים, מסמכים, ספקים ופרויקטים).
  - גישה בלעדית ליומן ביקורת ב-`/admin/audit-log` עם סינון מתקדם.
