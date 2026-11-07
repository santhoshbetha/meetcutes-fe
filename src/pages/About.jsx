import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Calendar, Shield, Star, MapPin, Coffee, Sparkles } from "lucide-react";

export function About() {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Heart className="w-4 h-4" />
            Welcome to MeetCutes
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Where Meaningful Connections Begin
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            A revolutionary platform that brings people together through authentic, organic interactions
            at local events and venues.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Organic Connections</h3>
              <p className="text-sm text-muted-foreground">Meet people naturally at local events</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Event-Based</h3>
              <p className="text-sm text-muted-foreground">Schedule meetups at cafes, parks, and stores</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Verified Profiles</h3>
              <p className="text-sm text-muted-foreground">Connect with genuine, like-minded people</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Quality Focused</h3>
              <p className="text-sm text-muted-foreground">For serious relationships and meaningful connections</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* What is MeetCutes */}
          <Card className="shadow-xl border-0 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl md:text-3xl text-blue-900 dark:text-blue-100">
                What is MeetCutes?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-blue-900/90 dark:text-blue-100/90 leading-relaxed">
                    MeetCutes is a revolutionary platform designed to help people form genuine, meaningful connections
                    through organic, real-world interactions. We're tired of the endless messaging and superficial swiping
                    that dominates modern dating apps.
                  </p>
                  <p className="text-blue-900/90 dark:text-blue-100/90 leading-relaxed">
                    Instead, we bring people together at local events, grocery stores, coffee shops, parks, and community venues where
                    authentic conversations can naturally unfold. No more wasted time - just real connections with people
                    who share your values and intentions.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Local Events</h4>
                      <p className="text-sm text-blue-900/80 dark:text-blue-100/80">Find and create events in your area</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Coffee className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Natural Settings</h4>
                      <p className="text-sm text-blue-900/80 dark:text-blue-100/80">Meet at cafes, parks, and community spaces</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Verified Community</h4>
                      <p className="text-sm text-blue-900/80 dark:text-blue-100/80">Connect with genuine, like-minded people</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How it Works */}
          <Card className="shadow-xl border-0 bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-2xl md:text-3xl text-amber-900 dark:text-amber-100">
                How MeetCutes Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-amber-200 dark:bg-amber-800/50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-amber-800 dark:text-amber-200 font-bold">1</span>
                  </div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">Create Your Profile</h4>
                  <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
                    Set up your profile with basic information and preferences
                  </p>
                </div>

                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-amber-200 dark:bg-amber-800/50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-amber-800 dark:text-amber-200 font-bold">2</span>
                  </div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">Find Local Events</h4>
                  <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
                    Discover events in your area or create your own meetup
                  </p>
                </div>

                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-amber-200 dark:bg-amber-800/50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-amber-800 dark:text-amber-200 font-bold">3</span>
                  </div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">Make Connections</h4>
                  <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
                    Meet people organically and build meaningful relationships
                  </p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-amber-100/50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">💍 Recognition Rings</h4>
                <p className="text-amber-900/80 dark:text-amber-100/80 mb-3">
                  To help you identify other MeetCutes members at events, we recommend wearing 
                  one of our below suggested colored rings:
                </p>
                <div className="flex flex-wrap gap-4">
                  <Badge variant="outline" className="border-amber-300 text-amber-800 dark:text-amber-200">
                    💍 Aqua Ring
                  </Badge>
                  <Badge variant="outline" className="border-amber-300 text-amber-800 dark:text-amber-200">
                    💍 Teal Ring
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Who is it For */}
          <Card className="shadow-xl border-0 bg-linear-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-2xl md:text-3xl text-emerald-900 dark:text-emerald-100">
                Who MeetCutes is For
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0"></div>
                    <p className="text-emerald-900/90 dark:text-emerald-100/90">
                      <strong>Working Professionals:</strong> People with 9-5 jobs who have limited time for socializing
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0"></div>
                    <p className="text-emerald-900/90 dark:text-emerald-100/90">
                      <strong>Serious Daters:</strong> Those seeking meaningful relationships and long-term partnerships
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0"></div>
                    <p className="text-emerald-900/90 dark:text-emerald-100/90">
                      <strong>Authentic People:</strong> Individuals who value genuine connections over superficial interactions
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0"></div>
                    <p className="text-emerald-900/90 dark:text-emerald-100/90">
                      <strong>Family-Oriented:</strong> People looking to build families and create lasting bonds
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0"></div>
                    <p className="text-emerald-900/90 dark:text-emerald-100/90">
                      <strong>Hardworking Individuals:</strong> Those who work hard and want to find equally committed partners
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What This is Not */}
          <Card className="shadow-xl border-0 bg-linear-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>
              <CardTitle className="text-2xl md:text-3xl text-rose-900 dark:text-rose-100">
                What MeetCutes is Not
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-rose-100/50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800/30">
                    <h4 className="font-semibold text-rose-900 dark:text-rose-100 mb-2">🚫 Not for Players</h4>
                    <p className="text-sm text-rose-900/80 dark:text-rose-100/80">
                      This platform is not for casual hookups or short-term flings
                    </p>
                  </div>

                  <div className="p-4 bg-rose-100/50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800/30">
                    <h4 className="font-semibold text-rose-900 dark:text-rose-100 mb-2">🚫 Not Speed Dating</h4>
                    <p className="text-sm text-rose-900/80 dark:text-rose-100/80">
                      We don't organize artificial speed dating events
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-rose-100/50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800/30">
                    <h4 className="font-semibold text-rose-900 dark:text-rose-100 mb-2">🚫 Not for Middlemen</h4>
                    <p className="text-sm text-rose-900/80 dark:text-rose-100/80">
                      No dating coaches, event organizers, or third-party hosts
                    </p>
                  </div>

                  <div className="p-4 bg-rose-100/50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800/30">
                    <h4 className="font-semibold text-rose-900 dark:text-rose-100 mb-2">🚫 Not at Bars/Pubs</h4>
                    <p className="text-sm text-rose-900/80 dark:text-rose-100/80">
                      Events are held at appropriate venues like stores, cafes and parks
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
