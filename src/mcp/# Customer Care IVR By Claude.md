# Customer Care IVR By Claude

**Description:** Inbound IVR: block check, VIP greeting, prepaid/postpaid/complaints/VAS/business-hours menus with agent routing.

**Default language:** en-US

**TTS Voice:** Jill

---

## Flow-scoped Variables

| Variable                       | Type   | Default                | Description                                                                                |
| ------------------------------ | ------ | ---------------------- | ------------------------------------------------------------------------------------------ |
| `Flow.isBlocked`               | Bool   | `false`                | STUB: true when the caller is on the block list. Set from an account-status Data Action.   |
| `Flow.isVIP`                   | Bool   | `false`                | STUB: true when the caller is a VIP customer. Set from a VIP-lookup Data Action.           |
| `Flow.hasComplaint`            | Bool   | `false`                | STUB: true when the caller has an open complaint. Set from a complaint-lookup Data Action. |
| `Flow.complaintResolutionDate` | String | `(pending assignment)` | STUB: expected resolution date for the caller's open complaint.                            |

## Tasks & Menus Overview

| Container                      | Type | # Elements |
| ------------------------------ | ---- | ---------- |
| Call Entry                     | Task | 8          |
| Complaints Handler             | Task | 6          |
| Business Hours and Locations   | Task | 3          |
| Prepaid - Top Up               | Task | 2          |
| Prepaid - Balance Inquiry      | Task | 2          |
| Prepaid - Product Subscription | Task | 2          |
| VAS - Unsubscribe All          | Task | 2          |
| Caller Main Menu               | Menu | 6 choices  |
| Prepaid Services               | Menu | 4 choices  |
| VAS Unsubscribe                | Menu | 2 choices  |

---

## Task: Call Entry

- **[Start] Call Data Action** (DataAction)
  - Data Action called: Get Caller information - Banner-V1 - Exported 2024-09-09 @ 17:41
  - **[] Check If Customer Blocked** (DecisionAction)
    - Condition: `GetAt(Task.user_type,0) == "blocked"`
    - **[Yes] Blocked Message** (PlayAudioAction)
      - TTS: "We are sorry, but we are unable to take your call at this time. Goodbye."
      - **[] End Blocked Call** (DisconnectAction)
        - Ends the call.
    - **[No] Check If VIP** (DecisionAction)
      - Condition: `GetAt(Task.user_type,0) == "VIP"`
      - **[Yes] VIP Welcome** (PlayAudioAction)
        - TTS: "Welcome back, valued V I P customer! It is our pleasure to assist you today."
        - **[] To Main Menu (VIP)** (TransferMenuAction)
          - Transfers execution to Menu: Caller Main Menu
      - **[No] To Main Menu** (TransferMenuAction)
        - Transfers execution to Menu: Caller Main Menu

---

## Task: Complaints Handler

- **[Start] Existing Complaint Found** (DecisionAction)
  - Condition: `Flow.hasComplaint == true`
  - **[Yes] Existing Complaint Status** (PlayAudioAction)
    - **[] Back to Main Menu** (TransferMenuAction)
      - Transfers execution to Menu: Caller Main Menu
  - **[No] No Complaint Found** (PlayAudioAction)
    - TTS: "We could not find any existing complaint on your account. Connecting you to an agent who can help."
    - **[] Transfer To Agent** (TransferPureMatchAction)
      - Transfers to Queue(s): Bazat_Queue
      - **[] Transfer Failed - Back to Main Menu** (TransferMenuAction)
        - Transfers execution to Menu: Caller Main Menu

---

## Task: Business Hours and Locations

- **[Start] Business Hours Details** (PlayAudioAction)
  - TTS: "Our branches are open Sunday through Thursday, from 9 A M to 5 P M, and are closed on Friday and Saturday. You can find your nearest branch on our website."
  - **[] SMS Confirmation** (PlayAudioAction)
    - TTS: "We have also sent you a text message with our full business hours and branch locations."
    - **[] Back to Main Menu** (TransferMenuAction)
      - Transfers execution to Menu: Caller Main Menu

