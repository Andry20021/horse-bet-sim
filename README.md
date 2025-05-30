# 🐎 HorseStake – Multiplayer Horse Betting Simulator

**HorseStake** is an interactive horse betting simulator built with Next.js, Firebase, and TailwindCSS. Players can sign up, place bets on animated horse races, track their performance stats, and engage in live chat with other users.

---

## 🚀 Features

- 🎲 **Random Horse Races**: Each race selects 3–6 random horses from a pool of 20 unique names with randomized odds.
- 💰 **Live Betting & Wallet**: Users start with $10,000 virtual currency and can deposit/withdraw as needed.
- 📈 **Per-Horse Stats**: Wins, losses, and total payouts are tracked for every horse across all races.
- 🧾 **Match History Logging**: Each race is recorded globally and per user.
- 🗣 **Live Chat**: Users can send live messages that appear alongside their username.
- 👤 **User Authentication**: Firebase Auth handles signup/login, with Firestore storing user balances, usernames, and stats.
- 🧑‍💼 **Profile Management**: Users can change their username through a custom profile modal.
- 🖼 **Pie Charts**: Every horse in the current race displays a win/loss pie chart.

---

## 📦 Tech Stack

- **Frontend**: React (Next.js with App Router)
- **Styling**: TailwindCSS
- **Backend**: Firebase Authentication + Firestore
- **Charts**: Chart.js (via `react-chartjs-2`)
- **Hosting**: **Firebase App Hosting** (CI/CD deployment via GitHub)

---

## 🌐 Live Demo

🔗 [https://horsepicks.me](https://horsepicks.me)  
Secured with **HTTPS** using an SSL certificate issued by **Google Trust Services** via **Firebase Hosting** & **Cloudflare DNS**.

---

## 🛠 How to Run Locally

1. Clone the repo:
   ```bash
   git clone https://github.com/andry20021/horse-bet-sim.git
   cd horse-bet-sim
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a Firebase project.
   - Enable **Authentication** (Email/Password).
   - Enable **Firestore Database**.
   - Create a `.env.local` file and add:
     ```env
     NEXT_PUBLIC_FIREBASE_API_KEY=your_key_here
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
     NEXT_PUBLIC_FIREBASE_APP_ID=...
     ```

4. Run the app locally:
   ```bash
   npm run dev
   ```

---

## 🚀 Production Deployment

This project uses **Firebase App Hosting** with CI/CD:

- Deployment is triggered automatically on every push to the `master` branch.
- Environment variables for production are configured in `apphosting.yaml`.

No need to manually run `npm run build` for deployment.

---

## 🧪 In-Progress & Upcoming Features

These are planned or in development:

- 👥 **Multiplayer Support**: Real-time racing sessions with multiple players in the same room.
- 🖼 **User Avatars**: Upload a custom profile image to appear in chat and on race UI.
- 🏆 **Leaderboard**: Global ranking of players based on total profit or win rate.
- 🐴 **Custom Horse Breeding/Unlocks**: Users may unlock or create horses in future phases.
- 🔒 **Username Uniqueness Enforcement**: Optional validation layer to prevent duplicate usernames.
- 📲 **Mobile Responsiveness**: Improved mobile layout for seamless use on phones/tablets.

---

## 📬 Contact

📧 [Email](andryastorga5@gmail.com)
🔗 [LinkedIn](https://www.linkedin.com/in/andry-astorga-1835441b2/)  
💻 [GitHub](https://github.com/andry20021)