# מבוכי הוגוורטס — משחק הארי פוטר

> Doron's first game — Harry Potter Mazes

משחק ווב לנייד: עברה פרוצדורלית במבוכים עם 100 חידות עלילתיות, חלקי קסם, ולוח תוצאות בסגנון מפת הקונדסאים.

🎮 **[משחקי עכשיו](http://localhost:8123)** (locally)

## מאפיינים

- ✅ **5 מבוכים בקושי עולה** — 9×9 עד 19×19, כל אחד ייחודי (יצירה פרוצדורלית)
- ✅ **100 חידות בעברית** — מדורגות לפי רמה, עלילתיות (דורשות היכרות עם הסיפור)
- ✅ **5 שערים לכל מבוך** — מוגנים בחידות, 4 על המסלול + שער יציאה
- ✅ **3 חיים לכל חידה** — תשובה שגויה מסירה אפשרות ומורידה לב
- ✅ **חלקי קסם** — מהמבוך השני, דילוג חד-פעמי על שאלה
- ✅ **לוח תוצאות** — מפת הקונדסאים עם תאריכים ודרוג 🥇🥈🥉
- ✅ **בחירת דמות** — קוסם או מכשפה
- ✅ **iPhone SE responsive** — עיצוב RTL לנייד
- ✅ **ללא תלויות** — Vanilla JS + HTML5 Canvas

## בדרישות

- Node.js 14+ (להרצה מקומית)
- Git
- Railway CLI (להצבה ב-Railway)

## הרצה מקומית

```bash
node server.js
# או
python3 -m http.server 8000
```

פתח `http://localhost:8123` בדפדפן (או PORT שציינת).

---

## הצבה ב-Railway

### 1. הגדר Railway
```bash
# התקן Railway CLI
npm install -g @railway/cli

# התחבר
railway login

# אתחול הפרויקט
railway init
```

### 2. בחר ריפו זה
בעת ה-`railway init`:
- בחר "Connect to an existing repository"
- בחר `OrrSegevPersonal/doron-game-potter-mazes`

### 3. צור Dockerfile (אם עדיין אין)
Railway יגנה Dockerfile אוטומטית, או צור בעצמך:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server.js .
EXPOSE 3000
CMD ["node", "server.js"]
```

### 4. הגדר PORT במשתנה סביבה (Railway)
Railway יהקצה PORT דינמי. עדכן `server.js`:

```javascript
const PORT = process.env.PORT || 8123;
```

(כבר מוכן בקובץ!)

### 5. דחוף ו-deploy
```bash
git push origin main
```

Railway מקשיב ל-push ויתחיל build/deploy אוטומטית.

### 6. קבל URL
לאחר סיום deploy (~2 דקות), Railway יתן לך URL כמו:
```
https://your-project-xyz.railway.app
```

---

## משתנים סביבה

אין משתנים סביבה חובה. הכל עובד מ-localStorage בדפדפן.

---

## ארכיטקטורה

```
index.html               — נקודת כניסה
├── css/style.css       — RTL, iPhone SE responsive
└── js/
    ├── config.js       — קבועים (גדלי מבוך, כמויות חיים וכו׳)
    ├── rng.js          — מחולל אקראי (Mulberry32)
    ├── riddles.js      — 100 חידות מדורגות
    ├── maze.js         — יצירה פרוצדורלית (Recursive Backtracker) + BFS
    ├── gates.js        — מיקום 5 שערים
    ├── player.js       — מיקום + תנועה
    ├── magic.js        — הופעת חלקי קסם
    ├── storage.js      — localStorage (לוח תוצאות + שיא)
    ├── input.js        — swipe + כפתורי חצים
    ├── ui.js           — overlays, חידות, לוח
    └── game.js         — מכונת מצבים + rendering

server.js               — שרת סטטי קטן (Node.js)
```

---

## הגדלי המבוך

| רמה | גודל | תא (px) |
|------|------|---------|
| 1    | 9×9  | ~42     |
| 2    | 11×11| ~34     |
| 3    | 13×13| ~28     |
| 4    | 15×15| ~24     |
| 5    | 19×19| ~16     |

---

## חידות

100 חידות מחולקות:
- **רמה 1**: 20 חידות (בסיסיות — "מי המנהל?")
- **רמה 2**: 20 חידות (ממוצעות — פרטים מהסיפור)
- **רמה 3**: 20 חידות (קשות — עלילה עמוקה)
- **רמה 4**: 20 חידות (קשה מאוד — פרטים ספציפיים)
- **רמה 5**: 20 חידות (קשה ביותר — נתונים נדירים)

כל חידה:
- שאלה בעברית
- תשובה נכונה אחת
- 3 תשובות מבלבלות (קרובות, לא חושפות)
- מיקום תשובה אקראי (אין 3 ברצף בין שערים)

---

## בדיקה

```bash
# בדוק אם יש טעויות הסטטי
npm test  # (אם יש)

# או פשוט פתח בדפדפן ובדוק ידנית
```

---

## לייק ❤️

ממחק על ידי דורון שגב, 2026.

מוטיוויים: הארי פוטר (J.K. Rowling) | תכנולוגיה: Claude AI
