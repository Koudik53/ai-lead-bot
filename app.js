const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

async function runCampaign() {
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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: senderEmail, pass: appPassword },
  });

  const browser = await puppeteer.launch({
    headless: true,
    args:['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  
  const page = await browser.newPage();
  
  // ✅ ANTI-BOT BYPASS: Ab server ko lagega ki yeh normal computer hai
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  const searchQuery = `"${niche}" "${location}" "@gmail.com" OR "@yahoo.com"`;
  console.log(`🔍 Searching on Bing (Google blocks servers): ${searchQuery}`);
  
  // ✅ CHANGED TO BING: Bing jaldi block nahi karta
  await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`, { waitUntil: 'domcontentloaded' });
  
  const pageText = await page.evaluate(() => document.body.innerText);
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const rawEmails = pageText.match(emailRegex) ||[];
  
  // Duplicate aur khud ka email hatana
  let emails = [...new Set(rawEmails)].filter(e => e.toLowerCase() !== senderEmail.toLowerCase());
  emails = emails.slice(0, maxLeads); 
  
  await browser.close();

  if (emails.length === 0) {
    console.log("⚠️ No emails found. Try a different query like 'Hospital in Mumbai'.");
    process.exit(0);
  }

  console.log(`✅ Found ${emails.length} emails:`, emails);

  let successfulLeads =[];

  for (const leadEmail of emails) {
    console.log(`🤖 Generating AI email for: ${leadEmail}`);
    
    try {
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
              "content": `Write a very short, professional cold email to a ${niche} business in ${location}. Offer a free 15-min digital marketing consultation. Don't include subject line in body. Maximum 3 sentences.`
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
    } catch (error) {
       console.log(`❌ Error sending to ${leadEmail}:`, error.message);
    }
  }

  if (successfulLeads.length > 0) {
      console.log("📊 Sending Summary Report to you...");
      const summaryText = `Hello,\n\nYour GitHub Action Lead Gen tool just finished a campaign.\n\nTarget: ${niche} in ${location}\nTotal Emails Sent: ${successfulLeads.length}\n\nList of Leads Contacted:\n${successfulLeads.join("\n")}\n\nAwesome work!`;

      await transporter.sendMail({
        from: senderEmail,
        to: senderEmail, 
        subject: `Campaign Report: ${niche} in ${location} ✅`,
        text: summaryText
      });
  }

  console.log("🎉 All done! Campaign finished successfully.");
}

runCampaign();
