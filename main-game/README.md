# 🇹🇭 Thailand Political Simulation (TPS)

> **Navigate the most volatile democracy in Southeast Asia.**

A browser-based political strategy game where you serve as the Prime Minister of Thailand in a fragile coalition government. Every month brings a new crisis — student protests, military posturing, corruption scandals, constitutional crises — and every decision you make shifts the balance of power.

**Can you survive a full 4-year term?**

---

## 🎮 Play Now

👉 **[Play Thailand Political Simulation](https://YOUR_USERNAME.github.io/TPSREAL/)** *(replace with your actual GitHub Pages URL after deployment)*

No downloads. No installs. Just click and play.

---

## 📸 Screenshots

| Start Screen | Game Dashboard | Crisis Event |
|:---:|:---:|:---:|
| Gold-accented title screen | Full political dashboard with parliament, stats & laws | Breaking news-style crisis with multiple choices |

---

## 🕹️ How to Play

You are the **newly elected Prime Minister**. Each turn = **1 month** of your 48-month term.

### Every Month:
1. A **Crisis Event** appears — inspired by real Thai political dynamics
2. You choose how to respond from 2-3 options
3. Your choice affects **Approval**, **Budget**, **Unrest**, and **Party Relations**
4. Monthly effects from active laws are applied
5. Coalition stability is evaluated

### You Can Also:
- **Propose Laws** — Parliament votes based on party ideology & loyalty to you
- **Repeal Laws** — Reverse a policy if it's causing more harm than good
- **Monitor your Coalition** — parties may join or defect based on your decisions

### Game Over If:
| Condition | Trigger |
|---|---|
| 🔴 **Military Coup** | Social Unrest reaches 100% |
| 🎖️ **Military Coup** | Military Patience reaches 0 |
| 💰 **Bankruptcy** | National Budget runs out |
| 🏛️ **No Confidence** | Coalition loses 251-seat majority |
| 📉 **Forced Resignation** | Approval drops to 0% |

### Victory:
🏆 **Survive all 48 months** and receive a score (S through F) plus a Thai+English title!

---

## 🏛️ Political Parties

| Party | Ideology | Starting Seats | Coalition? |
|---|---|---|---|
| 🟠 **Progressive Move Party** | Progressive-Reformist | 152 | ✅ |
| 🔴 **People's Populist Party** | Populist-Pragmatic | 141 | ✅ |
| 🔵 **National Heritage Party** | Royalist-Conservative | 97 | ❌ |
| 🔷 **Thai Unity Party** | Centrist | 65 | ✅ |
| 🟢 **Southern Pact Coalition** | Regional | 45 | ❌ |

**Starting Coalition: 358 / 500 seats** (majority = 251)

---

## 🔥 Crisis Events

15 deeply-researched crisis events inspired by real Thai political history:

- 🎓 Student flash mobs demanding constitutional rewrites
- 🌾 Farmer marches over unpaid rice subsidies
- ⚖️ Constitutional Court petitions to dissolve parties
- 🎖️ Army Commander giving cryptic TV interviews
- 📱 Minister asset scandals going viral
- 💥 Deep south separatist bombings
- 📉 Export collapse and baht crises
- 👑 Palace statements on government policy
- 📵 Demands to shut down social media
- 🏚️ Coalition partners threatening to defect
- 🌊 Catastrophic flooding
- ⚖️ High-profile lèse-majesté arrests
- 🌿 Cannabis regulation chaos
- 🚢 Controversial submarine procurement deals
- 🛕 Mega-temple financial scandals

---

## 📁 Project Structure

```
TPSREAL/
├── index.html    — Game UI (HTML structure)
├── style.css     — Dashboard styling (dark navy + gold theme)
├── data.js       — Parties, laws, crisis events, game constants
├── engine.js     — Game logic (turns, voting, crisis resolution)
├── main.js       — DOM binding, event listeners, UI updates
└── README.md     — This file
```

**Tech Stack:** Vanilla HTML + CSS + JavaScript. Zero dependencies. Zero build steps.

---

## 🚀 Deploy to GitHub Pages (Step-by-Step)

Follow these instructions to put TPS online so anyone can play it via a web link.

### Prerequisites
- A [GitHub account](https://github.com/signup) (free)
- The 5 game files on your computer: `index.html`, `style.css`, `data.js`, `engine.js`, `main.js`

---

### Step 1: Create a New Repository

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `TPSREAL` (or any name you like)
3. **Description:** `Thailand Political Simulation — a browser-based political strategy game`
4. Set it to **Public** (required for free GitHub Pages)
5. ✅ Check **"Add a README file"** — *optional, you already have one*
6. Click **"Create repository"**

---

### Step 2: Upload Your Game Files

1. On your new repository page, click the **"Add file"** dropdown → **"Upload files"**
2. Drag and drop ALL 6 files into the upload area:
   - `index.html`
   - `style.css`
   - `data.js`
   - `engine.js`
   - `main.js`
   - `README.md`
3. In the commit message, type: `Add TPS game files`
4. Click **"Commit changes"**

---

### Step 3: Enable GitHub Pages

1. In your repository, click the **"Settings"** tab (top bar, far right)
2. In the left sidebar, scroll down and click **"Pages"**
3. Under **"Source"**, select:
   - **Branch:** `main`
   - **Folder:** `/ (root)`
4. Click **"Save"**
5. Wait 1-2 minutes for GitHub to build your site

---

### Step 4: Get Your Game Link

1. Go back to **Settings → Pages**
2. You'll see a green banner: **"Your site is live at"** followed by a URL
3. The URL will be: `https://YOUR_USERNAME.github.io/TPSREAL/`
4. **That's it!** Share this link with anyone — they can play instantly in their browser

---

### Alternative: Deploy via Git Command Line

If you prefer using Git from the terminal:

```bash
# Navigate to your project folder
cd path/to/TPSREAL

# Initialize git
git init
git add .
git commit -m "Initial commit: Thailand Political Simulation"

# Add your GitHub repo as remote (replace with your actual URL)
git remote add origin https://github.com/YOUR_USERNAME/TPSREAL.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Then follow **Step 3** above to enable GitHub Pages in Settings.

---

## 🎯 Game Design Philosophy

TPS translates real-world Thai political dynamics into gameplay mechanics:

- **No "correct" answers** — every choice has trade-offs, just like real politics
- **Coalition fragility** — your majority can evaporate from a single bad decision
- **The military shadow** — a hidden "Military Patience" stat that can end your game at any time
- **Ideology clashes** — laws that please reformists infuriate royalists, and vice versa
- **Crisis escalation** — ignoring problems makes them worse; confronting them creates new ones

The game captures a core truth of Thai politics: **survival IS the victory condition**.

---

## 📄 License

This is a personal educational project. The political events are fictionalized and simplified for gameplay purposes. No endorsement of any real political party, institution, or ideology is intended.

---

<p align="center">
  <strong>🏛️ Step into Government House. Every decision matters.</strong><br>
  <em>Built with vanilla HTML, CSS & JavaScript</em>
</p>
