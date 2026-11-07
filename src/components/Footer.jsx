import { Link } from "react-router-dom";
import { Heart, Mail, Phone, MapPin, Twitter, Instagram, Facebook, Youtube } from "lucide-react";
import { toast } from "sonner";

export default function Footer() {
  return (
    <footer className="bg-linear-to-b from-card via-card/80 to-background border-t border-border/60 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-pink-500/20 rounded-full blur-xl"></div>
      </div>

      <div className="container mx-auto px-6 py-16 md:px-8 lg:px-12 relative z-10">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <h3
                  className="text-2xl font-bold font-serif bg-linear-to-r from-primary to-foreground bg-clip-text text-transparent"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  MeetCutes
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Connecting singles in real life, one local event at a time.
                Find authentic connections at places you already love.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>hello@meetcutes.us</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Quick Links
            </h4>
            <nav className="flex flex-col space-y-3">
              <Link
                to="/about"
                className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium hover:translate-x-1 transform"
              >
                About Us
              </Link>
              <Link
                to="/contact"
                className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium hover:translate-x-1 transform"
              >
                Contact
              </Link>
              <Link
                to="/donate"
                className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium hover:translate-x-1 transform"
              >
                Support Us
              </Link>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Coming soon! Our Blog is currently under development.");
                }}
                className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium hover:translate-x-1 transform"
              >
                Blog
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-500" />
              Support
            </h4>
            <nav className="flex flex-col space-y-3">
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Coming soon! The Help Center is currently under development.");
                }}
                className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium hover:translate-x-1 transform"
              >
                Help Center
              </Link>
              <Link
                to="/privacy"
                className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium hover:translate-x-1 transform"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium hover:translate-x-1 transform"
              >
                Terms of Service
              </Link>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Coming soon! Safety Guidelines are currently under development.");
                }}
                className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium hover:translate-x-1 transform"
              >
                Safety Guidelines
              </Link>
            </nav>
          </div>

          {/* Connect */}
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Connect With Us
            </h4>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Join our community and stay updated with the latest features and events.
              </p>
              <div className="flex gap-3">
                <button className="p-3 bg-white/80 dark:bg-gray-800/80 hover:bg-primary/20 text-primary rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg backdrop-blur-sm border border-border/50">
                  <Facebook className="w-5 h-5" />
                </button>
                <button className="p-3 bg-white/80 dark:bg-gray-800/80 hover:bg-primary/20 text-primary rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg backdrop-blur-sm border border-border/50">
                  <Instagram className="w-5 h-5" />
                </button>
                <button className="p-3 bg-white/80 dark:bg-gray-800/80 hover:bg-primary/20 text-primary rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg backdrop-blur-sm border border-border/50">
                  <Twitter className="w-5 h-5" />
                </button>
                <button className="p-3 bg-white/80 dark:bg-gray-800/80 hover:bg-primary/20 text-primary rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg backdrop-blur-sm border border-border/50">
                  <Youtube className="w-5 h-5" />
                </button>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Follow us for dating tips, success stories, and community updates.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <p className="text-muted-foreground text-sm font-medium">
                © {new Date().getFullYear()} MeetCutes. All rights reserved. Made with ❤️ for authentic connections.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Coming soon! Security information is currently under development.");
                }}
                className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors duration-300"
              >
                Security
              </Link>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Coming soon! Accessibility details are currently under development.");
                }}
                className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors duration-300"
              >
                Accessibility
              </Link>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Coming soon! Careers information is currently under development.");
                }}
                className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors duration-300"
              >
                Careers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
