# Shipping Snakes & Ladders Deluxe without the Play Store

The full step-by-step guide with screenshots-level detail is in the PDF
that came with this zip (Ship Your Game to Android, Free). This file is
the cheat sheet version for when you already know the moves.

## One-time setup on your laptop

1. Install Node.js LTS from nodejs.org
2. Create free accounts: github.com and vercel.com (sign in with GitHub)

## Put the game online (2 minutes)

```
npm install -g vercel
vercel login
cd snakes-and-ladders-deluxe
vercel --prod
```

Answer the prompts: link a new project, directory is ./, use the defaults.
Your game is now live at a permanent https link. Open it on your phone.

## Build the Android APK with Bubblewrap

```
npm install -g @bubblewrap/cli
bubblewrap doctor --fix
mkdir snl-android && cd snl-android
bubblewrap init --manifest="https://YOUR-APP.vercel.app/manifest.json"
bubblewrap build
```

Keep every default except: pick a package name you will never change
(like com.yourname.snakeladder) and set portrait orientation.
The first build downloads Android tools, so give it a few minutes.

You get app-release-signed.apk. Keep the keystore file and its password
somewhere safe forever. Lose it and you can never update this app.

## Remove the address bar

Bubblewrap also generates assetlinks.json. Copy it to
public/.well-known/assetlinks.json in this project, then run
`vercel --prod` again. Reinstall the APK and the URL bar is gone.

## Share it

GitHub: new public repo (initialize with a README) > Releases >
Draft a new release > tag v1.0.0 > attach app-release-signed.apk > publish.
Send the release link to your friends.

## Turning on online multiplayer later

The online service (mini-services/online) needs its own always-on host:

1. Push this source to the GitHub repo you made
2. render.com > New + > Web Service > connect that repo
3. Root Directory: mini-services/online (Dockerfile is detected)
4. Pick the Free plan, create it
5. Then tell the game where it lives:
   `vercel env add NEXT_PUBLIC_ONLINE_URL production`
   paste the Render URL, then `vercel --prod` again

Free Render instances sleep after 15 idle minutes and reset their
database on restart, so treat it as a trial tier. When you want
accounts to survive forever, move the database to Supabase (free) or
add Render's one dollar disk.

## Updating the game

Changed game code? `vercel --prod` and every installed APK picks it up
on next launch. No new APK needed, ever.

Changed the icon or app name? `bubblewrap update`, `bubblewrap build`,
upload v1.0.1 to Releases. Friends install right over the old version
and keep their coins and stats.
