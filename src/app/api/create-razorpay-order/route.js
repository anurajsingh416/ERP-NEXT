import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_SECRET;

  if (!key_id || !key_secret) {
    return NextResponse.json(
      { error: "Razorpay credentials are not configured." },
      { status: 503 }
    );
  }

  try {
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const { amount, currency = "INR", receipt } = await req.json();
    const options = {
      amount: amount * 100,
      currency,
      receipt,
      payment_capture: 1,
    };
    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (error) {
    console.error("Razorpay order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}