# Comprehensive Instructions for Building the Mars Credit Network DeFi Application

## Project Mission

The Mars Credit Network DeFi application is a web-based platform designed to facilitate interaction with a custom Ethereum-forked blockchain, enabling users to redeem MARS tokens through a token grant system. Hosted at `defi.marscredit.xyz`, the application aims to provide a seamless, engaging, and accessible user experience with a Mars-themed aesthetic. The primary features include wallet connectivity via MetaMask and Zerion, a token grant redemption interface, and a placeholder for a future bridge feature. The project emphasizes a public Git repository with structured documentation and a smart contract for managing token grants.

## Project Setup

### Environment Configuration
- **Node.js**: Install Node.js version 16 or higher to support Next.js 13.
- **Git**: Initialize a public Git repository to host the project code and documentation.
- **Truffle**: Install Truffle for smart contract development and deployment to the custom chain.
- **Dependencies**: Use npm to manage dependencies for both the frontend (Next.js) and smart contract development.
- **Custom Chain Configuration**: Configure the development environment to connect to the custom chain’s RPC endpoint and chain ID, ensuring compatibility with Ethereum Virtual Machine (EVM) standards.

### Project Structure
Create the following directory structure in the Git repository:
- `contracts/`: Store all smart contracts, including the token grant contract.
- `docs/cursor/rules/`: Store project rules and guidelines in markdown files.
- `docs/cursor/iterations/`: Store iteration documentation, with files named sequentially (e.g., `01-setup.md`, `02-smart-contract.md`).
- `app/`: Contain the Next.js application code, following its standard structure (e.g., `pages/`, `components/`, `styles/`).

### Documentation Guidelines
- **Rules**: Maintain a `rules.md` file in `docs/cursor/rules/` outlining coding standards, commit message formats, and project guidelines.
- **Iterations**: Document each development phase in `docs/cursor/iterations/`, creating a new markdown file for each major task (e.g., setup, smart contract development, frontend implementation).
- **Commit Messages**: Use descriptive commit messages (e.g., “Add token grant smart contract”, “Implement grants page UI”).
- **Public Repository**: Ensure all code and documentation are committed to the public repository, maintaining transparency.

## Smart Contract Development

### Token Grant Smart Contract
Develop a Solidity smart contract named `TokenGrant.sol` in the `contracts/` directory to manage the redemption of MARS tokens, the native asset of the custom chain. The contract should include:
- **Initialization**: Allow the contract owner to set the total MARS tokens available and the redemption amount per user.
- **Funding**: Enable the contract to receive MARS tokens during grant setup, ensuring sufficient balance for redemptions.
- **Redemption**: Allow users to redeem a fixed amount of MARS tokens once, on a first-come, first-serve basis, tracking redeemed addresses.
- **Security**: Implement checks to prevent double redemptions and ensure sufficient token balance before transfers.
- **Events**: Emit events for grant updates and successful redemptions to facilitate frontend integration.

### Deployment
- Deploy the contract to the custom chain using Truffle, connecting to the provided RPC endpoint.
- Fund the contract with MARS tokens during deployment or via a dedicated funding function.
- Verify the contract on the custom chain’s block explorer (if available) and store the contract address and ABI for frontend integration.

## Frontend Development with Next.js

