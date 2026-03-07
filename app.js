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
    console.error("❌ Error: API Keys and Email Credentials are missing.");
    process.exit(1);
  }

  console.log(`🚀 Starting SMART Campaign for: ${niche} in ${location}`);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: senderEmail, pass: appPassword },
  });

  const browser = await puppeteer.launch({
    headless: true,
    args:['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // ==========================================
  // STEP 1: Businesses ki Asli Websites dhoondhna
  // ==========================================
  const searchQuery = `${niche} in ${location} official website contact`;
  console.log(`🔍 Searching for local business websites...`);
  
  await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`, { waitUntil: 'domcontentloaded' });
  
  // Faltu directories (JustDial wagera) ko ignore karke sirf asli website nikalna
  const urls = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('h2 a'));
    return links.map(a => a.href).filter(href => 
      href.startsWith('http') && 
      !href.includes('justdial') && 
      !href.includes('sulekha') && 
      !href.includes('indiamart') &&
      !href.includes('facebook') &&
      !href.includes('instagram')
    );
  });

  console.log(`🌐 Found ${urls.length} target websites. Checking them for emails...`);

  let rawEmails =[];

  // ==========================================
  // STEP 2: Har website ke andar jaakar Email dhoondhna
  // ==========================================
  for (let i = 0; i < urls.length; i++) {
    if (rawEmails.length >= maxLeads + 2) break; // Agar kaafi leads mil gaye toh ruk jao

    console.log(`➡️ Visiting website: ${urls[i]}`);
    try {
      // 15 second ka time denge website load hone ko
      await page.goto(urls[i], { waitUntil: 'domcontentloaded', timeout: 15000 });
      const pageText = await page.evaluate(() => document.body.innerText);
      
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const found = pageText.match(emailRegex);
      
      if (found) {
        console.log(`   ✅ Found email on this site!`);
        rawEmails.push(...found);
      } else {
         console.log(`   ❌ No email on this site.`);
      }
    } catch (error) {
      console.log(`   ⚠️ Website could not load (Blocked or Slow). Skipping...`);
    }
  }

  await browser.close();

  // Duplicate aur apne khud ke email ko hatana
  let emails =[...new Set(rawEmails)].filter(e => e.toLowerCase() !== senderEmail.toLowerCase());
  emails = emails.slice(0, maxLeads); 

  if (emails.length === 0) {
    console.log("⚠️ No emails found on the websites. Try a different query (e.g. Hospital in Mumbai).");
    process.exit(0);
  }

  console.log(`🎯 Final List of ${emails.length} Emails to contact:`, emails);

  // ==========================================
  // STEP 3: AI Email Generation & Sending
  // ==========================================
  let successfulLeads =[];

  for (const leadEmail of emails) {
    console.log(`🤖 AI is writing email for: ${leadEmail}`);
    
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
              "content": `Write a very short, professional cold email to a ${niche} business in ${location}. Offer a free 15-min digital marketing consultation. Do not include subject line in body. Maximum 3 sentences.`
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
      console.log("📊 Sending Final Summary Report to you...");
      const summaryText = `Hello,\n\nYour Smart Lead Gen tool just finished a campaign.\n\nTarget: ${niche} in ${location}\nTotal Emails Sent: ${successfulLeads.length}\n\nList of Leads Contacted:\n${successfulLeads.join("\n")}\n\nAwesome work!`;

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
