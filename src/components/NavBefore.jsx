import { Suspense, lazy, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Menu, X } from "lucide-react";

const Login = lazy(() =>
  import("@/pages/auth/Login").then((module) => ({ default: module.Login })),
);
const Signup = lazy(() =>
  import("@/pages/auth/Signup").then((module) => ({ default: module.Signup })),
);

const AuthDialogFallback = () => (
  <div className="p-6 text-sm text-muted-foreground">Loading...</div>
);

const NavBefore = ({ openLogin, setOpenLogin, openSignup, setOpenSignup }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto relative flex h-16 items-center px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <img src="/mc-48-orange2.png" alt="Logo" className="h-10 w-10" />
            <span className="text-4xl font-normal tracking-wider bg-linear-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent font-['Bebas_Neue']">
              MeetCutes.us
            </span>
          </div>
        </Link>

        <nav className="absolute left-1/2 transform -translate-x-1/2 hidden items-center gap-6 lg:flex">
          <Link
            to="/about"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            About
          </Link>
          <Link
            to="/contact"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Contact
          </Link>
          <Link
            to="/donate"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Donate
          </Link>
        </nav>

        <div className="items-center gap-3 hidden lg:flex ml-auto">
          <Dialog open={openLogin} onOpenChange={setOpenLogin}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setOpenLogin(true)}
                variant="ghost"
              >
                Login
              </Button>
            </DialogTrigger>
            {openLogin && (
              <Suspense fallback={<AuthDialogFallback />}>
                <Login setOpenLogin={setOpenLogin} setOpenSignup={setOpenSignup} />
              </Suspense>
            )}
          </Dialog>
          <Dialog open={openSignup} onOpenChange={setOpenSignup}>
            <DialogTrigger asChild>
              <Button>Signup</Button>
            </DialogTrigger>
            {openSignup && (
              <Suspense fallback={<AuthDialogFallback />}>
                <Signup setOpenSignup={setOpenSignup} setOpenLogin={setOpenLogin} />
              </Suspense>
            )}
          </Dialog>
        </div>

        {/* Mobile menu */}
        <div className="flex items-center gap-2 ml-auto lg:hidden">
          <div className="p-2 hover:bg-muted rounded-lg transition-colors">
            <button
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="w-5 h-5 text-muted-foreground" />}
            </button>
          </div>
        </div>

      </div>
      
      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/about" className="block px-3 py-2 text-muted-foreground hover:text-foreground" onClick={() => setIsMenuOpen(false)}>
              About
            </Link>
            <Link to="/contact" className="block px-3 py-2 text-muted-foreground hover:text-foreground" onClick={() => setIsMenuOpen(false)}>
              Contact
            </Link>
            <Link to="/donate" className="block px-3 py-2 text-muted-foreground hover:text-foreground" onClick={() => setIsMenuOpen(false)}>
              Donate
            </Link>
            <div className="flex space-x-2 px-3 pt-2">
              <Button variant="ghost" size="sm" className="flex-1"
                onClick={() => {
                  setOpenLogin(true);
                  setIsMenuOpen(false);
                }}
              >
                Login
              </Button>

              <Dialog open={openSignup} onOpenChange={setOpenSignup}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1"
                  onClick={() => {
                    setOpenSignup(true);
                    setIsMenuOpen(false);
                  }}
                >
                  Signup
                </Button>
              </DialogTrigger>
              {openSignup && (
                <Suspense fallback={<AuthDialogFallback />}>
                  <Signup setOpenSignup={setOpenSignup} setOpenLogin={setOpenLogin} />
                </Suspense>
              )}
            </Dialog>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBefore;
