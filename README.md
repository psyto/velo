## 📝 Global Urban Congestion Contract: Project Specification

This document outlines the detailed specifications for implementing the **Global Urban Congestion Contract (GUCC)**, a decentralized prediction market on the Solana blockchain.

The service aims to tokenize and trade predictions about future congestion levels in specific public spaces across major global cities, leveraging Solana's high throughput and low transaction costs.

---

## 1. Service Overview

The GUCC platform enables users to trade the predicted outcome of specific congestion events (e.g., traffic jams, public transport delays, tourist wait times) that have significant economic and social relevance.

## 2. Asset Definition: Congestion Event Contract (CEC)

The CEC is the core tradable asset, structured as a **Binary Prediction Contract** for a specific congestion event.

| Component | Detail |
| :--- | :--- |
| **Event Name** | Example: TOKYO-SHIBUYA-CROSSING-TRAFFIC-NOV25-8AM |
| **Underlying Question** | Example: "Will the pedestrian count at Shibuya Crossing on Monday, November 25, 2025, at 8 AM, exceed $30\%$ of the average count from the previous six weeks?" |
| **Contract Duration** | Typically 1 day to 1 week (Focus on short-term, high-frequency events) |
| **Tradable Tokens** | * **YES Token (CEC-Y)**: Settles to $1$ USDC if the prediction is true. |
| | * **NO Token (CEC-N)**: Settles to $1$ USDC if the prediction is false. |
| **Settlement Asset** | USDC (Solana SPL Token) |
| **Token Issuance** | Equal amounts of CEC-Y and CEC-N tokens are minted upon contract creation (AMM model). |

## 3. Smart Contract Specification (Solana Program)

### 3.1. Event Management Program

| Function | Description |
| :--- | :--- |
| **CreateEvent** | Creates a new CEC, specifying the question, settlement date, and Oracle ID. |
| **MintTokens** | Users deposit USDC and simultaneously mint corresponding CEC-Y and CEC-N tokens. |
| **Trade** | Allows users to swap CEC-Y and CEC-N tokens, facilitating price discovery (via AMM or Order Book). |
| **SettleEvent** | Receives the final result from the Oracle, halts trading, and determines the winning token ($1$ USDC) and losing token ($0$ USDC) values. |
| **Redeem** | Allows users to submit winning tokens and claim the underlying USDC collateral. |

### 3.2. Congestion Data Oracle Program (The Congestion Oracle)

This program is the technical backbone, leveraging Solana's performance to handle real-time geospatial data verification.

| Component | Detail |
| :--- | :--- |
| **Data Sources** | Aggregate data from multiple external sources: Google Maps Traffic API, Google Place API, 3rd-party traffic providers (e.g., TomTom), and Public Transit GTFS-RT feeds. |
| **Oracle Function** | Multiple independent oracle nodes fetch and sign data from the APIs, performing **aggregation** to ensure data consistency and accuracy. |
| **Data Fields** | `Location_ID`, `Timestamp`, `Measured_Value` (e.g., Travel Speed, Wait Time, Pedestrian Count), `Aggregation_Method` (e.g., Median, Weighted Average). |
| **Solana Integration** | The **high speed of Solana** is used to continuously stream verified congestion data to the on-chain program **every few minutes**, enabling real-time price adjustments throughout the contract's duration. |
| **Final Settlement** | At the settlement time, the smart contract accepts the **final measured result** from the oracle consensus to definitively resolve the contract outcome. |

## 4. Key Performance Indicators (KPIs) and Data Definitions

Specific, measurable definitions are essential for contract execution and oracle design.

| Space Type | Metric Definition (Oracle Data) | Example Contract |
| :--- | :--- | :--- |
| **Road Traffic** | **Average Travel Speed** or **Delay Index** (Utilizing Google Maps Traffic API data). | Will the average travel speed on a key highway section in London fall below $20 \text{km/h}$ at 9 AM next Tuesday? |
| **Public Transit** | **On-Time Performance (OTP) Rate** (Based on GTFS-RT) or **In-Vehicle Congestion Level**. | Will the on-time performance rate for a specific subway line in Paris drop below $95\%$ over the next week? |
| **Tourism/Retail** | **Wait Time** or **Real-Time Popularity Index** (Utilizing Google Place API data). | Will the estimated wait time at the New York Statue of Liberty ferry exceed $90$ minutes on the upcoming Saturday at 2 PM? |

## 5. User Interface (UI/UX) Requirements

* **Map-Based Interface:** Visualize tradable contracts on a global map, displaying real-time predicted congestion as a color-coded heatmap over the relevant location.
* **Real-Time Odds:** Display the current price (odds) of the CEC-Y token alongside the underlying oracle data (e.g., "Current Speed: $25 \text{km/h}$").
* **Quick Filtering:** Provide intuitive filtering for users to easily find contracts relevant to their daily lives (e.g., "My Commute," "Upcoming Trip").

## 6. Business Strategy

* **Initial Target:** Focus on major global cities with high-quality, publicly available data (or reliable API access), concentrating initially on **morning traffic congestion** and **peak tourist flow**.
* **Revenue Model:**
    1.  **Trading Fees:** Collect a small percentage fee on all CEC token swaps and trades.
    2.  **Hedging Services (B2B):** Offer customizable congestion contracts to B2B clients like logistics companies, event organizers, and travel insurers for risk management.
