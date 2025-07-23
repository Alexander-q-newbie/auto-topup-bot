const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSession = {};
const app = express();
app.use(express.json());

const ordersPath = path.join(__dirname, "orders.json");
const topupPath = path.join(__dirname, 'topup', "games.json");
const agreementsPath = path.join(__dirname, 'agreements.json');
const statePath = path.join(__dirname, 'botState.json');
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

function loadBotState() {
  return JSON.parse(fs.readFileSync(statePath));
}

function saveBotState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function loadAgreements() {
  if (fs.existsSync(agreementsPath)) {
    try {
      return JSON.parse(fs.readFileSync(agreementsPath, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveAgreements(data) {
  fs.writeFileSync(agreementsPath, JSON.stringify(data, null, 2));
}

// Function to load/read orders
function loadOrders() {
  if (fs.existsSync(ordersPath)) {
    return JSON.parse(fs.readFileSync(ordersPath));
  }
  return {};
}

// Function to load/read games
function loadTopup() {
  if (fs.existsSync(topupPath)) {
    return JSON.parse(fs.readFileSync(topupPath));
  }
  return [];
}

// Function to save/write orders
function saveOrders(data) {
  fs.writeFileSync(ordersPath, JSON.stringify(data, null, 2));
}

// Function to save/write games
function saveGames(data) {
  fs.writeFileSync(topupPath, JSON.stringify(data, null, 2));
}

// Periodically check orders for status success to notify users
setInterval(async () => {
  const orders = loadOrders();
  const topupGames = loadTopup();
  let changed = false;

  for (const [id, order] of Object.entries(orders)) {
    if (order.status === "success" && order.notified === false) {
      try {
        const commandParts = order.command.split(" ");
        const gameKey = commandParts[1];
        const gameObj = topupGames.find(g => g.callback === gameKey);
        const gameLabel = gameObj ? gameObj.label : "Unknown Game";

        const message = `
🎉 Top-Up Successful!
Thank you for trusting Q STORE 🙏

📦 *Order Details:*
*Order ID:* ${id}
*Game:* ${gameLabel}
*Amount:* ${order.amount} Diamonds
*User ID:* ${order.user_id}
*Server ID:* ${order.server_id}

✨ We truly appreciate your support. If you enjoyed the service, please leave us feedback!
📝 https://t.me/qstorefeedback

Thanks again for choosing us — see you again! 🌟
`;

        await bot.telegram.sendMessage(order.telegram_id, message, { parse_mode: "Markdown" });
        order.notified = true;
        changed = true;

        console.log(`[BOT] Sent success message to ${order.telegram_id} for order ${id}`);
      } catch (err) {
        console.error(`[BOT] Failed to send message: ${err.message}`);
      }
    }
  }

  if (changed) {
    saveOrders(orders);
  }
}, 5000);

// Generic handler function to show denominations for a given game
function handleGameDenoms(gameKey) {
  return async (ctx) => {
    const filePath = path.join(__dirname, 'denom', `${gameKey}.json`);

    if (!fs.existsSync(filePath)) {
      return ctx.reply("Tengah update pricelist. Lagi 30 minit tak boleh tekan pm @ItsAlexanderQ");
    }

    const denomList = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const buttons = [];

    for (let i = 0; i < denomList.length; i += 2) {
      const row = [];
      if (denomList[i]) row.push(Markup.button.callback(`${denomList[i].label} - ${denomList[i].price}`, denomList[i].callback));
      if (denomList[i + 1]) row.push(Markup.button.callback(`${denomList[i + 1].label} - ${denomList[i + 1].price}`, denomList[i + 1].callback));
      buttons.push(row);
    }

    buttons.push([Markup.button.callback("🔙 Back", 'topup')]);

    await ctx.editMessageText("Choose denomination:", Markup.inlineKeyboard(buttons));
  };
}

// Register bot.action handlers for each denom item of a game
function registerDenomActions(gameKey) {
  const filePath = path.join(__dirname, 'denom', `${gameKey}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`Denomination file missing for gameKey: ${gameKey}`);
    return;
  }
  const denomList = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const gamesList = JSON.parse(fs.readFileSync(path.join(__dirname,'topup','games.json'), 'utf-8'));
  const gameData = gamesList.find(g => g.callback === gameKey);
  const gameLabel = gameData?.label || gameKey;  // Fallback to gameKey if label missing

  denomList.forEach(item => {
<<<<<<< HEAD
    bot.action(item.callback, (ctx) => {
=======
    bot.action(item.callback, async (ctx) => {
>>>>>>> 59d907276d6c043ad4ae12d153006778cef0c3a7
      const userId = ctx.from.id;
      userSession[userId] = {
        step: 'awaiting_id',
        gameLabel: gameLabel,
        order: item,
        gameCallback: gameKey
      };

<<<<<<< HEAD
      ctx.editMessageText(
        `📝 Order: ${item.label} 💎\n💰 Price: ${item.price}\n\nPlease enter your <b>User ID</b> and <b>Server ID</b> (e.g., <code>674732644 3433</code>)`,
        { parse_mode: "HTML" }
      );
=======
     try {
        await ctx.editMessageText(
          `📝 Order: ${item.label} 💎\n💰 Price: ${item.price}\n\nPlease enter your <b>User ID</b> and <b>Server ID</b> (e.g., <code>674732644 3433</code>)`,
          { parse_mode: "HTML" }
        );
      } catch (err) {
        if (err.description === 'Bad Request: message is not modified') {
          // Safe to ignore
        } else {
          console.error("editMessageText error:", err);
        }
      }
>>>>>>> 59d907276d6c043ad4ae12d153006778cef0c3a7
    });
  });
}

// --- START COMMAND ---
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const agreements = loadAgreements();

  // Check if user agreed before (you can persist this in a DB or JSON for real use)
  if (agreements[userId]) {
    // User already agreed, show menu
    await showMainMenu(ctx);
  } else {
    // Otherwise show T&C with Agree button
    await ctx.reply(
      `📜 <b>Terms and Conditions</b>\n\n` +
      `Please read and agree to our terms before using the service.\n\n` +
      `1. Please double-check your <b>Game ID</b> and <b>Server</b> before payment.\n` +
      `2. <b>No refunds</b> for wrong ID/Server provided by the user.\n` +
      `3. We are not responsible for <b>game server maintenance</b> or third-party delays.\n` +
      `4. Submitting <b>fake or edited receipts</b> will result in an instant ban.\n`
      +
      `5. Incomplete payment or unclear receipts will result in delays or order rejection.\n`
      +
      `6. If the diamonds are not received after successful top-up, we will try to contact the supplier to resolve it. However, some cases may be beyond our control.\n`
      +
      `7. By using our service, you agree to all terms stated`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("Agree ✅", "agree_tnc")]
        ])
      }
    );
  }
});

bot.action('agree_tnc', async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || null;
  const firstName = ctx.from.first_name || null;
  const lastName = ctx.from.last_name || null;
  const agreements = loadAgreements();

  agreements[userId] = {
    agreed: true,
    username,
    first_name: firstName,
    last_name: lastName,
    agreed_at: new Date().toISOString()
  };

  saveAgreements(agreements);

  await ctx.answerCbQuery("Terima kasih kerana bersetuju!");
  await ctx.editMessageReplyMarkup();
  await showMainMenu(ctx);
});

function showMainMenu(ctx) {
  return ctx.reply(
    '👋 Welcome to <b>Q Store!</b>\n\nChoose a service:',
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📱 Topup", 'topup')],
        [Markup.button.callback("🎮 Via Login", 'login')],
        [Markup.button.callback("📜 Terms & Conditions", 'tnc')],
        [Markup.button.callback("🌐 Social Media Q Store", 'socmed')],
<<<<<<< HEAD
        [Markup.button.url("🛠️ Improvements / Suggestions", 'https://t.me/ItsAlexanderQ')]
=======
        [Markup.button.url("🛠️ Req", 'https://t.me/ItsAlexanderQ')]
>>>>>>> 59d907276d6c043ad4ae12d153006778cef0c3a7
      ])
    }
  );
}

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const { isOn } = loadBotState();
  const agreements = loadAgreements();
  const userAgreed = agreements[userId];

  // ✅ Always allow admin to bypass all restrictions
  if (userId === ADMIN_ID) return next();

  // ✅ Block if bot is OFF (maintenance mode)
  if (!isOn) {
    return ctx.reply("⚠️ Bot is currently under maintenance. Truly sorry, please come back later.\n\nCan buy direct at Whatsapp +60198313202");
  }

  // ✅ Allow /start command anytime (to show T&C)
  if (ctx.updateType === 'message' && ctx.message.text?.startsWith('/start')) {
    return next();
  }

  // ✅ Allow T&C-related buttons
  if (ctx.updateType === 'callback_query') {
    const action = ctx.update.callback_query.data;
    if (['agree_tnc', 'tnc', 'menu'].includes(action)) {
      return next();
    }
  }

  // ✅ Block everything else if user hasn’t agreed
  if (!userAgreed) {
    return ctx.reply("⚠️ Please agree to the Terms and Conditions first by using /start.");
  }

  // ✅ Everything OK
  await next();
});

bot.command("off", (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  saveBotState({ isOn: false });
  ctx.reply("🔴 Bot is now OFF. Maintenance mode enabled.");
});

bot.command("on", (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  saveBotState({ isOn: true });
  ctx.reply("🟢 Bot is back online.");
});

bot.action('menu', (ctx) => {
  ctx.reply(
    '👋 Welcome to <b>Q Store!</b>\n\nChoose a service:',
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📱 Topup", 'topup')],
        [Markup.button.callback("🎮 Via Login", 'login')],
        [Markup.button.callback("📜 Terms & Conditions", 'tnc')],
        [Markup.button.callback("🌐 Social Media Q Store 🌐", 'socmed')],
        [Markup.button.url("🛠️ Improvements / Suggestions", 'https://t.me/ItsAlexanderQ')]
      ])
    }
  );
});


bot.command('menu', (ctx) => {
  ctx.reply(
    '👋 Welcome to <b>Q Store!</b>\n\nChoose a service:',
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📱 Topup", 'topup')],
        [Markup.button.callback("🎮 Via Login", 'login')],
        [Markup.button.callback("📜 Terms & Conditions", 'tnc')],
        [Markup.button.callback("🌐 Social Media Q Store 🌐", 'socmed')],
        [Markup.button.url("🛠️ Improvements / Suggestions", 'https://t.me/ItsAlexanderQ')]
      ])
    }
  );
});


// --- SELECT GAME ---
bot.action('topup', (ctx) => {
  let topupGames = loadTopup(); // loads from topup/games.json

  // Sort games alphabetically by label
  topupGames.sort((a, b) => a.label.localeCompare(b.label));

  const buttons = topupGames.map(game => [
    Markup.button.callback(game.label, game.callback)
  ]);

  buttons.push([Markup.button.callback("🔙 Back", 'menu')]);

  ctx.editMessageText("Choose a game:", Markup.inlineKeyboard(buttons));
});

// Load games and dynamically register handlers for denomination menus and denom actions
const topupGames = loadTopup();
topupGames.forEach(game => {
  bot.action(game.callback, handleGameDenoms(game.callback));
  registerDenomActions(game.callback);
});

// --- CONFIRMATION & QR ---
bot.action('confirm-details', async (ctx) => {
  const userId = ctx.from.id;

  if (!userSession[userId] || userSession[userId].step !== 'confirming') {
    return ctx.answerCbQuery("No order to confirm.");
  }

  const { userGameId, server, orderDetails  } = userSession[userId];
  const { gameCallback, gameLabel, denom, id, server: srv } = userSession[userId].orderDetails;

    await ctx.editMessageText(
    `✅ Confirmed!\n\n<b>Game</b>: ${gameLabel}\n<b>Denom</b>: ${denom} 💎\n<b>User ID</b>: ${id}\n<b>Server ID</b>: ${srv}\n\nPlease proceed with payment.`,
    { parse_mode: "HTML" }
    );

  try {
    await ctx.sendPhoto(
      { source: './assets/qr.png' },
      {
        caption: '<b>160646053981 - TnG eWallet</b>\n\n📌 Please scan this QR code or use bank number above to make the payment. Then, send your payment receipt (screenshot/photo or PDF) here.',
        parse_mode: "HTML"

      }
    );
    userSession[userId].step = 'awaiting_receipt';
  } catch (error) {
    console.error('QR Code Error:', error);
    await ctx.reply("⚠️ Failed to send payment QR. Please try again.");
  }
});

// --- EDIT DETAILS ---
bot.action('edit-details', (ctx) => {
  const userId = ctx.from.id;

  if (!userSession[userId]) return ctx.answerCbQuery("No data to edit.");
  userSession[userId].step = 'awaiting_id';

  ctx.editMessageText(
  'Please re-enter your <b>User ID and Server ID</b> (e.g., <code>674732644 3433</code>)',
  { parse_mode: "HTML" }
);

});

// --- PHOTO RECEIPT ---
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;

  if (userSession[userId]?.step !== 'awaiting_receipt') return;

  const photo = ctx.message.photo.pop();
  const fileId = photo.file_id;

  userSession[userId].receipt = fileId;
  userSession[userId].step = 'submitted';

  await ctx.reply("📸 Receipt received! We’ll verify your payment shortly.");

  const order = userSession[userId].order;
  const game = userSession[userId].gameLabel;
  const userGameId = userSession[userId].userGameId;
  const server = userSession[userId].server;

  await ctx.telegram.sendPhoto(
    process.env.ADMIN_ID,
    fileId,
    {
      caption: `📥 <b>Payment receipt received</b>\n\n👤 From: @${ctx.from.username || ctx.from.first_name}\n🆔 User ID: ${userId}\n🎮 Game: ${game}\n💎 Denom: ${order.label}\n💰 Price: ${order.price}\n🆔 Game ID: ${userGameId}\n🌐 Server: ${server}`,
      parse_mode: "HTML",

      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Approve", `approve_${userId}`),
          Markup.button.callback("❌ Reject", `reject_${userId}`)
        ]
      ]).reply_markup
    }
  );
});

// --- DOCUMENT (PDF) RECEIPT ---
bot.on('document', async (ctx) => {
  const userId = ctx.from.id;

  if (userSession[userId]?.step !== 'awaiting_receipt') return;

  const doc = ctx.message.document;

  if (doc.mime_type !== 'application/pdf') {
    return ctx.reply("❌ Please send a PDF file as your receipt.");
  }

  const fileId = doc.file_id;
  userSession[userId].receipt = { type: 'pdf', fileId };
  userSession[userId].step = 'submitted';

  await ctx.reply("📄 PDF receipt received! We’ll verify your payment shortly.");

  await ctx.telegram.sendDocument(
    process.env.ADMIN_ID,
    fileId,
    {
    caption: `📥 <b>Payment receipt received (PDF)</b>\n\n👤 From: @${ctx.from.username || ctx.from.first_name}\n🆔 User ID: ${userId}`,
    parse_mode: "HTML",

      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("✅ Approve", `approve_${userId}`), Markup.button.callback("❌ Reject", `reject_${userId}`)]
      ]).reply_markup
    }
  );
});

// --- ADMIN APPROVE ---
bot.action(/^approve_(\d+)$/, async (ctx) => {
  const userId = ctx.match[1];
  const session = userSession[userId];

  if (!session || !session.orderDetails) {
    return ctx.reply("❌ Missing order details.");
  }

  const { gameCallback, gameLabel, denom, id, server, supplierCommand} = session.orderDetails;

  // Build order command
  const orderCommand = `/order ${gameCallback} ${supplierCommand} ${id} ${server}`;

  // Generate unique order ID
  const orderId = uuidv4();
  session.orderId = orderId;

  try {
    const response = await fetch('http://localhost:8000/send_order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '@lucia_meow_meow_bot',
        command: orderCommand,
        order_id: orderId,
        user_id: id,
        server_id: server,
        amount: denom,
        game: gameCallback,
        telegram_id: userId
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await ctx.editMessageCaption({
      caption: `✅ Order sent successfully!\n\n` +
        `<b>Order ID:</b> <code>${orderId}</code>\n` +
        `<b>Game:</b> ${gameLabel}\n` +
        `<b>Denomination:</b> ${denom} 💎\n` +
        `<b>User ID:</b> ${id}\n` +
        `<b>Server ID:</b> ${server}\n\n` +
        `Please wait for the confirmation from supplier.`,
        parse_mode: "HTML"
    });

    delete userSession[userId];
  } catch (error) {
    console.error("Order send error:", error);
    await ctx.reply("❌ Failed to send order to supplier.");
  }
});

// --- ADMIN REJECT ---
bot.action(/^reject_(\d+)$/, async (ctx) => {
  const userId = ctx.match[1];
  await ctx.editMessageCaption({ caption: "❌ Rejected by admin", parse_mode: "HTML" });
  await ctx.telegram.sendMessage(userId, "❌ Your payment has been rejected. Please try again or contact support @ItsAlexanderQ");
});

// --- HANDLE TEXT INPUT (ID + SERVER) ---
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;

  if (userSession[userId]?.step === 'awaiting_id') {
    const input = ctx.message.text.trim();
    const parts = input.split(' ');

    if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) {
      return ctx.reply(
        '❌ Invalid format. Please enter your ID and Server like this:\n<code>674732644 3433</code>',
        { parse_mode: "HTML" }
        );
    }

    const [id, server] = parts;
    const order = userSession[userId].order;
    const gameLabel = userSession[userId].gameLabel;
    const gameCallback = userSession[userId].gameCallback;

    userSession[userId] = {
      ...userSession[userId],
      userGameId: id,
      server: server,
      step: 'confirming',
      orderDetails: {
        gameCallback: gameCallback, // important for supplier command
        gameLabel: gameLabel,       // for displaying to user/admin
        denom: order.label,
        id,
        server,
        supplierCommand: order.supplierCommand
      }
    };

    await ctx.reply(
      `✅ <b>Order Details Confirmed!</b>\n\n` +
        `<b>Game</b>: ${gameLabel}\n` +
        `<b>Denomination</b>: ${order.label} 💎\n` +
        `<b>Price</b>: ${order.price}\n` +
        `<b>User ID</b>: ${id}\n` +
        `<b>Server ID</b>: ${server}\n\n` +
        `Please confirm your order below.`,
        {
            parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("✅ Confirm", 'confirm-details')],
          [Markup.button.callback("✏️ Edit", 'edit-details')],
          [Markup.button.callback("❌ Cancel", 'cancel-details')]
        ])
      }
    );
  }
});

bot.action('cancel-details', async (ctx) => {
  const userId = ctx.from.id;

  // Clear user session to reset state
  delete userSession[userId];

  // Inform user
  await ctx.editMessageText(
    '❌ Your order has been canceled. You can start again anytime.',
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", 'menu')]
      ])
    }
  );
});

bot.action('login', async (ctx)  => {
  await ctx.editMessageText(
    "Not available yet", Markup.inlineKeyboard([Markup.button.callback("Back",'menu')])
  );
})

bot.action('socmed', async (ctx) => {
  await ctx.answerCbQuery(); // optional but dismisses the loading spinner

  const message = `
📢 <b>Q STORE Official Contacts</b>

🔹 <b>Instagram</b>: Not available at the moment.
📱 <b>WhatsApp (Direct)</b>: <a href="https://wa.me/60198313202">+6019-831 3202</a>
📢 <b>WhatsApp Channel</b>: <a href="https://whatsapp.com/channel/0029VavO4qiAYlUS4wwiov39">Q STORE Channel</a>
👥 <b>WhatsApp Group</b>: <a href="https://chat.whatsapp.com/KAeXD1PJyxM25CfuCWcckn">Join Community</a>
💬 <b>Telegram Feedback Group</b>: <a href="https://t.me/qstorefeedback">t.me/qstorefeedback</a>
👤 <b>Telegram Admin</b>: @ItsAlexanderQ

🛒 Thank you for supporting <b>Q STORE</b>! Let us know if you need anything 😊
`;

  await ctx.editMessageText(message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Back', 'menu')]
    ]).reply_markup
  });
});

bot.action('tnc', async (ctx) => {
  await ctx.editMessageText(
    `📜 <b>Terms & Conditions</b>\n\n` +
    `1. Please double-check your <b>Game ID</b> and <b>Server</b> before payment.\n` +
    `2. <b>No refunds</b> for wrong ID/Server provided by the user.\n` +
    `3. We are not responsible for <b>game server maintenance</b> or third-party delays.\n` +
    `4. Submitting <b>fake or edited receipts</b> will result in an instant ban.\n` +
    `5. Incomplete payment or unclear receipts will result in delays or order rejection.\n` +
    `6. If the diamonds are not received after successful top-up, we will try to contact the supplier to resolve it. However, some cases may be beyond our control.\n` +
    `7. By using our service, you agree to all terms stated.`,
    {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Back", 'menu')]
      ]).reply_markup
    }
  );
});


// Start bot and server
bot.launch();
app.listen(3000, () => console.log("Bot server running on port 3000"));
