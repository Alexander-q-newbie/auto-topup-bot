from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import ContextTypes
from services import game_list, denom_list, get_qr_image, send_request_to_admin

# store user session
user_data = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [[InlineKeyboardButton("💎 Topup", callback_data="topup")]]
    await update.message.reply_text("Welcome! Please select a service:", reply_markup=InlineKeyboardMarkup(keyboard))

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user_id = query.from_user.id
    data = query.data

    if data == "topup":
        user_data[user_id] = {}
        keyboard = [[InlineKeyboardButton(game, callback_data=f"game_{game}")] for game in game_list()]
        await query.edit_message_text("Choose a game:", reply_markup=InlineKeyboardMarkup(keyboard))

    elif data.startswith("game_"):
        game = data.replace("game_", "")
        user_data[user_id]["game"] = game
        keyboard = [[InlineKeyboardButton(d, callback_data=f"denom_{d}")] for d in denom_list(game)]
        await query.edit_message_text(f"{game} - Choose Diamond Package:", reply_markup=InlineKeyboardMarkup(keyboard))

    elif data.startswith("denom_"):
        denom = data.replace("denom_", "")
        user_data[user_id]["denom"] = denom
        await query.edit_message_text("Please enter your ID and Server (format: ID|Server):")

    elif data == "confirm_details":
        # proceed to payment
        await query.edit_message_text("Please make payment to the QR below. Once paid, click 'I Have Paid'.")
        await context.bot.send_photo(chat_id=user_id, photo=get_qr_image())
        keyboard = [[InlineKeyboardButton("✅ I Have Paid", callback_data="payment_done")]]
        await context.bot.send_message(chat_id=user_id, text="After payment:", reply_markup=InlineKeyboardMarkup(keyboard))

    elif data == "edit_details":
        await context.bot.send_message(chat_id=user_id, text="Please resend your details (format: ID|Server):")

    elif data == "payment_done":
        data = user_data.get(user_id, {})
        await send_request_to_admin(context, data, user_id)
        await query.edit_message_text("Thank you! We’ve received your order and will process it soon.")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text

    if "|" in text:
        try:
            id_part, server_part = text.split("|")
            user_data[user_id]["id"] = id_part.strip()
            user_data[user_id]["server"] = server_part.strip()

            game = user_data[user_id]["game"]
            denom = user_data[user_id]["denom"]

            confirm_text = (
                f"✅ Confirm Your Details:\n\n"
                f"Game: {game}\n"
                f"Diamond: {denom}\n"
                f"ID: {id_part.strip()}\n"
                f"Server: {server_part.strip()}\n"
            )

            keyboard = [
                [InlineKeyboardButton("✅ Confirm", callback_data="confirm_details")],
                [InlineKeyboardButton("✏️ Edit", callback_data="edit_details")]
            ]

            await update.message.reply_text(confirm_text, reply_markup=InlineKeyboardMarkup(keyboard))
        except Exception:
            await update.message.reply_text("Format salah. Sila hantar seperti ini: `12345678|1234`", parse_mode="Markdown")
