import { MapPin, ShoppingBag, Coffee, Heart } from "lucide-react";

export function PopularLocations() {
  const locations = [
    { name: "Home Depot", logo: "/locations/home-depot.png", category: "shopping" },
    { name: "Target", logo: "/locations/target.png", category: "shopping" },
    { name: "H-E-B", logo: "/locations/heb.png", category: "grocery" },
    { name: "Walmart", logo: "/locations/walmart.png", category: "shopping" },
    { name: "Costco", logo: "/locations/costco.png", category: "shopping" },
    { name: "Trader Joes", logo: "/locations/trader-joes.png", category: "grocery" },
    { name: "Whole Foods", logo: "/locations/whole-foods.png", category: "grocery" },
    { name: "Ross", logo: "/locations/ross.png", category: "shopping" },
    { name: "Kohls", logo: "/locations/kohls.png", category: "shopping" },
    { name: "Starbucks", logo: "/generic-coffee-logo.png", category: "coffee" },
    { name: "Winco", logo: "/locations/winco-foods.png", category: "grocery" },
    { name: "Lowes", logo: "/locations/lowes.png", category: "shopping" },
    { name: "Kroger", logo: "/locations/Kroger.png", category: "grocery" },
    { name: "Aldi", logo: "/locations/aldi.png", category: "grocery" },
    { name: "IKEA", logo: "/locations/Ikea.png", category: "shopping" },
  ];

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'coffee':
        return <Coffee className="w-4 h-4 text-amber-600" />;
      case 'grocery':
        return <ShoppingBag className="w-4 h-4 text-green-600" />;
      default:
        return <MapPin className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <section className="bg-linear-to-b from-background via-card/30 to-background border-y border-border/60 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 md:px-8 lg:px-12 relative z-10">
        <div className="text-center space-y-4 sm:space-y-6 mb-12 sm:mb-16">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-full">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold bg-linear-to-r from-foreground to-primary bg-clip-text text-transparent"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Popular Locations
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Meet at the places you already visit every day. From grocery stores to coffee shops,
            find connections in familiar surroundings.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
          {locations.map((location, index) => (
            <div
              key={location.name}
              className="group flex flex-col items-center justify-center p-6 sm:p-8 bg-white/80 dark:bg-gray-800/80 border border-border/60 rounded-xl sm:rounded-2xl hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-500 hover:scale-105 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-muted/50 rounded-lg group-hover:bg-primary/10 transition-colors duration-300">
                  {getCategoryIcon(location.category)}
                </div>
              </div>
              <img
                src={location.logo || "/placeholder.svg"}
                alt={location.name}
                className="max-w-full h-10 sm:h-12 object-contain opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 mb-2 sm:mb-3"
              />
              <span className="text-xs sm:text-sm font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors duration-300 leading-tight">
                {location.name}
              </span>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12 sm:mt-16">
          <div className="bg-linear-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto backdrop-blur-sm">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">Ready to Meet Someone Special?</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              {/* Join thousands of singles who are finding real connections at places they already love */}
              Start your journey to real connections at places you already love.
            </p>
            <div className="flex items-center justify-center gap-2 text-primary font-medium">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Events happening near you right now</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
