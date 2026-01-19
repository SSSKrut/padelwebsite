import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Home from "./pages/Home";
import Events from "./pages/Events";
import Corporate from "./pages/Corporate";
import Memberships from "./pages/Memberships";
import Merch from "./pages/Merch";
import Gallery from "./pages/Gallery";
import Contacts from "./pages/Contacts";
import Players from "./pages/Players";
import Impressum from "./pages/legal/Impressum";
import Privacy from "./pages/legal/Privacy";
import Terms from "./pages/legal/Terms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/corporate" element={<Corporate />} />
              <Route path="/memberships" element={<Memberships />} />
              <Route path="/merch" element={<Merch />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/players" element={<Players />} />
              <Route path="/legal/impressum" element={<Impressum />} />
              <Route path="/legal/privacy" element={<Privacy />} />
              <Route path="/legal/terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