---

## Task: Prepaid - Top Up

- **[Start] Top Up Info** (PlayAudioAction)
  - TTS: "To top up your balance, please follow the prompts on the next screen, or dial star 1 2 3 hash. Returning you to the menu."
  - **[] Back to Main Menu** (TransferMenuAction)
    - Transfers execution to Menu: Caller Main Menu

---

## Task: Prepaid - Balance Inquiry

- **[Start] Balance Inquiry Info** (PlayAudioAction)
  - TTS: "Your current balance will be sent to you by text message shortly. Returning you to the menu."
  - **[] Back to Main Menu** (TransferMenuAction)
    - Transfers execution to Menu: Caller Main Menu

---

## Task: Prepaid - Product Subscription

- **[Start] Product Subscription Info** (PlayAudioAction)
  - TTS: "You can view and manage your product subscriptions in our app. Returning you to the menu."
  - **[] Back to Main Menu** (TransferMenuAction)
    - Transfers execution to Menu: Caller Main Menu

---

## Task: VAS - Unsubscribe All

- **[Start] VAS Unsubscribe Confirmation** (PlayAudioAction)
  - TTS: "You have been unsubscribed from all value added services. A confirmation message will be sent to you shortly. Returning you to the menu."
  - **[] Back to Main Menu** (TransferMenuAction)
    - Transfers execution to Menu: Caller Main Menu

---

## Menu: Caller Main Menu

**Greeting TTS:** "Welcome to customer care. For prepaid services, press 1. For postpaid services, press 2. For complaints, press 3. To unsubscribe from value added services, press 4. For business hours and locations, press 5. To speak to an agent, press 6."

| Digit | Choice Name                  | Action Type             | Detail                                                                                   |
| ----- | ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| 1     | Prepaid Services             | MenuAction              | Jumps into Menu: Prepaid Services                                                        |
| 2     | Postpaid Services            | TransferPureMatchAction | TTS: "Connecting you to a postpaid specialist."<br>Transfers to Queue(s): Bazat_Queue    |
| 3     | Complaints                   | TransferTaskAction      | Transfers execution to Task: Complaints Handler                                          |
| 4     | VAS Unsubscribe              | MenuAction              | Jumps into Menu: VAS Unsubscribe                                                         |
| 5     | Business Hours and Locations | TransferTaskAction      | Transfers execution to Task: Business Hours and Locations                                |
| 6     | Speak To Agent               | TransferPureMatchAction | TTS: "Connecting you to the next available agent."<br>Transfers to Queue(s): Bazat_Queue |

---

## Menu: Prepaid Services

**Greeting TTS:** "Prepaid services. For top up, press 1. For balance inquiry, press 2. For product subscription, press 3. To speak to an agent, press 4."

| Digit | Choice Name          | Action Type             | Detail                                                                   |
| ----- | -------------------- | ----------------------- | ------------------------------------------------------------------------ |
| 1     | Top Up               | TransferTaskAction      | Transfers execution to Task: Prepaid - Top Up                            |
| 2     | Balance Inquiry      | TransferTaskAction      | Transfers execution to Task: Prepaid - Balance Inquiry                   |
| 3     | Product Subscription | TransferTaskAction      | Transfers execution to Task: Prepaid - Product Subscription              |
| 4     | Speak To Agent       | TransferPureMatchAction | TTS: "Connecting you to an agent."<br>Transfers to Queue(s): Bazat_Queue |

---

## Menu: VAS Unsubscribe

**Greeting TTS:** "Value added services. To unsubscribe from all value added services, press 1. To return to the main menu, press 2."

| Digit | Choice Name              | Action Type        | Detail                                             |
| ----- | ------------------------ | ------------------ | -------------------------------------------------- |
| 1     | Unsubscribe From All VAS | TransferTaskAction | Transfers execution to Task: VAS - Unsubscribe All |
| 2     | To Main Menu             | TransferMenuAction | Transfers execution to Menu: Caller Main Menu      |
