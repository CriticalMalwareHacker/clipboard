# 📋 Clipboard - Real-time Shared Clipboard

A modern, real-time clipboard sharing application that lets you instantly share text across devices and with others through shareable rooms. Built with cutting-edge web technologies and deployed on Google Cloud Run.

## ✨ Features

- **Quick Clipboard**: Copy, paste, and manage text instantly
- **Shared Rooms**: Create rooms with unique 6-character invite codes
- **Real-time Sync**: Changes sync instantly across all connected users
- **Easy Sharing**: Share via invite codes or direct links
- **Modern UI**: Clean, responsive interface built with shadcn/ui
- **Cloud-Native**: Fully Dockerized and optimized for Google Cloud Run

## 🚀 Tech Stack

### Frontend

- **[React 19](https://react.dev/)** - Latest React with modern features
- **[TanStack Router](https://tanstack.com/router)** - Type-safe file-based routing
- **[TanStack Start](https://tanstack.com/start)** - Full-stack React framework with Nitro
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - High-quality component library
- **[Lucide Icons](https://lucide.dev/)** - Beautiful icon set

### Backend & Database

- **[Convex](https://convex.dev/)** - Real-time backend with reactive queries
- **Real-time subscriptions** - Instant updates across all clients
- **Serverless database** - No infrastructure to manage

### Build & Tooling

- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety throughout
- **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager
- **[Vitest](https://vitest.dev/)** - Unit testing framework
- **[ESLint](https://eslint.org/)** & **[Prettier](https://prettier.io/)** - Code quality & formatting

### Deployment

- **Docker** - Multi-stage optimized builds
- **Google Cloud Run** - Serverless container deployment
- **Nitro** - Production-ready server with optimized bundling

## 📦 Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm 8 or later
- A Convex account ([sign up free](https://convex.dev/))

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd clipboard
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up Convex:

```bash
pnpx convex dev
```

This will guide you through creating a Convex project and generate your deployment URL.

4. Create a `.env.local` file:

```bash
VITE_CONVEX_URL=<your-convex-url>
```

### Development

Run both Convex and Vite dev servers concurrently:

```bash
pnpm dev:all
```

Or run them separately:

```bash
# Terminal 1 - Convex backend
pnpm dev:convex

# Terminal 2 - Vite frontend
pnpm dev
```

The app will be available at `http://localhost:3000`.

## 🏗️ Building For Production

Build the application:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

## 🐳 Docker Deployment

### Building the Docker Image

The Dockerfile uses a multi-stage build for optimal image size:

```bash
docker build \
  --build-arg VITE_CONVEX_URL=<your-convex-url> \
  -t clipboard-app .
```

### Running Locally with Docker

```bash
docker run -p 3000:3000 clipboard-app
```

### Deploying to Google Cloud Run

1. Build and push to Google Container Registry:

```bash
# Configure gcloud
gcloud config set project <your-project-id>

# Build and push
gcloud builds submit --tag gcr.io/<your-project-id>/clipboard

# Deploy to Cloud Run
gcloud run deploy clipboard \
  --image gcr.io/<your-project-id>/clipboard \
  --platform managed \
  --region <your-region> \
  --allow-unauthenticated \
  --set-env-vars VITE_CONVEX_URL=<your-convex-url>
```

2. Your app will be live at the URL provided by Cloud Run!

## 🧪 Testing

Run the test suite:

```bash
pnpm test
```

## 🎨 Code Quality

### Linting

```bash
pnpm lint
```

### Formatting

```bash
pnpm format
```

### Fix All Issues

```bash
pnpm check
```

## 📁 Project Structure

```
clipboard/
├── src/
│   ├── routes/           # TanStack Router file-based routes
│   │   ├── index.tsx     # Home page with local clipboard
│   │   └── room.$roomId.tsx  # Shared room page
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── shadcn-space/ # Custom UI components
│   ├── lib/             # Utility functions
│   └── router.tsx       # Router configuration
├── convex/              # Convex backend
│   ├── schema.ts        # Database schema
│   └── rooms.ts         # Room mutations & queries
├── public/              # Static assets
├── Dockerfile           # Multi-stage Docker build
└── vite.config.ts       # Vite configuration
```

## 🔧 Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes/`.

### Adding A Route

Create a new file in `./src/routes/` and TanStack Router will automatically generate the route.

## 🌟 How It Works

### Local Clipboard

- Visit the homepage to use a simple, client-side clipboard
- Copy, paste, and clear text instantly
- No account needed, data stays in your browser

### Shared Rooms

1. **Create a Room**: Click "Create Shared Room" on the homepage
2. **Get Your Code**: Receive a unique 6-character invite code (e.g., `ABC123`)
3. **Share**: Send the code or direct link to anyone
4. **Collaborate**: All users in the room see changes in real-time

### Real-time Synchronization

- Powered by Convex's reactive queries
- Changes sync instantly across all connected clients
- 300ms debounce to prevent excessive updates while typing
- Optimistic UI updates for smooth experience

## 🔒 Environment Variables

Create a `.env.local` file in the project root:

```bash
# Convex deployment URL
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

For production builds (Docker):

```bash
# Build-time variable (baked into the bundle)
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

## 📚 Architecture

### Database Schema

```typescript
rooms: {
  inviteCode: string // 6-char uppercase code
  content: string // shared clipboard text
  createdAt: number // timestamp
}
```

### Key Design Decisions

**Why Convex?**

- Real-time subscriptions out of the box
- Serverless, no infrastructure to manage
- Type-safe queries and mutations
- Automatic caching and reactivity

**Why TanStack Router?**

- File-based routing for better DX
- Type-safe navigation
- Built-in code splitting
- SEO-friendly with SSR support via TanStack Start

**Why Docker + Cloud Run?**

- Consistent builds across environments
- Easy horizontal scaling
- Pay-per-use pricing model
- Zero-downtime deployments
- Global CDN integration

**Why Nitro?**

- Optimized production builds
- Automatic tree-shaking
- Built-in caching layers
- Universal rendering support

## 🚀 Performance Optimizations

- **Multi-stage Docker Build**: Separates build and runtime dependencies for minimal image size
- **Vite Build**: Lightning-fast HMR in development, optimized chunks in production
- **Debounced Updates**: Prevents excessive backend calls while typing
- **Tailwind JIT**: Only includes CSS classes actually used in the app
- **Code Splitting**: Automatic route-based code splitting with TanStack Router

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Resources

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [Convex Documentation](https://docs.convex.dev/)
- [Google Cloud Run Docs](https://cloud.google.com/run/docs)
- [Vite Documentation](https://vitejs.dev/)
- [shadcn/ui](https://ui.shadcn.com/)

---

Built with ❤️ using modern web technologies
