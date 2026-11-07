import { useEffect } from "react";
import { Play, Heart, Users, MapPin, Clock, Sparkles } from "lucide-react";
import video22 from '../../public/meetcutes.mp4'

export default function AboutSection() {
  useEffect(() => {
    const video = document.getElementById('myVideo');
    if (video) {
      video.currentTime = 0;
    }
  }, []);

  return (
    <>
      {/* Video and Content Section */}
      <section className="bg-linear-to-b from-card via-background to-card/50 border-y border-border/60 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-pink-500/20 rounded-full blur-xl"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24 md:px-8 lg:px-12 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 items-start max-w-7xl mx-auto">
            {/* Left - Video Section */}
            <div className="space-y-6 sm:space-y-8 hidden lg:block">
              <div className="bg-linear-to-br from-background to-card border border-border/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 group">
                <video 
                  id="myVideo"
                  className="w-full h-full object-cover aspect-video"
                  controls
                  poster="/professional-headshot-of-a-young-man-with-brown-ha.jpg"
                >
                  <source src={video22} type="video/mp4"/>
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-foreground">Growing</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Community</div>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
                  <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-foreground">Local</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Events Daily</div>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-foreground">Real</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Connections</div>
                </div>
              </div>
            </div>

            {/* Right - Content */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-serif font-bold bg-linear-to-r from-foreground to-primary bg-clip-text text-transparent"
                    style={{ fontFamily: "var(--font-playfair)" }}>
                  How MeetCutes Works
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Transform everyday activities into opportunities for meaningful connections
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-linear-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors duration-300">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Local Events</h3>
                      <div className="text-muted-foreground leading-relaxed">
                        Turn your shopping events into happenstances to meet someone.
                        People who are willing to be approached may schedule and/or
                        attend events in your area to find someone. Grocery
                        shopping/cloths shopping or any other.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-linear-to-r from-green-500/5 to-green-500/10 border border-green-500/20 rounded-2xl backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors duration-300">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Organic Connections</h3>
                      <div className="text-muted-foreground leading-relaxed">
                        Create events at local grocery stores/big box
                        stores/malls/coffee shops/parks. Others in the vicinity will be
                        notified. Make organic conversations and have your shot.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-linear-to-r from-blue-500/5 to-blue-500/10 border border-blue-500/20 rounded-2xl backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors duration-300">
                      <Heart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Real Relationships</h3>
                      <div className="text-muted-foreground leading-relaxed">
                        This app is an attempt to bring approachable people to a common
                        place. Attempt to make regular guy to be able to meet regular
                        girl in old fashioned way.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-linear-to-r from-purple-500/5 to-purple-500/10 border border-purple-500/20 rounded-2xl backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors duration-300">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Time Efficient</h3>
                      <div className="text-muted-foreground leading-relaxed">
                        This app is made for working class population in USA who have
                        little time to waste in the current dating scenarios.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
