const axios = require("axios");

class PaystackService {
  constructor() {
    this.baseURL = "https://api.paystack.co";
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!this.secretKey) {
      console.warn("PAYSTACK_SECRET_KEY not found in environment variables");
    }
  }

  // Nigerian Banks List
  getBanksList() {
    return [
      { name: "Access Bank", code: "044" },
      { name: "Access Bank (Diamond)", code: "063" },
      { name: "ALAT by WEMA", code: "035A" },
      { name: "ASO Savings and Loans", code: "401" },
      { name: "Bowen Microfinance Bank", code: "50931" },
      { name: "CEMCS Microfinance Bank", code: "50823" },
      { name: "Citibank Nigeria", code: "023" },
      { name: "Ecobank Nigeria", code: "050" },
      { name: "Ekondo Microfinance Bank", code: "562" },
      { name: "Fidelity Bank", code: "070" },
      { name: "First Bank of Nigeria", code: "011" },
      { name: "First City Monument Bank", code: "214" },
      { name: "FSDH Merchant Bank Limited", code: "501" },
      { name: "Globus Bank", code: "00103" },
      { name: "Guaranty Trust Bank", code: "058" },
      { name: "Heritage Bank", code: "030" },
      { name: "Jaiz Bank", code: "301" },
      { name: "Keystone Bank", code: "082" },
      { name: "Kuda Bank", code: "50211" },
      { name: "Lagos Building Investment Company Plc.", code: "90052" },
      { name: "Mint MFB", code: "50515" },
      { name: "One Finance", code: "565" },
      { name: "Parallex Bank", code: "526" },
      { name: "Polaris Bank", code: "076" },
      { name: "Providus Bank", code: "101" },
      { name: "Rubies MFB", code: "125" },
      { name: "Sparkle Microfinance Bank", code: "51310" },
      { name: "Stanbic IBTC Bank", code: "221" },
      { name: "Standard Chartered Bank", code: "068" },
      { name: "Sterling Bank", code: "232" },
      { name: "Suntrust Bank", code: "100" },
      { name: "TAJ Bank", code: "302" },
      { name: "Titan Bank", code: "102" },
      { name: "Union Bank of Nigeria", code: "032" },
      { name: "United Bank For Africa", code: "033" },
      { name: "Unity Bank", code: "215" },
      { name: "VFD Microfinance Bank Limited", code: "566" },
      { name: "Wema Bank", code: "035" },
      { name: "Zenith Bank", code: "057" },
    ];
  }

  // Get bank name by code
  getBankNameByCode(bankCode) {
    const bank = this.getBanksList().find((bank) => bank.code === bankCode);
    return bank ? bank.name : null;
  }

  // Verify bank account with Paystack
  async verifyBankAccount(accountNumber, bankCode) {
    try {
      if (!this.secretKey) {
        throw new Error("Paystack secret key not configured");
      }

      // Clean account number (remove spaces, dashes)
      const cleanAccountNumber = accountNumber.replace(/[\s-]/g, "");

      // Validate account number format
      if (!/^\d{10}$/.test(cleanAccountNumber)) {
        return {
          success: false,
          message: "Account number must be exactly 10 digits",
        };
      }

      const response = await axios.get(
        `${this.baseURL}/bank/resolve?account_number=${cleanAccountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (response.data.status === true && response.data.data) {
        const bankName = this.getBankNameByCode(bankCode);

        return {
          success: true,
          data: {
            accountName: response.data.data.account_name,
            accountNumber: cleanAccountNumber,
            bankName:
              bankName || response.data.data.bank_name || "Unknown Bank",
            bankCode: bankCode,
          },
        };
      } else {
        return {
          success: false,
          message: "Could not verify account details",
        };
      }
    } catch (error) {
      console.error("Paystack verification error:", error.message);

      // Handle specific error cases
      if (error.response) {
        const { status, data } = error.response;

        if (status === 422) {
          return {
            success: false,
            message: "Invalid account number or bank code",
          };
        }

        if (status === 400) {
          return {
            success: false,
            message: data.message || "Invalid request parameters",
          };
        }

        if (status === 401) {
          return {
            success: false,
            message: "Authentication failed - invalid API key",
          };
        }
      }

      if (error.code === "ECONNABORTED") {
        return {
          success: false,
          message: "Verification request timed out. Please try again.",
        };
      }

      return {
        success: false,
        message: "Verification service temporarily unavailable",
      };
    }
  }

  // Create transfer recipient (for future payments)
  async createTransferRecipient(accountName, accountNumber, bankCode) {
    try {
      if (!this.secretKey) {
        throw new Error("Paystack secret key not configured");
      }

      const response = await axios.post(
        `${this.baseURL}/transferrecipient`,
        {
          type: "nuban",
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: "NGN",
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (response.data.status === true && response.data.data) {
        return {
          success: true,
          recipientCode: response.data.data.recipient_code,
        };
      } else {
        return {
          success: false,
          message: "Failed to create transfer recipient",
        };
      }
    } catch (error) {
      console.error("Create recipient error:", error.message);
      return {
        success: false,
        message: "Failed to create transfer recipient",
      };
    }
  }

  // Validate bank code
  isValidBankCode(bankCode) {
    return this.getBanksList().some((bank) => bank.code === bankCode);
  }

  // Format account number display
  formatAccountNumber(accountNumber) {
    if (!accountNumber) return "";
    const clean = accountNumber.replace(/\D/g, "");
    return clean.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
  }
}

module.exports = new PaystackService();
