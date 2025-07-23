from telethon import TelegramClient, events
from fastapi import FastAPI, Request
import asyncio
import re
import json
from pathlib import Path
from datetime import datetime
import os
from fastapi.security import APIKeyHeader
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

api_id = int(os.getenv("api_id"))
api_hash = os.getenv("api_hash")
session = 'real_admin'
# supplier_bot_username = 'lucia_meow_meow_bot'
supplier_bot_username = 'lucia_meow_meow_bot'

ORDERS_FILE = Path('orders.json')

def load_orders():
    try:
        if ORDERS_FILE.exists():
            with open(ORDERS_FILE, "r") as f:
                return json.load(f)
    except (FileNotFoundError, json.decoder.JSONDecodeError):
        return {}

def save_orders(orders):
    with open(ORDERS_FILE, "w") as f:
        json.dump(orders, f, indent=2)

async def send_success_message_to_user(user_telegram_id, order_id, order):
    message = (
        f"🎉 Your payment has been approved!\n\n"
        f"Order Details:\n"
        f"• Order ID: {order_id}\n"
        f"• Game: Mobile Legends MY\n"
        f"• Denomination: {order['amount']} 💎\n"
        f"• User ID: {order['user_id']}\n"
        f"• Server ID: {order['server_id']}\n\n"
        f"Thank you for your purchase!"
    )
    await client.send_message(user_telegram_id, message)

async def mark_order_success(user_id, server_id, amount, user_telegram_id):
    orders = load_orders()
    for order_id, order in orders.items():
        if (str(order.get("user_id")) == str(user_id) and
            str(order.get("server_id")) == str(server_id) and
            str(order.get("amount")) == str(amount) and
            order.get("status") == "sent"):

            orders[order_id]["status"] = "success"
            orders[order_id]["completed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            if not orders[order_id].get("notified"):
                try:
                    await send_success_message_to_user(int(order.get("telegram_id")), order_id, order)
                    orders[order_id]["notified"] = True
                except Exception as e:
                    print(f"[!] Failed to notify user for {order_id}: {e}")

            save_orders(orders)
            print(f"[✓] Order {order_id} marked as SUCCESS")
            return order_id

    print("[!] No matching 'sent' order found to mark as success")
    return None

orders_pending = load_orders()

client = TelegramClient(session, api_id, api_hash)

@client.on(events.NewMessage(from_users=supplier_bot_username))
async def handler(event):
    message = event.message.message

    user_match = re.search(r"User ID:\s*(\d+)", message)
    server_match = re.search(r"Server ID:\s*(\d+)", message)
    amount_match = re.search(r"Topup Amount:\s*(\d+)", message)
    order_id_match = re.search(r"OrderID:\s*([A-Za-z0-9\-]+)", message)

    if user_match and server_match and amount_match:
        user_id = user_match.group(1)
        server_id = server_match.group(1)
        amount = amount_match.group(1)
        supplier_order_id = order_id_match.group(1) if order_id_match else None

        orders = load_orders()
        for oid, order in orders.items():
            if (str(order.get("user_id")) == user_id and
                str(order.get("server_id")) == server_id and
                str(order.get("amount")) == str(amount) and
                order.get("status") == "sent" and
                order.get("notified") == False):

                order["status"] = "success"
                order["completed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                if supplier_order_id:
                    order["supplier_order_id"] = supplier_order_id
                save_orders(orders)
                print(f"[✔] Success updated for matching order: {oid}")
                return

        print("[!] No matching 'sent' order found for:", user_id, server_id, amount)
    else:
        print("[!] Supplier message missing required info")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await client.start()
    asyncio.create_task(client.run_until_disconnected())
    yield

app = FastAPI(lifespan=lifespan)

@app.post("/send_order")
async def send_order(request: Request):
    data = await request.json()
    to = data['to']
    command = data['command']
    order_id = data['order_id']
    user_id = data.get("user_id")
    server_id = data.get("server_id")
    amount = data.get("amount")
    telegram_id = data.get("telegram_id")

    orders = load_orders()
    orders[str(order_id)] = {
        "command": command,
        "user_id": user_id,
        "server_id": server_id,
        "amount": amount,
        "status": "sent",
        "notified": False,
        "telegram_id": telegram_id
    }
    save_orders(orders)

    await client.send_message(to, command)
    return {"status": "sent"}
