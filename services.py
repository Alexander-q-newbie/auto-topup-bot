def game_list():
    return ["Mobile Legends", "Free Fire", "PUBG Mobile"]

def denom_list(game):
    if game == "Mobile Legends":
        return ["86 + 9 💎", "172 + 18 💎", "257 + 28 💎"]
    return ["100 💎", "200 💎"]

def get_qr_image():
    return open("data/qr_code.png", "rb")

async def send_request_to_admin(context, data, user_id):
    msg = (
        f"🛒 New Topup Request:\n\n"
        f"User ID: {user_id}\n"
        f"Game: {data.get('game')}\n"
        f"Diamond: {data.get('denom')}\n"
        f"ID: {data.get('id')}\n"
        f"Server: {data.get('server')}"
    )
    await context.bot.send_message(chat_id=1393073457, text=msg)
