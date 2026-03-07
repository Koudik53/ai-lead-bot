const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

async function runCampaign() {
  // 1. GitHub Actions se variables lena
  const niche = process.env.NICHE || "Gym";
  const location = process.env.LOCATION || "Delhi";
  const maxLeads = parseInt(process.env.MAX_LEADS) || 2;
  
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  const appPassword = process.env.APP_PASSWORD;

  if (!openRouterKey || !senderEmail || !appPassword) {
    console.error("❌ Error: API Keys and Email Credentials are missing in GitHub Secrets.");
    process.exit(1);
  }

  console.log(`🚀 Starting Campaign for: ${niche} in ${location}`);

  // 2. Setup Email Sender
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: senderEmail, pass: appPassword },
  });

  // 3. Start Puppeteer (Optimized for GitHub Actions Server)
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // GitHub par chalane ke liye zaruri hai
  });
  
  const page = await browser.newPage();
  
  // Smart Google Query to easily find emails
  const searchQuery = `"${niche}" "${location}" "@gmail.com" OR "@yahoo.com"`;
  console.log(`🔍 Searching Google: ${searchQuery}`);
  
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`);
  
  // Extract Emails using Regex
  const pageText = await page.evaluate(() => document.body.innerText);
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const rawEmails = pageText.match(emailRegex) ||[];
  
  let emails = [...new Set(rawEmails)].filter(e => e !== senderEmail);
  emails = emails.slice(0, maxLeads); // Limit the emails so we don't spam
  
  await browser.close();

  if (emails.length === 0) {
    console.log("⚠️ No emails found. Try a different query.");
    process.exit(0);
  }

  console.log(`✅ Found ${emails.length} emails:`, emails);

  let successfulLeads =[];

  // 4. Send Emails using AI
  for (const leadEmail of emails) {
    console.log(`🤖 Generating AI email for: ${leadEmail}`);
    
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "z-ai/glm-4.5-air:free",
        "messages":[
          {
            "role": "user",
            "content": `Write a very short, professional cold email to a ${niche} business in ${location}. Offer them a free 15-min digital marketing consultation. Don't include subject line in body. Keep it 3-4 sentences maximum.`
          }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const emailBody = aiData.choices[0].message.content;

    console.log(`📧 Sending email to ${leadEmail}...`);
    
    await transporter.sendMail({
      from: senderEmail,
      to: leadEmail,
      subject: `Quick question about your ${niche} business in ${location}`,
      text: emailBody
    });

    successfulLeads.push(leadEmail);
  }

  // 5. Send Summary Email to Yourself
  console.log("📊 Sending Summary Report to you...");
  const summaryText = `Hello,\n\nYour GitHub Action Lead Gen tool just finished a campaign.\n\nTarget: ${niche} in ${location}\nTotal Emails Sent: ${successfulLeads.length}\n\nList of Leads Contacted:\n${successfulLeads.join("\n")}\n\nAwesome work!`;

  await transporter.sendMail({
    from: senderEmail,
    to: senderEmail, 
    subject: `Campaign Report: ${niche} in ${location} ✅`,
    text: summaryText
  });

  console.log("🎉 All done! Campaign finished successfully.");
}

runCampaign();
