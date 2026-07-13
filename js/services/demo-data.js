export const STARTING_DEMO_BALANCE = 25000;

const now = () => new Date().toISOString();

export function createSeedState() {
  const createdAt = now();

  const profiles = [
    {
      id: "usr_customer_ava",
      full_name: "Ava Rahman",
      email: "ava.customer@nexapay.test",
      phone: "01710000001",
      role: "customer",
      account_status: "active",
      avatar_url: "",
      created_at: createdAt,
      updated_at: createdAt
    },
    {
      id: "usr_customer_sami",
      full_name: "Sami Karim",
      email: "sami.customer@nexapay.test",
      phone: "01710000002",
      role: "customer",
      account_status: "active",
      avatar_url: "",
      created_at: createdAt,
      updated_at: createdAt
    },
    {
      id: "usr_customer_nova",
      full_name: "Nova Islam",
      email: "nova.customer@nexapay.test",
      phone: "01710000003",
      role: "customer",
      account_status: "active",
      avatar_url: "",
      created_at: createdAt,
      updated_at: createdAt
    },
    {
      id: "usr_customer_iman",
      full_name: "Iman Sarker",
      email: "iman.customer@nexapay.test",
      phone: "01710000004",
      role: "customer",
      account_status: "active",
      avatar_url: "",
      created_at: createdAt,
      updated_at: createdAt
    },
    {
      id: "usr_merchant_orion",
      full_name: "Orion Mart Owner",
      email: "merchant@nexapay.test",
      phone: "01710000011",
      role: "merchant",
      account_status: "active",
      avatar_url: "",
      created_at: createdAt,
      updated_at: createdAt
    },
    {
      id: "usr_merchant_lumen",
      full_name: "Lumen Cafe Owner",
      email: "lumen@nexapay.test",
      phone: "01710000012",
      role: "merchant",
      account_status: "active",
      avatar_url: "",
      created_at: createdAt,
      updated_at: createdAt
    },
    {
      id: "usr_agent_mira",
      full_name: "Mira Chowdhury",
      email: "agent@nexapay.test",
      phone: "01710000021",
      role: "agent",
      account_status: "active",
      avatar_url: "",
      created_at: createdAt,
      updated_at: createdAt
    },
    {
      id: "usr_agent_rafi",
      full_name: "Rafi Hasan",
      email: "rafi.agent@nexapay.test",
      phone: "01710000022",
      role: "agent",
      account_status: "active",
      avatar_url: "",
      created_at: createdAt,
      updated_at: createdAt
    },
    {
      id: "usr_admin_zara",
      full_name: "Zara Admin",
      email: "admin@nexapay.test",
      phone: "01710000099",
      role: "admin",
      account_status: "active",
      avatar_url: "",
      created_at: createdAt,
      updated_at: createdAt
    },
    {
      id: "usr_system",
      full_name: "NexaPay Demo Clearing",
      email: "system@nexapay.test",
      phone: "00000000000",
      role: "system",
      account_status: "active",
      avatar_url: "",
      created_at: createdAt,
      updated_at: createdAt
    }
  ];

  const wallets = profiles.map((profile) => ({
    id: `wlt_${profile.id.replace("usr_", "")}`,
    user_id: profile.id,
    balance:
      profile.role === "admin" ? 0 :
      profile.role === "system" ? 1000000 :
      profile.role === "merchant" ? 74000 :
      profile.role === "agent" ? 90000 :
      STARTING_DEMO_BALANCE,
    currency: "BDT_DEMO",
    status: "active",
    created_at: createdAt,
    updated_at: createdAt
  }));

  const merchants = [
    {
      id: "mrc_orion",
      owner_id: "usr_merchant_orion",
      business_name: "Orion Mart",
      category: "Grocery",
      merchant_code: "NPM-1001",
      qr_identifier: "NEXAPAY:MERCHANT:NPM-1001",
      status: "active",
      created_at: createdAt
    },
    {
      id: "mrc_lumen",
      owner_id: "usr_merchant_lumen",
      business_name: "Lumen Cafe",
      category: "Food",
      merchant_code: "NPM-1002",
      qr_identifier: "NEXAPAY:MERCHANT:NPM-1002",
      status: "active",
      created_at: createdAt
    }
  ];

  const agents = [
    {
      id: "agt_mira",
      user_id: "usr_agent_mira",
      agent_code: "NPA-2001",
      location: "Banani Demo Point",
      status: "active",
      created_at: createdAt
    },
    {
      id: "agt_rafi",
      user_id: "usr_agent_rafi",
      agent_code: "NPA-2002",
      location: "Dhanmondi Demo Booth",
      status: "active",
      created_at: createdAt
    }
  ];

  const transactions = [
    {
      id: "tx_seed_1",
      transaction_id: "NXP-DEMO-1001",
      transaction_type: "add_money",
      sender_wallet_id: null,
      receiver_wallet_id: "wlt_customer_ava",
      sender_id: null,
      receiver_id: "usr_customer_ava",
      amount: 5000,
      fee: 0,
      total_amount: 5000,
      status: "completed",
      reference: "Demo balance faucet",
      metadata: { source: "Demo Balance Faucet" },
      idempotency_key: "seed-add-1",
      created_at: createdAt
    },
    {
      id: "tx_seed_2",
      transaction_id: "NXP-DEMO-1002",
      transaction_type: "merchant_payment",
      sender_wallet_id: "wlt_customer_ava",
      receiver_wallet_id: "wlt_merchant_orion",
      sender_id: "usr_customer_ava",
      receiver_id: "usr_merchant_orion",
      amount: 850,
      fee: 0,
      total_amount: 850,
      status: "completed",
      reference: "Groceries",
      metadata: { merchant_name: "Orion Mart" },
      idempotency_key: "seed-pay-1",
      created_at: createdAt
    },
    {
      id: "tx_seed_3",
      transaction_id: "NXP-DEMO-1003",
      transaction_type: "send_money",
      sender_wallet_id: "wlt_customer_sami",
      receiver_wallet_id: "wlt_customer_ava",
      sender_id: "usr_customer_sami",
      receiver_id: "usr_customer_ava",
      amount: 1200,
      fee: 5,
      total_amount: 1205,
      status: "completed",
      reference: "Project dinner",
      metadata: {},
      idempotency_key: "seed-send-1",
      created_at: createdAt
    },
    {
      id: "tx_seed_4",
      transaction_id: "NXP-DEMO-1004",
      transaction_type: "recharge",
      sender_wallet_id: "wlt_customer_ava",
      receiver_wallet_id: null,
      sender_id: "usr_customer_ava",
      receiver_id: null,
      amount: 200,
      fee: 0,
      total_amount: 200,
      status: "completed",
      reference: "DemoTel prepaid",
      metadata: { operator: "DemoTel", phone: "01710000001" },
      idempotency_key: "seed-recharge-1",
      created_at: createdAt
    },
    {
      id: "tx_seed_5",
      transaction_id: "NXP-DEMO-1005",
      transaction_type: "bill_payment",
      sender_wallet_id: "wlt_customer_ava",
      receiver_wallet_id: null,
      sender_id: "usr_customer_ava",
      receiver_id: null,
      amount: 1450,
      fee: 0,
      total_amount: 1450,
      status: "completed",
      reference: "LumenGrid Demo Power",
      metadata: { category: "Electricity", account_number: "DEMO-44521" },
      idempotency_key: "seed-bill-1",
      created_at: createdAt
    },
    {
      id: "tx_seed_6",
      transaction_id: "NXP-DEMO-1006",
      transaction_type: "send_money",
      sender_wallet_id: "wlt_customer_ava",
      receiver_wallet_id: "wlt_customer_nova",
      sender_id: "usr_customer_ava",
      receiver_id: "usr_customer_nova",
      amount: 650,
      fee: 7,
      total_amount: 657,
      status: "completed",
      reference: "Study notes",
      metadata: {},
      idempotency_key: "seed-send-2",
      created_at: createdAt
    },
    {
      id: "tx_seed_7",
      transaction_id: "NXP-DEMO-1007",
      transaction_type: "request_money",
      sender_wallet_id: "wlt_customer_ava",
      receiver_wallet_id: "wlt_customer_iman",
      sender_id: "usr_customer_ava",
      receiver_id: "usr_customer_iman",
      amount: 300,
      fee: 0,
      total_amount: 300,
      status: "pending",
      reference: "Pending demo request",
      metadata: { sender_name: "Ava Rahman", receiver_name: "Iman Sarker" },
      idempotency_key: "seed-pending-1",
      created_at: createdAt
    },
    {
      id: "tx_seed_8",
      transaction_id: "NXP-DEMO-1008",
      transaction_type: "recharge",
      sender_wallet_id: "wlt_customer_ava",
      receiver_wallet_id: null,
      sender_id: "usr_customer_ava",
      receiver_id: null,
      amount: 50,
      fee: 0,
      total_amount: 50,
      status: "failed",
      reference: "Failed demo recharge",
      metadata: { operator_name: "Wave Telecom", phone: "01710000001", failure_reason: "Simulated provider timeout" },
      idempotency_key: "seed-failed-1",
      created_at: createdAt
    }
  ];

  return {
    version: 1,
    profiles,
    wallets,
    transactions,
    money_requests: [
      {
        id: "req_seed_1",
        sender_id: "usr_customer_ava",
        receiver_id: "usr_customer_sami",
        amount: 450,
        note: "Shared transport demo request",
        status: "pending",
        created_at: createdAt,
        updated_at: createdAt
      }
    ],
    favorites: [
      { id: "fav_1", user_id: "usr_customer_ava", favorite_user_id: "usr_customer_sami", created_at: createdAt },
      { id: "fav_2", user_id: "usr_customer_ava", favorite_user_id: "usr_merchant_orion", created_at: createdAt },
      { id: "fav_3", user_id: "usr_customer_ava", favorite_user_id: "usr_customer_nova", created_at: createdAt },
      { id: "fav_4", user_id: "usr_customer_ava", favorite_user_id: "usr_customer_iman", created_at: createdAt }
    ],
    merchants,
    agents,
    recharge_operators: [
      { id: "opr_demotel", name: "DemoTel", logo_url: "", status: "active" },
      { id: "opr_nova", name: "Nova Mobile", logo_url: "", status: "active" },
      { id: "opr_connectx", name: "ConnectX", logo_url: "", status: "active" },
      { id: "opr_wave", name: "Wave Telecom", logo_url: "", status: "active" }
    ],
    bill_categories: [
      { id: "cat_electricity", name: "Electricity", icon: "bill", status: "active" },
      { id: "cat_gas", name: "Gas", icon: "bill", status: "active" },
      { id: "cat_water", name: "Water", icon: "bill", status: "active" },
      { id: "cat_internet", name: "Internet", icon: "bill", status: "active" },
      { id: "cat_education", name: "Education", icon: "bill", status: "active" },
      { id: "cat_tv", name: "TV", icon: "bill", status: "active" },
      { id: "cat_other", name: "Other", icon: "bill", status: "active" }
    ],
    bill_providers: [
      { id: "bp_lumengrid", category_id: "cat_electricity", name: "LumenGrid Demo Power", logo_url: "", status: "active" },
      { id: "bp_hearthgas", category_id: "cat_gas", name: "HearthGas Demo Network", logo_url: "", status: "active" },
      { id: "bp_bluewater", category_id: "cat_water", name: "BlueWater Demo Utility", logo_url: "", status: "active" },
      { id: "bp_fiberlane", category_id: "cat_internet", name: "FiberLane Demo Internet", logo_url: "", status: "active" },
      { id: "bp_studybridge", category_id: "cat_education", name: "StudyBridge Demo School", logo_url: "", status: "active" },
      { id: "bp_prismcast", category_id: "cat_tv", name: "PrismCast Demo TV", logo_url: "", status: "active" },
      { id: "bp_civicpay", category_id: "cat_other", name: "CivicPay Demo Services", logo_url: "", status: "active" }
    ],
    savings_goals: [
      {
        id: "svg_laptop",
        user_id: "usr_customer_ava",
        title: "New Laptop",
        target_amount: 100000,
        current_amount: 35000,
        target_date: "2026-12-31",
        status: "active",
        created_at: createdAt
      }
    ],
    savings_goal_entries: [
      {
        id: "sge_laptop_opening",
        goal_id: "svg_laptop",
        transaction_id: null,
        entry_type: "deposit",
        amount: 35000,
        note: "Opening demo savings balance",
        created_at: createdAt
      }
    ],
    notifications: [
      {
        id: "ntf_1",
        user_id: "usr_customer_ava",
        title: "Demo money received",
        message: "Sami Karim sent you ৳1,200 in NexaPay demo currency.",
        type: "money_received",
        is_read: false,
        created_at: createdAt
      },
      {
        id: "ntf_2",
        user_id: "usr_customer_ava",
        title: "Educational demo active",
        message: "No real money, cards, banks, or payment networks are connected.",
        type: "admin_announcement",
        is_read: false,
        created_at: createdAt
      },
      {
        id: "ntf_3",
        user_id: "usr_customer_ava",
        title: "Demo bill completed",
        message: "Your LumenGrid fictional bill payment receipt is ready.",
        type: "bill_payment_completed",
        is_read: true,
        created_at: createdAt
      },
      {
        id: "ntf_4",
        user_id: "usr_customer_ava",
        title: "Savings progress updated",
        message: "New Laptop is 35% funded with demo savings.",
        type: "payment_completed",
        is_read: false,
        created_at: createdAt
      }
    ],
    promotions: [
      {
        id: "prm_1",
        title: "Practice safe demo transfers",
        description: "Try Send Money with fictional users and receipts.",
        image_url: "",
        link: "pages/customer/send-money.html",
        status: "active",
        start_date: "2026-01-01",
        end_date: "2026-12-31"
      },
      {
        id: "prm_2",
        title: "Build confidence with demo bills",
        description: "Explore recharge, bill payment, and bank transfer without real providers.",
        image_url: "",
        link: "pages/customer/bills.html",
        status: "active",
        start_date: "2026-01-01",
        end_date: "2026-12-31"
      }
    ],
    donation_organizations: [
      { id: "don_learning", name: "Future Learners Fund", description: "Fictional demo education fund", status: "active" },
      { id: "don_green", name: "Green Steps Collective", description: "Fictional demo environment group", status: "active" },
      { id: "don_health", name: "Open Care Mission", description: "Fictional demo health support", status: "active" }
    ],
    banks: [
      { id: "bnk_nova", name: "Nova Bank", status: "active" },
      { id: "bnk_horizon", name: "Horizon Bank", status: "active" },
      { id: "bnk_unity", name: "Unity Bank", status: "active" }
    ],
    system_settings: [
      { key: "starting_demo_balance", value: { amount: STARTING_DEMO_BALANCE }, updated_at: createdAt },
      { key: "max_demo_transaction_amount", value: { amount: 100000 }, updated_at: createdAt }
    ],
    audit_logs: [
      {
        id: "aud_seed_1",
        actor_id: "usr_admin_zara",
        action: "seed_demo_data",
        entity_type: "system",
        entity_id: "demo",
        metadata: { note: "Initial NexaPay demo data" },
        created_at: createdAt
      }
    ]
  };
}
