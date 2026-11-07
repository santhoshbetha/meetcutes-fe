import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Mail, Phone, Settings, Calendar, Eye, Users, MapPin, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { Spinner } from '@/components/ui/Spinner';
import { getUserProfile } from "@/services/user.service";
import { isObjEmpty } from "@/utils/util";
import { useAuth } from "@/context/AuthContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { UserProfileSkeleton } from "@/components/UserProfileSkeleton";

export function UserProfileX() {
  const { userid } = useParams();
  const navigate = useNavigate();
  const { userSession } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUseCover, setImageUseCover] = useState({});
  const carouselRef = useRef(null);

  console.log('UserProfile render questionairevaluesset::', userData?.questionairevaluesset);
  console.log('UserProfile render questionairevalues::', userData?.questionairevalues);

  // Generate a more detailed dummy avatar based on user data
  const generateDummyAvatar = () => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-green-400 to-green-600',
      'from-pink-400 to-pink-600',
      'from-orange-400 to-orange-600',
      'from-teal-400 to-teal-600',
      'from-indigo-400 to-indigo-600',
      'from-red-400 to-red-600'
    ];

    const patterns = [
      'bg-gradient-to-br',
      'bg-gradient-to-tr',
      'bg-gradient-to-bl',
      'bg-gradient-to-tl'
    ];

    // Use user data to create consistent colors
    const colorIndex = (userData?.firstname?.charCodeAt(0) || 0) % colors.length;
    const patternIndex = (userData?.age || 0) % patterns.length;

    return `${patterns[patternIndex]} ${colors[colorIndex]}`;
  };

  // Filter out null/empty images and ensure we have valid images
  const imageUrls = (userData?.image_urls ?? []).filter(img => img && typeof img === 'string' && img.trim() !== '');
  const validImages = imageUrls.length ? imageUrls : (userData?.images ?? []).filter(img => typeof img === 'string' && img.startsWith('http'));
  const hasImages = validImages.length > 0;

  console.log('UserProfile load::');

  // Check authentication - redirect to home if not logged in
  useEffect(() => {
    // Only redirect after authentication state has been determined
    // userSession being null means auth check is complete and user is not logged in
    if (userSession === null) {
      navigate('/');
      return;
    }
  }, [userSession, navigate]);

  const nextImage = () => {
    if (!validImages.length) return;
    setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = () => {
    if (!validImages.length) return;
    setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  const onImageLoad = (index, e) => {
    try {
      const nw = e.target.naturalWidth || 0;
      const nh = e.target.naturalHeight || 0;
      const rect = carouselRef.current?.getBoundingClientRect();
      const cw = rect?.width || 720;
      const ch = rect?.height || 420;
      // if the natural image is smaller than the container in either dimension,
      // use cover to visually fill the space
      const useCover = nw < cw * window.devicePixelRatio || nh < ch * window.devicePixelRatio;
      setImageUseCover((prev) => ({ ...prev, [index]: useCover }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await getUserProfile(userid);
        if (response.success) {
          setUserData(response.data);
        } else {
          setError(response.msg || 'User not found');
        }
      } catch {
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (userid) {
      fetchUserProfile();
    }
  }, [userid]);

  if (loading) {
    return <UserProfileSkeleton />;
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || 'The user profile you are looking for does not exist or is not accessible.'}</p>
            <Button onClick={() => navigate('/search')} variant="outline">
              Back to Search
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <button
          title="Flag user"
          onClick={() => console.log('Flag user', userData?.userid)}
          className="absolute right-4 top-4 p-2 rounded-md hover:bg-muted/50 transition-colors"
        >
          <Flag className="w-5 h-5 text-destructive" />
        </button>
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Eye className="w-4 h-4" />
            User Profile
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
            {userData?.firstname} {userData?.lastname}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            View profile information and connect
          </p>
        </div>

        {/* Large Instagram-style Carousel (shows above profile/grid) */}
        {hasImages && (
          <div className="mb-8">
            <div className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl">
              <div ref={carouselRef} className="mx-auto w-full max-w-[720px] h-[420px] sm:h-[480px] md:h-[540px] relative bg-linear-to-br from-muted to-muted/50 flex items-center justify-center">
                {/* Carousel Images - show full image (object-contain) so not cropped */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {validImages.map((image, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center ${index === currentImageIndex ? "opacity-100" : "opacity-0"
                        }`}
                    >
                      <img
                        src={image}
                        alt={`${userData?.firstname} - Photo ${index + 1}`}
                        className={`max-w-full max-h-full ${imageUseCover[index] ? 'object-cover' : 'object-contain'}`}
                        onLoad={(e) => onImageLoad(index, e)}
                        onError={(e) => { e.target.src = "/professional-headshot-of-a-young-man-with-brown-ha.jpg"; }}
                      />
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows */}
                {validImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-90 transition-all duration-200 hover:scale-105"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-90 transition-all duration-200 hover:scale-105"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Dot Indicators */}
                {validImages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {validImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToImage(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentImageIndex ? "bg-white w-3" : "bg-white/50 hover:bg-white/75"
                          }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Image Counter */}
                {validImages.length > 1 && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-black/40 text-white text-sm rounded-full">
                    {currentImageIndex + 1} / {validImages.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-2 border-border bg-card/95 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  {/* Profile Image Carousel */}
                  <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-2xl">
                    {validImages[0] ? (
                      <img
                        src={userData?.avatar_url || validImages[0]}
                        alt={`${userData?.firstname} - Profile`}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/professional-headshot-of-a-young-man-with-brown-ha.jpg'; }}
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center relative ${generateDummyAvatar()}`}>
                        {/* Enhanced dummy avatar with more detail */}
                        <div className="text-white text-lg sm:text-2xl font-bold">
                          {userData?.firstname?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white/30 rounded-full"></div>
                        </div>
                        <div className="absolute top-1 right-1 w-2 h-2 sm:w-3 sm:h-3 bg-white/40 rounded-full"></div>
                        <div className="absolute bottom-1 left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/60 rounded-full"></div>
                      </div>
                    )}
                  </div>

                  {/* Name and Location */}
                  <div className="space-y-1 text-center">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">
                      {userData?.firstname} {userData?.lastname}
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      </div>
                      <span className="text-xs font-medium">
                        {userData?.city}, {userData?.state}
                      </span>
                    </div>
                    {!isObjEmpty(userData?.userhandle) && (
                      <p className="text-sm font-semibold text-primary">
                        @{userData.userhandle}
                      </p>
                    )}
                  </div>

                  {/* Visibility Preference */}
                  <div className="pt-4 border-t border-border/50 w-full">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      {userData?.visibilityPreference === 'events-only' && (
                        <>
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Events Only</span>
                        </>
                      )}
                      {userData?.visibilityPreference === 'online-only' && (
                        <>
                          <Users className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Online Only</span>
                        </>
                      )}
                      {userData?.visibilityPreference === 'both' && (
                        <>
                          <Eye className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Visible Everywhere</span>
                        </>
                      )}
                      {(!userData?.visibilityPreference || userData?.visibilityPreference === '') && (
                        <>
                          <Eye className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Visible Everywhere</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-border/50 w-full" hidden>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">12</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Events Attending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">28</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Events Created</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information Card */}
            <Card className="shadow-xl border-2 border-border bg-card/95 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Contact Information</CardTitle>
                    <p className="text-sm text-muted-foreground">Contact details and social profiles</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Email Address
                    </label>
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <p className="text-sm text-foreground font-medium break-all">
                        {userData?.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Primary contact email</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      Phone Number
                    </label>
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <p className="text-sm text-foreground font-medium">
                        {userData?.phonenumber || 'Not provided'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Contact phone number</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Media Card */}
            <Card className="shadow-xl border-2 border-border bg-card/95 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FaFacebook className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Social Media</CardTitle>
                    <p className="text-sm text-muted-foreground">Connect on social platforms</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Facebook */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FaFacebook className="w-4 h-4 text-blue-600" />
                      Facebook
                    </label>
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <p className="text-sm text-foreground font-medium">
                        {userData?.facebook || 'Not connected'}
                      </p>
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FaInstagram className="w-4 h-4 text-pink-600" />
                      Instagram
                    </label>
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <p className="text-sm text-foreground font-medium">
                        {userData?.instagram || 'Not connected'}
                      </p>
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FaLinkedin className="w-4 h-4 text-blue-700" />
                      LinkedIn
                    </label>
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <p className="text-sm text-foreground font-medium">
                        {userData?.linkedin || 'Not connected'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Me Card */}
            {!isObjEmpty(userData?.bio) && (
              <Card className="shadow-xl border-2 border-border bg-card/95 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Edit2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">About Me</CardTitle>
                      <p className="text-sm text-muted-foreground">A bit about this person</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {userData?.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <Card className="shadow-xl border-2 border-primary/30 bg-primary/5" hidden>
              <CardContent className="pt-6">
                <div className="flex justify-center">
                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Questionnaire Values Accordion */}
        {userData?.questionairevaluesset && (
          <div className="mt-8">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="questionnaire" className="border-2 border-border rounded-lg shadow-xl bg-card/95 backdrop-blur-sm">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-foreground">Questionnaire Values</h3>
                      <p className="text-sm text-muted-foreground">View this person's preferences and opinions</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6">
                    {userData?.gender == 'Male' ? (
                      <>
                        {/* Male Questions */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Android</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q1 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">iPhone</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Capitalism</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q2 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Equal Opportunities</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Truck</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q3 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">BMW</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Socialism</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q4 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Pyramid Scheme</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Modern Family</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q5 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Traditional Family</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Suit/Formal dress</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q6 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Jeans and T-shirt</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Partner</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q7 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Title Wife</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Concerts/Clubs</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q8 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Movie at home</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">End goal Happiness</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q9 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">End goal Family/kids</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Credit card</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q10 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Cash/Debit card</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Female Questions */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Android</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q1 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">iPhone</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Trader Joe's</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q2 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">ALDI/WINCO</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Tesla</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q3 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Toyota</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Costco</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q4 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Whole Foods</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Woman Rights</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q5 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Transwoman is woman</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Pro-Choice</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q6 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Pro-Life</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">KOHL'S</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q7 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">NORDSTROM</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Enchanted (film)</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q8 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Barbie (film)</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Power Couple</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q9 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Traditional Relationship</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Concerts/Clubs</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q10 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Movie at home</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Title Husband</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q11 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Partner</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">End goal Happiness</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q12 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">End goal Family/kids</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Credit card</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q13 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Cash/Debit card</div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-medium text-foreground">Dog Mom/Cat Mom</div>
                            <div className="col-span-8">
                              <Slider
                                value={[userData.questionairevalues.q14 || 20]}
                                max={100}
                                step={1}
                                disabled
                                className="pointer-events-none"
                              />
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground text-right">Pet Owner</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
}