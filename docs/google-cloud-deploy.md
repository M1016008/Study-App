# Google Cloud Personal Deployment

This app currently stores study data in SQLite:

```text
data/learn-ai.db
```

For a personal Google Cloud deployment, use **Compute Engine** first. It keeps
the current app architecture simple and stores SQLite data on a persistent VM
disk.

Cloud Run is a good fit for stateless Next.js apps, but its container file
system is not permanent after an instance stops. Use Cloud Run only after
moving app data to Cloud SQL / managed storage.

## Recommended Setup

- Google Cloud service: Compute Engine VM
- Machine type: e2-small or e2-micro for light personal use
- OS: Ubuntu LTS
- Storage: Persistent Disk
- Runtime: Node.js LTS
- Process manager: pm2
- App port: 3000

## Environment Variables

Create `.env.local` on the VM:

```env
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.0-flash
```

Do not commit `.env.local` to GitHub.

## VM Setup Commands

Run these on the VM:

```bash
sudo apt update
sudo apt install -y git curl

curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

git clone https://github.com/M1016008/Study-App.git
cd Study-App
npm install
npm run build
mkdir -p data
```

Create `.env.local`:

```bash
nano .env.local
```

Start the app:

```bash
PORT=3000 pm2 start npm --name study-app -- run start
pm2 save
pm2 startup
```

## Access Control

For personal use, do not leave the app open to everyone.

Recommended options:

- Restrict the firewall source IP to your own public IP.
- Or place the VM behind Identity-Aware Proxy / a VPN.
- Keep the Gemini API key only in `.env.local` on the VM.

## Update After GitHub Changes

```bash
cd ~/Study-App
git pull
npm install
npm run build
pm2 restart study-app
```
