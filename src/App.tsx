import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const Home = lazy(() => import("./pages/Home"));
const Events = lazy(() => import("./pages/Events"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const EventScore = lazy(() => import("./pages/EventScore"));
const EventMatches = lazy(() => import("./pages/EventMatches"));
const Corporate = lazy(() => import("./pages/Corporate"));
const Memberships = lazy(() => import("./pages/Memberships"));
const Merch = lazy(() => import("./pages/Merch"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Players = lazy(() => import("./pages/Players"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ResendVerification = lazy(() => import("./pages/ResendVerification"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const Impressum = lazy(() => import("./pages/legal/Impressum"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/events/:id/score" element={<EventScore />} />
                  <Route path="/events/:id/matches" element={<EventMatches />} />
                  <Route path="/events/:id" element={<EventDetails />} />
                  <Route path="/corporate" element={<Corporate />} />
                  <Route path="/memberships" element={<Memberships />} />
                  <Route path="/merch" element={<Merch />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/players" element={<Players />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/resend-verification" element={<ResendVerification />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/legal/impressum" element={<Impressum />} />
                  <Route path="/legal/privacy" element={<Privacy />} />
                  <Route path="/legal/terms" element={<Terms />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