### Framework and Tools
- **Next.js Version 13**: Use Next.js 13 for the frontend, leveraging its App Router for modern routing and server-side capabilities ([Next.js Documentation](https://nextjs.org/docs)).
- **Styling**: Implement a CSS solution (e.g., Tailwind CSS or CSS Modules) to apply the black and bright red color scheme, using CSS variables for theming.
- **Blockchain Integration**: Use ethers.js or web3.js to interact with the custom chain and smart contract, supporting MetaMask and Zerion wallets via Web3Modal or WalletConnect.
- **Animations**: Incorporate Mars-themed CSS animations (e.g., rotating Mars planet, moving stars) to enhance the UI.

### Design Principles
- **Color Scheme**: Use black as the primary background color and bright red for accents, text, and buttons.
- **Mars Theme**: Integrate Mars-related imagery (e.g., planet visuals, rovers) and animations to create an immersive experience.
- **Mobile-Friendly**: Ensure responsive design with media queries or a CSS framework, optimizing for mobile and desktop devices.
- **Accessibility**: Support screen readers and keyboard navigation, ensuring compatibility with MetaMask and Zerion wallets.

### Page Structure and User Flow

#### Navigation Menu
- **Location**: Display a fixed header with the logo on the left, navigation links in the center, and a wallet connection button on the right.
- **Links**: Include Home, Grants, Bridge, and Dashboard (optional).
- **Wallet Button**: Show “Connect Wallet” when disconnected, or a truncated wallet address (e.g., “0x123…abc”) when connected.
- **Responsive Design**: Collapse the menu into a hamburger icon on mobile devices.

#### Homepage
- **Hero Section**:
  - Display a prominent headline: “Welcome to Mars Credit Network”.
  - Include a subheading: “Redeem MARS tokens and explore DeFi on our custom blockchain”.
  - Feature a call-to-action (CTA) button: “Connect Wallet” or “Explore Grants”.
  - Add a Mars-themed animation (e.g., rotating planet) as a background or centerpiece.
- **Features Overview**:
  - Highlight key features: token grants, upcoming bridge, and wallet integration.
  - Use cards or sections with icons and brief descriptions.
- **Footer**:
  - Include links to social media, terms of service, and privacy policy.
  - Display a copyright notice and contact information.

#### Grants Page
- **List View**:
  - Display a list of all token grant smart contracts, stored in a JSON file or array (e.g., `grants.json` in the app).
  - For each grant, show:
    - Grant name or ID.
    - Total MARS tokens available.
    - Redemption amount per user.
    - Tokens remaining.
    - A “Redeem” or “View Details” button.
  - Use a card layout with rounded corners and hover effects.
- **User Flow**:
  - User navigates to the Grants page.
  - User views the list of grants and selects one to view details.
  - User is redirected to a grant detail page or a modal opens.

#### Grant Detail Page/Modal
- **Redemption Interface**:
  - Display the user’s wallet address (pre-filled if connected).
  - Show the redemption amount (e.g., “You can redeem 1 MARS”).
  - Show remaining tokens (e.g., “10,000 MARS left”).
  - Include a “Redeem” button, disabled if the user has already redeemed or no tokens remain.
  - Use a centered box with rounded corners, black background, and red accents.
- **User Flow**:
  - User clicks “Redeem”.
  - A confirmation dialog appears: “You are about to redeem 1 MARS. This will require a blockchain transaction.”
  - User confirms, triggering a transaction via their wallet.
  - Show a loading state during transaction processing.
  - Display a success message with the transaction hash or an error message if the transaction fails (e.g., “Grant fully redeemed”).
- **History**:
  - Optionally, show a section listing the user’s past redemptions with transaction hashes.

#### Bridge Page
- **Placeholder**:
  - Display a “Coming Soon” message: “Bridge feature is under development.”
  - Include a brief description: “Connect assets across chains with our upcoming bridge.”
  - Add a form (optional) for users to join a waitlist or receive updates.
- **User Flow**:
  - User navigates to the Bridge page via the navigation menu.
  - User views the placeholder content and can submit their email (if form is implemented).

#### Dashboard Page (Optional)
- **Overview**:
  - Display the user’s wallet balance (MARS tokens).
  - Show a transaction history or recent activity.
  - Include quick links to the Grants or Bridge pages.
- **User Flow**:
  - User navigates to the Dashboard after connecting their wallet.
  - User views their balance and activity, with options to explore other features.

### User Flow Summary
1. **Landing**: User visits `defi.marscredit.xyz` and sees the homepage with a CTA to connect their wallet.
2. **Wallet Connection**:
   - User clicks “Connect Wallet” and selects MetaMask or Zerion.
   - Wallet connects to the custom chain’s RPC endpoint.
   - Header updates to show the connected wallet address.
3. **Grants Exploration**:
   - User navigates to the Grants page.
   - User browses available grants and selects one.
   - User views details and initiates redemption.
4. **Redemption**:
   - User confirms the transaction in their wallet.
   - App shows transaction status and outcome.
5. **Bridge Preview**:
   - User visits the Bridge page and sees the “Coming Soon” message.
6. **Dashboard (Optional)**:
   - User views their balance and activity.

### Integration Requirements
- **Wallet Connectivity**: Use Web3Modal or WalletConnect to support MetaMask and Zerion, configuring the custom chain’s RPC endpoint and chain ID.
- **Smart Contract Interaction**: Fetch grant data (total tokens, redemption amount, remaining tokens) and call the redeem function using ethers.js or web3.js.
- **Error Handling**:
  - Display user-friendly error messages for failed transactions (e.g., “Insufficient tokens”, “Already redeemed”).
  - Handle network issues or wallet disconnections gracefully.
- **Loading States**: Show spinners or progress indicators during blockchain interactions.
- **Transaction Confirmation**: Provide transaction hashes for successful redemptions, linking to the custom chain’s block explorer (if available).

## Testing and Deployment

### Testing
- **Smart Contract**:
  - Test the token grant contract using Truffle and a local Ganache instance.
  - Verify funding, redemption, and security features (e.g., preventing double redemptions).
- **Frontend**:
  - Test the Next.js app locally with `npm run dev`.
  - Verify wallet connectivity, grant data display, and redemption flow.
  - Test responsiveness across mobile and desktop devices.
- **Integration**:
  - Test end-to-end flow on the custom chain’s testnet (if available).
  - Ensure MetaMask and Zerion wallets connect correctly.

### Deployment
- **Smart Contract**:
  - Deploy the contract to the custom chain’s mainnet using Truffle.
  - Fund the contract with MARS tokens.
- **Frontend**:
  - Deploy the Next.js app to a hosting service (e.g., Vercel, Netlify) at `defi.marscredit.xyz`.
  - Configure environment variables for the custom chain’s RPC and contract address.
- **Post-Deployment**:
  - Verify the app’s functionality on the live domain.
  - Monitor for errors and user feedback.

## Documentation and Iteration

### Iteration Documentation
- Create markdown files in `docs/cursor/iterations/` for each development phase:
  - `01-setup.md`: Environment setup and project structure.
  - `02-smart-contract.md`: Token grant contract development and deployment.
  - `03-frontend.md`: Next.js app development and UI implementation.
  - `04-integration.md`: Blockchain and wallet integration.
  - `05-testing-deployment.md`: Testing and deployment details.
- Include screenshots, code snippets (high-level), and notes on challenges or decisions.

### Rules and Guidelines
- Maintain `docs/cursor/rules/rules.md` with:
  - Coding standards (e.g., ESLint for JavaScript, Solidity style guide).
  - Commit message format (e.g., “feat: add grants page”, “fix: resolve wallet connection issue”).
  - Testing requirements (e.g., unit tests for smart contracts, UI tests for frontend).
- Update rules as the project evolves.

## Additional Considerations

- **Security**: Prioritize secure coding practices for the smart contract, including reentrancy guards and input validation.
- **Scalability**: Design the grants list to support multiple contracts, potentially using a registry contract or backend service in future iterations.
- **User Support**: Include tooltips or help text to guide users through blockchain interactions.
- **Analytics**: Optionally, integrate analytics (e.g., Google Analytics) to track user engagement, respecting privacy.

## Table: Page Structure Overview

| Page          | Key Components                              | User Actions                              |
|---------------|---------------------------------------------|-------------------------------------------|
| Homepage      | Hero section, features overview, footer     | Connect wallet, navigate to other pages   |
| Grants        | List of grants, card layout                 | View grants, select a grant               |
| Grant Detail  | Redemption interface, grant details         | Redeem tokens, view transaction status    |
| Bridge        | Coming soon message, optional waitlist form | View placeholder, submit email (optional) |
| Dashboard     | Wallet balance, transaction history         | View activity, navigate to other pages    |

## Table: User Flow Steps

| Step                  | Description                                      | Expected Outcome                          |
|-----------------------|--------------------------------------------------|-------------------------------------------|
| Landing               | User visits homepage                             | Sees hero section and CTA                 |
| Wallet Connection     | User connects MetaMask or Zerion wallet          | Wallet address displayed in header        |
| Grants Exploration    | User navigates to Grants page                    | Views list of available grants            |
| Grant Selection       | User selects a grant                             | Sees grant details and redemption option  |
| Redemption            | User initiates and confirms redemption           | Receives MARS tokens or error message     |
| Bridge Preview        | User visits Bridge page                          | Sees “Coming Soon” message                |
| Dashboard View        | User views balance and activity (optional)       | Sees wallet information                   |