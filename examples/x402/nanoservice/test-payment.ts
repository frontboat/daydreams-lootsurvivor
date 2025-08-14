#!/usr/bin/env bun
import { config } from "dotenv";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { decodeXPaymentResponse, wrapFetchWithPayment } from "x402-fetch";

config();

/**
 * Quick test script to verify x402 payment integration
 */

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const SERVICE_URL = process.env.SERVICE_URL || "http://localhost:4021";

if (!PRIVATE_KEY) {
  console.error("Missing PRIVATE_KEY environment variable");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const fetchWithPayment = wrapFetchWithPayment(fetch, account);

async function testPayment() {
  console.log("🧪 Testing x402 Payment Integration");
  console.log("Account:", account.address);
  console.log("Service:", SERVICE_URL);
  console.log("");

  try {
    // 1. Test free endpoint
    console.log("1️⃣ Testing free endpoint...");
    const infoResponse = await fetch(SERVICE_URL);
    const info = await infoResponse.json();
    console.log("✅ Service info:", info.service || info.name);
    console.log("");

    // 2. Test paid endpoint
    console.log("2️⃣ Testing paid endpoint with x402-fetch...");
    const paidResponse = await fetchWithPayment(`${SERVICE_URL}/assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "Hello, testing x402 payments!",
        sessionId: "payment-test",
      }),
    });

    if (!paidResponse.ok) {
      const error = await paidResponse.json();
      throw new Error(error.error || `HTTP ${paidResponse.status}`);
    }

    const result = await paidResponse.json();
    console.log("✅ AI Response:", result.response);

    // 3. Decode payment details
    const paymentHeader = paidResponse.headers.get("x-payment-response");
    if (paymentHeader) {
      console.log("");
      console.log("3️⃣ Payment Details:");
      const payment = decodeXPaymentResponse(paymentHeader);
      console.log("✅ Success:", payment.success);
      console.log("💰 Transaction:", payment.transaction);
      console.log("🌐 Network:", payment.network);
      console.log("👤 Payer:", payment.payer);
    } else {
      console.log("⚠️  No payment header found");
    }

    console.log("\n✨ All tests passed!");
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    if (error.cause) {
      console.error("Cause:", error.cause);
    }
    process.exit(1);
  }
}

testPayment();
