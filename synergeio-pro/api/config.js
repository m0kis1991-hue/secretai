// Public, non-secret runtime config for the client. A Google OAuth "Web
// application" client ID is meant to be exposed in the browser (it only
// identifies the app to Google; it is not a secret), so serving it from here
// lets the Google signup button turn on/off by setting one Vercel env var,
// with no redeploy needed on the client side.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
};
