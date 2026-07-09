# הוראות הצבה — Railway

## דרישות מקדימות

- GitHub account
- Railway account (הרשמה בחינם ב-[railway.app](https://railway.app))
- Railway CLI (אופציונלי — אפשר גם דרך ממשק Railway)

---

## דרך 1: Railway UI (הקלה)

### שלב 1: לך ל-Railway
1. בקר ב-[railway.app](https://railway.app) והתחבר עם GitHub
2. לחץ על **"New Project"** → **"Deploy from GitHub repo"**

### שלב 2: בחר ריפו
3. בחר `OrrSegevPersonal/doron-game-potter-mazes`

### שלב 3: Railway יגנה אוטומטית
4. Railway יקרא את `Dockerfile` ו-`railway.toml`
5. Build יתחיל אוטומטית
6. לחכות ~2-3 דקות

### שלב 4: קבל URL
7. כשהדיפלוי בוצע, הצג **Domains** בטאב **Settings**
8. ה-URL יוצג שם: `https://your-project-xxxx.railway.app`

---

## דרך 2: Railway CLI

### התקנה
```bash
npm install -g @railway/cli
railway login  # יפתח דפדפן ויבקש GitHub
```

### Initialization
```bash
cd /path/to/doron-game-mazes
railway init
```

בחר:
- **What do you want to do?** → "Connect to an existing repository"
- **Select a repository** → `OrrSegevPersonal/doron-game-potter-mazes`

### הצבה
```bash
git push origin main
```

Railway יגנה אוטומטית (connected to GitHub).

או:
```bash
railway up
```

כדי לדחוף ישירות מהמחשב (ללא Git push).

---

## משתנים סביבה (PORT)

Railway **מקצה PORT דינמית** דרך `process.env.PORT`.

**server.js כבר מוגדר בצורה נכונה:**
```javascript
const PORT = process.env.PORT || 8123;
```

אין צורך בשינויים נוספים.

---

## בדיקה לאחר Deployment

1. לך לה-URL שניתנה (כגון `https://...railway.app`)
2. בחר דמות (קוסם/מכשפה)
3. משחק צריך לטעון ולעבוד כמו בקומפיוטר הביתי

---

## פתרון בעיות

### ❌ **Build נכשל**
```
ERROR: Dockerfile not found
```
✅ וודא שהקובץ `Dockerfile` קיים בריפו (לא `Dockerfile.txt`).

### ❌ **Port mismatch**
```
Connection refused at localhost:8123
```
✅ Railroad מקצה port דינמי. בדוק את ה-logs ב-Railway:
```
railway logs
```

### ❌ **תרופה מהירה**
```bash
railway down      # עצור את הדיפלוי
railway up        # הפעל מחדש
railway logs      # תראה את ה-output
```

---

## עדכון הצבה

כל `git push` ל-`main` יגרום ל-Railway להתחיל build חדש אוטומטית.

```bash
# בעריכת קובץ
git add .
git commit -m "עדכון משחק"
git push origin main

# Railway build יתחיל תוך שניות
railway logs -f  # עקוב אחרי build בזמן אמת
```

---

## Logs ניטור

```bash
# Logs בזמן אמת
railway logs -f

# Logs בהיסטוריה (200 שורות אחרונות)
railway logs -n 200
```

---

## מחק Deployment

```bash
railway down
```

או דרך Railway UI:
1. בחר את הפרויקט
2. **Settings** → **Delete Project**

---

## עלויות

Railway תקציב חינמי:
- **$5/חודש** free tier
- משחק סטטי זה תחת **$0.50/חודש** ברוב המקרים

---

## שאלות נוספות?

- [Railway Docs](https://docs.railway.app)
- [Node.js Guide](https://docs.railway.app/guides/nodejs)
