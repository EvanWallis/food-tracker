# Food Tracker

A simple offline-first food log you can add to your phone home screen.

## Local preview

```sh
cd /Users/evanwallis/food-tracker
python3 -m http.server 8080
```

Open http://localhost:8080 in a browser.

## Deploy (easy)

### Option A: Netlify Drop (no CLI)
1. Go to Netlify and create a free account.
2. Drag the entire `food-tracker` folder into the Netlify “Drop” area.
3. Netlify gives you a live URL.

### Option B: Vercel (CLI)
```sh
npm i -g vercel
cd /Users/evanwallis/food-tracker
vercel
```

## Add to home screen (iPhone)
1. Open the deployed URL in Safari.
2. Tap the Share icon.
3. Tap “Add to Home Screen”.

Data is stored locally on the device in the browser.
