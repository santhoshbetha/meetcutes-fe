import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UserProfileSkeleton() {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        {/* Header Skeleton */}
        <div className="text-center mb-8 sm:mb-12">
          <Skeleton className="h-8 w-32 mx-auto mb-4" />
          <Skeleton className="h-12 w-80 mx-auto mb-3 sm:mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        {/* Image Carousel Skeleton */}
        <div className="mb-8">
          <div className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl">
            <Skeleton className="w-full h-105 sm:h-120 md:h-135" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Profile Card Skeleton */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-2 border-border bg-card/95 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  {/* Profile Image Skeleton */}
                  <Skeleton className="w-28 h-28 rounded-full" />

                  {/* Name and Location Skeleton */}
                  <div className="space-y-2 text-center w-full">
                    <Skeleton className="h-6 w-32 mx-auto" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </div>

                  {/* Visibility Preference Skeleton */}
                  <div className="pt-4 border-t border-border/50 w-full">
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </div>

                  {/* Quick Stats Skeleton */}
                  <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-border/50 w-full">
                    <div className="text-center space-y-2">
                      <Skeleton className="h-6 w-8 mx-auto" />
                      <Skeleton className="h-3 w-20 mx-auto" />
                    </div>
                    <div className="text-center space-y-2">
                      <Skeleton className="h-6 w-8 mx-auto" />
                      <Skeleton className="h-3 w-20 mx-auto" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Profile Information Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information Card Skeleton */}
            <Card className="shadow-xl border-2 border-border bg-card/95 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email Skeleton */}
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-12 w-full" />
                  </div>

                  {/* Phone Skeleton */}
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Media Card Skeleton */}
            <Card className="shadow-xl border-2 border-border bg-card/95 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Social Media Skeletons */}
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Me Card Skeleton */}
            <Card className="shadow-xl border-2 border-border bg-card/95 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}