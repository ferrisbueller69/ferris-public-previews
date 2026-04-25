# The District Bites & Brew — Setup Guide

Hi! Below is everything you need to take this site live. Should take about 30 minutes start-to-finish. Each step replaces a piece of placeholder text in `index.html` — they're all in `ALL_CAPS` so you can find them easily with **Ctrl + F** (Windows) or **Cmd + F** (Mac).

---

## 1. Live Chat — Tidio (5 min)

1. Go to **https://tidio.com** and create a free account
2. From the dashboard go to **Settings → Channels → Live Chat → Installation**
3. Copy your Public Key (looks like a long string of letters/numbers)
4. Open `index.html`, search for **`YOUR_TIDIO_PUBLIC_KEY`** and paste your key in
5. (Optional but recommended) In Tidio, set up an after-hours auto-reply so leads still get a response when you're closed

---

## 2. Reservation Form — Formspree (5 min)

The "Reserve a Table" form needs to send to your inbox.

1. Go to **https://formspree.io** and create a free account using `hello@thedistricttucson.com` (or your real inbox)
2. Click **"+ New Form"**, name it "District Reservations"
3. Copy the form ID at the top (looks like `xayzwxyz`)
4. Open `index.html`, search for **`YOUR_FORMSPREE_ID`** and replace it
5. Submit a test reservation through the live site to confirm you receive it

Free tier = 50 submissions / month. Plenty for reservations. If you hit the cap, upgrade or we'll switch to a webhook (no extra cost).

---

## 3. Google Analytics — GA4 (5 min)

So you can see how many people visit the site, where they come from, and what they click.

1. Go to **https://analytics.google.com** → **Admin → Create Property**
2. Name it "The District Bites & Brew", set timezone to Phoenix
3. Add a **Web** data stream → enter your domain
4. Copy the Measurement ID (starts with `G-`)
5. In `index.html`, search for **`G-XXXXXXXXXX`** — there are **two** instances. Replace both.

---

## 4. Google Reviews link (1 min)

The "Read all 235 reviews" button in the reviews section needs your Google Place ID.

1. Go to **https://developers.google.com/maps/documentation/places/web-service/place-id**
2. Search for "The District Bites and Brew Tucson" — copy the Place ID
3. In `index.html`, search for **`YOUR_GOOGLE_PLACE_ID`** and paste it in

(If skipped, the link still works — it just defaults to a Google search.)

---

## 5. Photos — Replace stock images (recommended)

The site currently uses high-quality stock food/bar photos as placeholders. Replace these with your own for the strongest first impression:

| What to replace | Where it shows | Suggested filename |
|---|---|---|
| Hero background | Top of page | `assets/images/hero.jpg` |
| About interior shot | About section | `assets/images/interior.jpg` |
| District Burger | Menu → Eats | `assets/images/burger-district.jpg` |
| Spin Burger | Menu → Eats | `assets/images/burger-spin.jpg` |
| Skirt steak | Menu → Eats | `assets/images/skirt-steak.jpg` |
| Margherita flatbread | Menu → Eats | `assets/images/flatbread.jpg` |
| Prickly Pear Margarita | Menu → Sips | `assets/images/cocktail-pp.jpg` |
| Smoked Paloma | Menu → Sips | `assets/images/cocktail-paloma.jpg` |
| Old Fashioned | Menu → Sips | `assets/images/cocktail-of.jpg` |
| Espresso Martini | Menu → Sips | `assets/images/cocktail-em.jpg` |
| Fried Pickles | Menu → Shares | `assets/images/pickles.jpg` |
| Hot Honey Wings | Menu → Shares | `assets/images/wings.jpg` |
| Loaded Fries | Menu → Shares | `assets/images/fries.jpg` |
| Charcuterie board | Menu → Shares | `assets/images/board.jpg` |
| Derby party | Events section | `assets/images/derby.jpg` |

**Before uploading,** compress each photo at **https://squoosh.app** (drag-and-drop, save as `.jpg`, target ~200 KB each). This keeps the site fast.

In `index.html`, find each `https://images.unsplash.com/...` URL and replace it with the matching `assets/images/...` path.

---

## 6. Update the social links

Search `index.html` for:
- `instagram.com/thedistrictbitesandbrew`
- `facebook.com/thedistrictbitesandbrew`
- `yelp.com/biz/the-district-bites-and-brew-tucson`

Replace each with your real profile URLs.

---

## 7. Deploy to Netlify (5 min)

Free hosting, free SSL, custom domain support.

1. Go to **https://app.netlify.com/drop**
2. Drag the entire `the-district-bites-and-brew` folder onto the page
3. Done — Netlify gives you a temporary URL like `magnificent-burger-a1b2c3.netlify.app`

To use a custom domain (like `thedistricttucson.com`):

1. In Netlify, click your site → **Domain settings → Add custom domain**
2. Enter your domain
3. Netlify shows you DNS records (a CNAME and an A record)
4. Log into your registrar (GoDaddy, Namecheap, Google Domains, etc.) and paste those records into your DNS settings
5. Wait 10-30 minutes for DNS to propagate. SSL certificate is automatic.

---

## 8. Optional add-ons (talk to Levi)

These cost extra to set up but pay for themselves quickly:

- **Lead notification SMS** — get a text the moment someone fills the reservation form (n8n + Twilio)
- **Auto-reply email** — customer gets "thanks, we'll be in touch" within 2 minutes of submitting
- **Google Review monitor** — daily email when a new review comes in
- **Mailchimp signup** — capture emails for monthly specials newsletter
- **Online booking** — Calendly or Resy embed if you'd rather skip the form
- **Future:** migrate to WordPress or Webflow so your team can edit content yourselves

---

## Need help?

Text or call **Levi** — happy to walk through any of this. The site is yours, you own everything in this folder, and I'll keep a backup on my end.

— Levi
